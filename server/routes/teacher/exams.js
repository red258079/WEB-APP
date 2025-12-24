const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const roleMiddleware = require('../../middleware/role');
const multer = require('multer');
const fs = require('fs').promises;

// Import services
const socketService = require('../../services/socketService');
const excelService = require('../../services/excelService');
const { createNotification } = require('../shared/helpers');

// ✅ LẤY DANH SÁCH CÂU HỎI TRONG NGÂN HÀNG (PHẢI ĐẶT TRƯỚC CÁC ROUTE /:examId)
router.get('/question-bank', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const teacherId = req.user.id || req.user.user_id;
  const { subject_id, difficulty, question_type, limit = 50, offset = 0, search } = req.query;

  try {
    // Tối ưu: Sử dụng LEFT JOIN thay vì subquery cho option_count
    let query = `
      SELECT 
        qb.question_id,
        qb.question_content,
        qb.question_type,
        qb.difficulty,
        qb.correct_answer_text,
        qb.created_at,
        s.subject_name,
        (SELECT COUNT(*) FROM question_options WHERE question_id = qb.question_id) as option_count
      FROM question_bank qb
      LEFT JOIN subjects s ON qb.subject_id = s.subject_id
      LEFT JOIN question_options qo ON qb.question_id = qo.question_id
      WHERE qb.teacher_id = ?
    `;

    const params = [teacherId];

    // Thêm filters
    if (subject_id && subject_id !== 'all') {
      query += ' AND qb.subject_id = ?';
      params.push(subject_id);
    }
    if (difficulty && difficulty !== 'all') {
      query += ' AND qb.difficulty = ?';
      params.push(difficulty);
    }
    if (question_type && question_type !== 'all') {
      query += ' AND qb.question_type = ?';
      params.push(question_type);
    }
    if (search && search.trim()) {
      query += ' AND qb.question_content LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    query += ' GROUP BY qb.question_id, qb.question_content, qb.question_type, qb.difficulty, qb.correct_answer_text, qb.created_at, s.subject_name';
    query += ' ORDER BY qb.created_at DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [questions] = await req.db.query(query, params);

    // Lấy tổng số câu hỏi (tối ưu: chỉ query 1 lần với điều kiện tương tự)
    let countQuery = 'SELECT COUNT(*) as count FROM question_bank qb WHERE qb.teacher_id = ?';
    const countParams = [teacherId];

    if (subject_id && subject_id !== 'all') {
      countQuery += ' AND qb.subject_id = ?';
      countParams.push(subject_id);
    }
    if (difficulty && difficulty !== 'all') {
      countQuery += ' AND qb.difficulty = ?';
      countParams.push(difficulty);
    }
    if (question_type && question_type !== 'all') {
      countQuery += ' AND qb.question_type = ?';
      countParams.push(question_type);
    }
    if (search && search.trim()) {
      countQuery += ' AND qb.question_content LIKE ?';
      countParams.push(`%${search.trim()}%`);
    }

    const [totalResult] = await req.db.query(countQuery, countParams);
    const total = totalResult.length > 0 ? parseInt(totalResult[0].count) : 0;

    res.json({
      questions,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Error fetching question bank:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách câu hỏi', details: error.message });
  }
});

// ✅ Lấy tất cả bài thi của giáo viên
router.get('/all', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const teacherId = req.user.id || req.user.user_id;

  console.log('=== GET ALL EXAMS ===');
  console.log('teacherId:', teacherId);

  try {
    const query = `
      SELECT 
        e.exam_id, 
        e.exam_name AS title, 
        e.start_time, 
        e.duration, 
        e.description, 
        e.class_id,
        c.class_name,
        COUNT(ea.attempt_id) as submissions,
        -- ⭐ TÍNH TOÁN STATUS ĐỘNG GIỐNG TEACHER/CLASSES
        CASE
          WHEN e.status IN ('deleted', 'draft') THEN e.status
          WHEN NOW() < e.start_time THEN 'upcoming'
          WHEN NOW() >= e.start_time 
               AND NOW() < DATE_ADD(e.start_time, INTERVAL e.duration MINUTE) THEN 'active'
          ELSE 'completed'
        END AS status
      FROM exams e
      LEFT JOIN classes c ON e.class_id = c.class_id
      LEFT JOIN exam_attempts ea ON e.exam_id = ea.exam_id
      WHERE e.teacher_id = ? AND e.status != 'deleted'
      GROUP BY e.exam_id, e.class_id, c.class_name
      ORDER BY e.start_time DESC
    `;

    const [exams] = await req.db.query(query, [teacherId]);

    console.log('✅ All exams found:', exams.length);
    res.json(exams);
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách bài thi', details: err.message });
  }
});

// ✅ API LẤY CHI TIẾT BÀI THI - SỬA ĐÚNG
router.get('/:examId/detail', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { examId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  console.log('=== GET EXAM DETAIL ===');
  console.log('examId:', examId);
  console.log('teacherId:', teacherId);

  try {
    // ✅ QUERY ĐÚNG - KHÔNG DÙNG e.total_points
    const [exam] = await req.db.query(
      `SELECT 
        e.exam_id,
        e.exam_name,
        e.description,
        e.start_time,
        e.duration,
        e.status,
        e.password,
        e.is_dynamic,
        e.shuffle_questions,
        e.shuffle_options,
        e.created_at,
        c.class_id,
        c.class_name,
        s.subject_name,
        COUNT(DISTINCT eq.question_id) as total_questions,
        COALESCE(SUM(eq.points), 0) as total_points,
        COUNT(DISTINCT ea.attempt_id) as total_attempts,
        COUNT(DISTINCT CASE WHEN ea.status = 'Submitted' THEN ea.attempt_id END) as submitted_count,
        AVG(CASE WHEN ea.status = 'Submitted' THEN ea.score END) as average_score,
        CASE
          WHEN e.status IN ('deleted', 'draft') THEN e.status
          WHEN NOW() < e.start_time THEN 'upcoming'
          WHEN NOW() >= e.start_time 
               AND NOW() < DATE_ADD(e.start_time, INTERVAL e.duration MINUTE) THEN 'active'
          ELSE 'completed'
        END AS current_status
      FROM exams e
      LEFT JOIN classes c ON e.class_id = c.class_id
      LEFT JOIN subjects s ON e.subject_id = s.subject_id
      LEFT JOIN exam_questions eq ON e.exam_id = eq.exam_id
      LEFT JOIN exam_attempts ea ON e.exam_id = ea.exam_id
      WHERE e.exam_id = ? AND e.teacher_id = ?
      GROUP BY e.exam_id, e.exam_name, e.description, e.start_time, e.duration, 
               e.status, e.password, e.is_dynamic, e.shuffle_questions, 
               e.shuffle_options, e.created_at, c.class_id, c.class_name, s.subject_name`,
      [examId, teacherId]
    );

    if (!exam.length) {
      console.log('❌ Exam not found or no permission');
      return res.status(403).json({ error: 'Bạn không có quyền truy cập bài thi này' });
    }

    console.log('✅ Exam found:', exam[0].exam_name);

    // Kiểm tra xem có câu hỏi nào trong exam_questions không
    const [checkQuestions] = await req.db.query(
      'SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = ?',
      [examId]
    );
    console.log(`🔍 Total questions in exam_questions table for exam ${examId}: ${checkQuestions[0]?.count || 0}`);

    // Lấy danh sách câu hỏi với options
    const [questions] = await req.db.query(
      `SELECT 
        eq.question_id,
        eq.question_order,
        eq.points,
        qb.question_content,
        qb.question_type,
        qb.difficulty,
        qb.correct_answer_text
       FROM exam_questions eq
       JOIN question_bank qb ON eq.question_id = qb.question_id
       WHERE eq.exam_id = ?
       ORDER BY eq.question_order ASC`,
      [examId]
    );

    console.log(`✅ Found ${questions.length} questions after JOIN with question_bank`);

    // Nếu có câu hỏi trong exam_questions nhưng không có sau JOIN, có thể question_bank bị thiếu
    if (checkQuestions[0]?.count > 0 && questions.length === 0) {
      console.error(`⚠️ WARNING: Found ${checkQuestions[0].count} questions in exam_questions but 0 after JOIN with question_bank`);
      const [orphanedQuestions] = await req.db.query(
        'SELECT question_id FROM exam_questions WHERE exam_id = ? LIMIT 5',
        [examId]
      );
      console.error('⚠️ Sample question_ids in exam_questions:', orphanedQuestions.map(q => q.question_id));
    }

    // Lấy options cho từng câu hỏi (chỉ với trắc nghiệm)
    const questionsWithOptions = await Promise.all(
      questions.map(async (q) => {
        if (q.question_type === 'SingleChoice' || q.question_type === 'MultipleChoice') {
          const [options] = await req.db.query(
            `SELECT 
              option_id,
              option_content,
              is_correct
             FROM question_options
             WHERE question_id = ?
             ORDER BY option_id ASC`,
            [q.question_id]
          );
          return { ...q, options };
        }
        return { ...q, options: [] };
      })
    );

    // Trả về dữ liệu đầy đủ
    const result = {
      ...exam[0],
      questions: questionsWithOptions
    };

    console.log('✅ Response ready with', result.questions.length, 'questions');
    res.json(result);

  } catch (err) {
    console.error('❌ Error getting exam detail:', err);
    res.status(500).json({
      error: 'Lỗi khi lấy chi tiết bài thi',
      details: err.message
    });
  }
});

// ✅ Kiểm tra dữ liệu gian lận trước khi xóa
router.get('/:examId/check-cheating-data', authMiddleware, roleMiddleware(['teacher', 'admin']), async (req, res) => {
  const { examId } = req.params;
  const teacherId = req.user.id || req.user.user_id;
  const role = req.user.role;

  try {
    // Kiểm tra quyền sở hữu (nếu là Teacher)
    if (role === 'teacher' || role === 'Teacher') {
      const [exam] = await req.db.query(
        'SELECT exam_name FROM exams WHERE exam_id = ? AND teacher_id = ?',
        [examId, teacherId]
      );

      if (!exam.length) {
        return res.status(403).json({ error: 'Bạn không có quyền truy cập bài thi này' });
      }
    }

    // Kiểm tra xem có dữ liệu gian lận không
    const [cheatingData] = await req.db.query(
      `SELECT COUNT(*) as count 
       FROM anti_cheating_logs acl
       JOIN exam_attempts ea ON acl.attempt_id = ea.attempt_id
       WHERE ea.exam_id = ?`,
      [examId]
    );

    const hasCheatingData = (cheatingData[0]?.count || 0) > 0;

    res.json({
      has_cheating_data: hasCheatingData,
      count: cheatingData[0]?.count || 0
    });
  } catch (err) {
    console.error('Lỗi kiểm tra dữ liệu gian lận:', err);
    res.status(500).json({ error: 'Lỗi khi kiểm tra dữ liệu gian lận', details: err.message });
  }
});

// ✅ Cập nhật bài thi
router.put('/:examId', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { examId } = req.params;
  const teacherId = req.user.id || req.user.user_id;
  const { examName, examDate, examTime, duration, description, status } = req.body;

  try {
    // Kiểm tra quyền sở hữu
    const [exam] = await req.db.query(
      'SELECT exam_id, class_id FROM exams WHERE exam_id = ? AND teacher_id = ?',
      [examId, teacherId]
    );

    if (!exam.length) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa bài thi này' });
    }

    // Tạo start_time từ examDate và examTime
    let startTime;
    if (examDate && examTime) {
      startTime = `${examDate} ${examTime}:00`;
    } else if (examDate) {
      // Nếu chỉ có ngày, giữ nguyên giờ cũ
      const [oldExam] = await req.db.query(
        'SELECT start_time FROM exams WHERE exam_id = ?',
        [examId]
      );
      if (oldExam.length) {
        const oldTime = new Date(oldExam[0].start_time);
        const hours = String(oldTime.getHours()).padStart(2, '0');
        const minutes = String(oldTime.getMinutes()).padStart(2, '0');
        startTime = `${examDate} ${hours}:${minutes}:00`;
      } else {
        startTime = `${examDate} 00:00:00`;
      }
    }

    // Cập nhật bài thi
    const updateFields = [];
    const updateValues = [];

    if (examName) {
      updateFields.push('exam_name = ?');
      updateValues.push(examName);
    }
    if (startTime) {
      updateFields.push('start_time = ?');
      updateValues.push(startTime);
    }
    if (duration !== undefined && duration !== null) {
      updateFields.push('duration = ?');
      updateValues.push(parseInt(duration));
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description || '');
    }
    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Không có dữ liệu để cập nhật' });
    }

    updateValues.push(examId, teacherId);

    const query = `
      UPDATE exams 
      SET ${updateFields.join(', ')} 
      WHERE exam_id = ? AND teacher_id = ?
    `;

    await req.db.query(query, updateValues);

    // Gửi thông báo
    await createNotification(
      req.db,
      req.io,
      teacherId,
      `Bài thi "${examName || 'đã được cập nhật'}" đã được chỉnh sửa`,
      'Info',
      examId,
      'Exam'
    );

    res.json({
      message: 'Cập nhật bài thi thành công',
      exam_id: examId
    });

  } catch (err) {
    console.error('Lỗi cập nhật bài thi:', err);
    res.status(500).json({ error: 'Lỗi khi cập nhật bài thi', details: err.message });
  }
});

// ✅ Xóa bài thi
router.delete('/:examId', authMiddleware, roleMiddleware(['teacher', 'admin']), async (req, res) => {
  const { examId } = req.params;
  const teacherId = req.user.id || req.user.user_id;
  const role = req.user.role;
  // Nhận xác nhận từ query params (DELETE request không nên có body)
  const confirmDelete = req.query.confirmDelete === 'true' || req.query.confirmDelete === true;

  try {
    // Kiểm tra quyền sở hữu (nếu là Teacher)
    if (role === 'teacher' || role === 'Teacher') {
      const [exam] = await req.db.query(
        'SELECT exam_name FROM exams WHERE exam_id = ? AND teacher_id = ?',
        [examId, teacherId]
      );

      if (!exam.length) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa bài thi này' });
      }
    }

    // Kiểm tra xem có dữ liệu gian lận không
    const [cheatingData] = await req.db.query(
      `SELECT COUNT(*) as count 
       FROM anti_cheating_logs acl
       JOIN exam_attempts ea ON acl.attempt_id = ea.attempt_id
       WHERE ea.exam_id = ?`,
      [examId]
    );

    const hasCheatingData = (cheatingData[0]?.count || 0) > 0;

    // Nếu có dữ liệu gian lận nhưng chưa được xác nhận, trả về lỗi
    if (hasCheatingData && !confirmDelete) {
      return res.status(400).json({
        error: 'Bài thi này có dữ liệu gian lận. Vui lòng xác nhận để tiếp tục xóa.',
        has_cheating_data: true,
        count: cheatingData[0]?.count || 0
      });
    }

    // Lấy danh sách attempt_id trước
    const [attempts] = await req.db.query(
      'SELECT attempt_id FROM exam_attempts WHERE exam_id = ?',
      [examId]
    );

    const attemptIds = attempts.map(a => a.attempt_id);

    if (attemptIds.length > 0) {
      // Xóa các bản ghi liên quan theo thứ tự đúng (xóa child tables trước)
      // 1. Xóa anti_cheating_logs trước (foreign key từ exam_attempts)
      const placeholders = attemptIds.map(() => '?').join(',');
      await req.db.query(
        `DELETE FROM anti_cheating_logs WHERE attempt_id IN (${placeholders})`,
        attemptIds
      );

      // 2. Xóa exam_attempt_answers
      await req.db.query(
        `DELETE FROM exam_attempt_answers WHERE attempt_id IN (${placeholders})`,
        attemptIds
      );
    }

    // 3. Xóa exam_attempts
    await req.db.query('DELETE FROM exam_attempts WHERE exam_id = ?', [examId]);

    // 4. Xóa complaints (foreign key với exams)
    await req.db.query('DELETE FROM complaints WHERE exam_id = ?', [examId]);

    // 5. Xóa exam_questions
    await req.db.query('DELETE FROM exam_questions WHERE exam_id = ?', [examId]);

    // 6. Xóa exam_classes
    await req.db.query('DELETE FROM exam_classes WHERE exam_id = ?', [examId]);

    // 7. Xóa bài thi
    const [result] = await req.db.query('DELETE FROM exams WHERE exam_id = ?', [examId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài thi' });
    }

    // ⭐ GỬI SỰ KIỆN SOCKET ĐỂ CẬP NHẬT UI REAL-TIME
    if (req.io) {
      const [examInfo] = await req.db.query(
        'SELECT class_id FROM exams WHERE exam_id = ?',
        [examId]
      );

      const classId = examInfo.length > 0 ? examInfo[0].class_id : null;
      socketService.emitExamDeleted(req.io, examId, classId, teacherId);
    }

    res.json({
      message: 'Xóa bài thi thành công',
      deleted_cheating_logs: hasCheatingData ? (cheatingData[0]?.count || 0) : 0
    });
  } catch (err) {
    console.error('Lỗi xóa bài thi:', err);
    res.status(500).json({ error: 'Lỗi khi xóa bài thi', details: err.message });
  }
});

// ✅ Giám sát gian lận
router.get('/:examId/monitor/cheating', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { examId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền
    const [exam] = await req.db.query(
      'SELECT exam_name FROM exams WHERE exam_id = ? AND teacher_id = ?',
      [examId, teacherId]
    );

    if (!exam.length) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập bài thi này' });
    }

    const [logs] = await req.db.query(
      `SELECT acl.log_id, acl.attempt_id, acl.event_type, acl.event_description, acl.event_time,
              u.full_name AS student_name, u.user_id AS student_id
       FROM anti_cheating_logs acl
       JOIN exam_attempts ea ON acl.attempt_id = ea.attempt_id
       JOIN users u ON ea.student_id = u.user_id
       WHERE ea.exam_id = ?
       ORDER BY acl.event_time DESC`,
      [examId]
    );

    res.json({ logs });
  } catch (err) {
    console.error('Lỗi lấy log gian lận:', err);
    res.status(500).json({ error: 'Lỗi khi lấy log gian lận', details: err.message });
  }
});

// ✅ Xử phạt học sinh (cấm thi hoặc trừ điểm)
router.post('/:examId/penalize', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { examId } = req.params;
  const { attempt_id, action, points_deducted, reason } = req.body;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền
    const [exam] = await req.db.query(
      'SELECT exam_name FROM exams WHERE exam_id = ? AND teacher_id = ?',
      [examId, teacherId]
    );

    if (!exam.length) {
      return res.status(403).json({ error: 'Bạn không có quyền xử lý bài thi này' });
    }

    const [attempt] = await req.db.query(
      `SELECT ea.student_id, u.full_name
       FROM exam_attempts ea
       JOIN users u ON ea.student_id = u.user_id
       WHERE ea.attempt_id = ? AND ea.exam_id = ?`,
      [attempt_id, examId]
    );

    if (!attempt.length) {
      return res.status(404).json({ error: 'Lượt thi không tồn tại' });
    }

    if (action === 'ban') {
      // Cấm thi
      await req.db.query(
        'UPDATE exam_attempts SET is_banned = 1, status = "AutoSubmitted" WHERE attempt_id = ?',
        [attempt_id]
      );

      await req.db.query(
        'INSERT INTO teacher_actions (teacher_id, exam_id, student_id, action_type, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [teacherId, examId, attempt[0].student_id, 'ban_student', reason || 'Vi phạm quy định thi']
      );

      if (req.io) {
        socketService.emitExamBanned(req.io, attempt[0].student_id, examId, reason);
      }

      await createNotification(
        req.db,
        req.io,
        attempt[0].student_id,
        `Bạn đã bị cấm thi "${exam[0].exam_name}" vì: ${reason || 'Vi phạm quy định thi'}`,
        'Warning',
        examId,
        'Exam'
      );
    } else if (action === 'deduct_points') {
      // Trừ điểm
      if (!points_deducted || points_deducted < 0) {
        return res.status(400).json({ error: 'Số điểm trừ không hợp lệ' });
      }

      await req.db.query(
        'UPDATE exam_attempts SET penalty_points = penalty_points + ?, cheating_detected = 1 WHERE attempt_id = ?',
        [points_deducted, attempt_id]
      );

      await req.db.query(
        'INSERT INTO teacher_actions (teacher_id, exam_id, student_id, action_type, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [teacherId, examId, attempt[0].student_id, 'edit_score', `Trừ ${points_deducted} điểm: ${reason || 'Vi phạm quy định thi'}`]
      );

      if (req.io) {
        socketService.emitPointsDeducted(req.io, attempt[0].student_id, examId, points_deducted, reason);
      }

      await createNotification(
        req.db,
        req.io,
        attempt[0].student_id,
        `Bạn đã bị trừ ${points_deducted} điểm trong bài thi "${exam[0].exam_name}" vì: ${reason || 'Vi phạm quy định thi'}`,
        'Warning',
        examId,
        'Exam'
      );
    }

    // Thông báo cho giáo viên
    await createNotification(
      req.db,
      req.io,
      teacherId,
      `Đã ${action === 'ban' ? 'cấm' : 'trừ điểm'} học sinh ${attempt[0].full_name} trong bài thi "${exam[0].exam_name}"`,
      'Info',
      examId,
      'Exam'
    );

    res.json({ message: `Đã ${action === 'ban' ? 'cấm' : 'trừ điểm'} thành công` });
  } catch (err) {
    console.error('Lỗi xử lý hành vi gian lận:', err);
    res.status(500).json({ error: 'Lỗi khi xử lý', details: err.message });
  }
});
// Cấu hình multer (giới hạn 10MB)
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file Excel (.xlsx, .xls) hoặc CSV'));
    }
  }
});

// ============================================
// 🧠 HÀM TÌM CỘT TỰ ĐỘNG (AI-POWERED) - CẢI THIỆN
// ============================================
function smartDetectColumns(row) {
  const detected = {
    question: null,
    optionA: null,
    optionB: null,
    optionC: null,
    optionD: null,
    optionE: null,
    optionF: null,
    correctAnswer: null,
    questionType: null,
    difficulty: null,
    points: null
  };

  // Lấy tất cả tên cột (keys) và normalize
  const columns = Object.keys(row);
  const normalizedColumns = columns.map(col => ({
    original: col,
    normalized: col.trim().toLowerCase().replace(/[_\s]+/g, ' ').trim()
  }));

  // ⭐ TÌM CỘT "CÂU HỎI" - MỞ RỘNG PATTERNS
  const questionPatterns = [
    /câu hỏi|cau hoi|question|content|nội dung|noi dung|ques|quest|hỏi|hoi|bài|bai|đề|de/i,
    /question_content|question_text|cau_hoi|cauhoi|questioncontent|questiontext/i,
    /^q$|^câu$|^cau$/i
  ];
  detected.question = normalizedColumns.find(col =>
    questionPatterns.some(pattern => pattern.test(col.normalized))
  )?.original;

  // Nếu không tìm thấy, thử tìm cột có nhiều ký tự nhất (thường là câu hỏi)
  if (!detected.question && columns.length > 0) {
    const longestColumn = columns.reduce((a, b) => {
      const aValue = String(row[a] || '').length;
      const bValue = String(row[b] || '').length;
      return aValue > bValue ? a : b;
    });
    // Chỉ dùng nếu cột đó có giá trị dài hơn 20 ký tự
    if (String(row[longestColumn] || '').length > 20) {
      detected.question = longestColumn;
      console.log(`🔍 Auto-detected question column as longest column: ${longestColumn}`);
    }
  }

  // ⭐ TÌM CỘT "ĐÁP ÁN A, B, C, D, E, F" - SỬA LẠI ĐỂ TRÁNH TRÙNG LẶP
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const usedColumns = new Set(); // Track các cột đã được sử dụng để tránh trùng lặp

  optionLetters.forEach(letter => {
    // Pattern phải CHỨA chữ cái cụ thể (A, B, C, D...) - KHÔNG DÙNG PATTERN QUÁ RỘNG
    const patterns = [
      new RegExp(`đáp án ${letter}|dap an ${letter}|option ${letter}|^${letter}$|option_${letter}|DA_${letter}|answer_${letter}`, 'i'),
      new RegExp(`^${letter}\\s*[:\\.]|^${letter}$|^lựa chọn ${letter}|lua chon ${letter}`, 'i'),
      new RegExp(`choice.*${letter}|select.*${letter}`, 'i'),
      new RegExp(`phương án ${letter}|phuong an ${letter}`, 'i')
    ];

    // Tìm cột match pattern VÀ chưa được sử dụng
    const found = normalizedColumns.find(col =>
      !usedColumns.has(col.original) && // Chưa được sử dụng
      patterns.some(pattern => pattern.test(col.normalized))
    );

    if (found) {
      detected[`option${letter}`] = found.original;
      usedColumns.add(found.original); // Đánh dấu đã sử dụng
    } else {
      // Thử tìm theo số thứ tự (1, 2, 3, 4) và map sang A, B, C, D
      const index = optionLetters.indexOf(letter);
      const numberPattern = new RegExp(`^${index + 1}$|^đáp án ${index + 1}|^option ${index + 1}|^${index + 1}\\s*[:\\.]`, 'i');
      const foundByNumber = normalizedColumns.find(col =>
        !usedColumns.has(col.original) && numberPattern.test(col.normalized)
      );
      if (foundByNumber) {
        detected[`option${letter}`] = foundByNumber.original;
        usedColumns.add(foundByNumber.original); // Đánh dấu đã sử dụng
      }
    }
  });

  // ⭐ TÌM CỘT "ĐÁP ÁN ĐÚNG" - MỞ RỘNG PATTERNS
  const correctAnswerPatterns = [
    /đáp án đúng|dap an dung|correct answer|correct|answer|đa đúng|dap dung|da_dung|dung|đúng|dung/i,
    /correct_answer|correctanswer|dapandung|key|answer_key|answerkey|key_answer/i,
    /^đáp án$|^dap an$|^answer$|^key$|^đúng$|^dung$/i,
    /right answer|rightanswer|true answer|trueanswer/i
  ];
  detected.correctAnswer = normalizedColumns.find(col =>
    correctAnswerPatterns.some(pattern => pattern.test(col.normalized))
  )?.original;

  // Nếu không tìm thấy, thử tìm cột có giá trị là A, B, C, D hoặc 1, 2, 3, 4
  if (!detected.correctAnswer && columns.length > 0) {
    for (const col of columns) {
      const value = String(row[col] || '').trim().toUpperCase();
      if (/^[A-F]$|^[1-6]$/.test(value)) {
        detected.correctAnswer = col;
        console.log(`🔍 Auto-detected correct answer column: ${col}`);
        break;
      }
    }
  }

  // ⭐ TÌM CỘT "LOẠI CÂU HỎI" - MỞ RỘNG PATTERNS
  const typePatterns = [
    /loại câu hỏi|loai cau hoi|question type|type|loai|question_type|loaicauhoi|kind|category/i,
    /^type$|^loại$|^loai$|^kind$/i
  ];
  detected.questionType = normalizedColumns.find(col =>
    typePatterns.some(pattern => pattern.test(col.normalized))
  )?.original;

  // ⭐ TÌM CỘT "ĐỘ KHÓ" - MỞ RỘNG PATTERNS
  const difficultyPatterns = [
    /độ khó|do kho|difficulty|level|mức độ|mucdo|dokho|hard|easy|medium/i,
    /^difficulty$|^level$|^độ khó$|^do kho$/i
  ];
  detected.difficulty = normalizedColumns.find(col =>
    difficultyPatterns.some(pattern => pattern.test(col.normalized))
  )?.original;

  // ⭐ TÌM CỘT "ĐIỂM" - MỞ RỘNG PATTERNS
  const pointsPatterns = [
    /điểm|diem|points|point|score|mark|marks|grade/i,
    /^điểm$|^diem$|^points$|^point$|^score$/i
  ];
  detected.points = normalizedColumns.find(col =>
    pointsPatterns.some(pattern => pattern.test(col.normalized))
  )?.original;

  return detected;
}

// ============================================
// 🔍 HÀM LẤY GIÁ TRỊ TỪ DETECTED COLUMNS
// ============================================
function getValueSafely(row, columnName, defaultValue = null) {
  if (!columnName) return defaultValue;
  const value = row[columnName];
  if (value === undefined || value === null || String(value).trim() === '') {
    return defaultValue;
  }
  return String(value).trim();
}

// ✅ API IMPORT ĐỀ THI (POST /api/teacher/exams/:examId/import-questions)
router.post('/:examId/import-questions', authMiddleware, roleMiddleware(['teacher']), upload.single('file'), async (req, res) => {
  const { examId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  console.log('=== IMPORT QUESTIONS ===');
  console.log('examId:', examId);
  console.log('teacherId:', teacherId);
  console.log('File received:', req.file ? { name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'NO FILE');

  if (!req.file) {
    return res.status(400).json({ error: 'Vui lòng tải lên file Excel hoặc CSV' });
  }

  try {
    // 1. Kiểm tra quyền sở hữu exam
    const [exam] = await req.db.query(
      'SELECT exam_name, subject_id, class_id FROM exams WHERE exam_id = ? AND teacher_id = ?',
      [examId, teacherId]
    );

    if (!exam.length) {
      console.log('❌ No permission or exam not found');
      await fs.unlink(req.file.path); // Xóa file upload
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa bài thi này' });
    }

    console.log('✅ Exam found:', exam[0].exam_name, 'Subject ID:', exam[0].subject_id);

    const subjectId = exam[0].subject_id;
    const filePath = req.file.path;
    let questions = [];

    // 2. Parse file Excel/CSV
    questions = await excelService.parseFile(filePath, req.file.mimetype);

    // 3. Xóa file upload
    await fs.unlink(filePath);

    console.log(`📊 Parsed ${questions.length} rows from file`);

    if (!questions.length) {
      return res.status(400).json({ error: 'File không có dữ liệu câu hỏi' });
    }

    // 4. ⭐ TỰ ĐỘNG PHÁT HIỆN FORMAT CỘT
    let detectedColumns = null;
    const errors = [];
    const insertedQuestions = [];
    let questionOrder = 1;

    // Phát hiện format từ dòng đầu tiên
    if (questions.length > 0) {
      detectedColumns = smartDetectColumns(questions[0]);

      console.log('🔍 Auto-detected columns:', {
        question: detectedColumns.question,
        optionA: detectedColumns.optionA,
        optionB: detectedColumns.optionB,
        optionC: detectedColumns.optionC,
        optionD: detectedColumns.optionD,
        correctAnswer: detectedColumns.correctAnswer,
        questionType: detectedColumns.questionType,
        difficulty: detectedColumns.difficulty,
        points: detectedColumns.points
      });

      // Kiểm tra cột bắt buộc
      if (!detectedColumns.question) {
        return res.status(400).json({
          error: 'Không tìm thấy cột "Câu hỏi". Vui lòng đặt tên cột là: "Câu hỏi", "Question", hoặc "Content"'
        });
      }

      if (!detectedColumns.correctAnswer) {
        return res.status(400).json({
          error: 'Không tìm thấy cột "Đáp án đúng". Vui lòng đặt tên cột là: "Đáp án đúng", "Correct Answer", hoặc "Answer"'
        });
      }
    }

    // 5. XỬ LÝ TỪNG CÂU HỎI
    console.log(`🔄 Starting to process ${questions.length} questions...`);
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [index, q] of questions.entries()) {
      try {
        processedCount++;
        // ⭐ LẤY GIÁ TRỊ TỪ CỘT ĐÃ PHÁT HIỆN
        const question_content = getValueSafely(q, detectedColumns.question);
        const question_type = getValueSafely(q, detectedColumns.questionType, 'SingleChoice');
        const difficulty = getValueSafely(q, detectedColumns.difficulty, 'Medium');
        const correct_answer = getValueSafely(q, detectedColumns.correctAnswer);
        const points = parseFloat(getValueSafely(q, detectedColumns.points, '1'));

        // ⭐ LẤY OPTIONS TỪ CÁC CỘT ĐÃ PHÁT HIỆN - ĐẢM BẢO KHÔNG TRÙNG LẶP
        const options = [];
        const usedOptionColumns = new Set(); // Track các cột đã dùng để tránh trùng

        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(letter => {
          const columnName = detectedColumns[`option${letter}`];
          if (columnName && !usedOptionColumns.has(columnName)) {
            const optValue = getValueSafely(q, columnName);
            if (optValue && optValue.trim() !== '') {
              options.push(optValue);
              usedOptionColumns.add(columnName);
              console.log(`   ✅ Option ${letter}: "${optValue.substring(0, 30)}..." from column "${columnName}"`);
            } else {
              console.log(`   ⚠️ Option ${letter}: Empty value from column "${columnName}"`);
            }
          } else if (columnName && usedOptionColumns.has(columnName)) {
            console.log(`   ❌ Option ${letter}: Column "${columnName}" already used, skipping to avoid duplicate`);
          }
        });

        console.log(`   📊 Total options collected: ${options.length}`);

        // ⭐ DEBUG LOG
        console.log(`📝 Row ${index + 2}:`, {
          question: question_content?.substring(0, 40),
          type: question_type,
          optionsCount: options.length,
          correctAnswer: correct_answer
        });

        // Validate
        if (!question_content) {
          skippedCount++;
          errors.push(`Dòng ${index + 2}: Thiếu nội dung câu hỏi`);
          console.log(`⚠️ Row ${index + 2}: Skipped - Missing question content`);
          continue;
        }

        if (!['SingleChoice', 'MultipleChoice', 'FillInBlank', 'Essay'].includes(question_type)) {
          skippedCount++;
          errors.push(`Dòng ${index + 2}: Loại câu hỏi không hợp lệ (phải là: SingleChoice, MultipleChoice, FillInBlank, Essay)`);
          console.log(`⚠️ Row ${index + 2}: Skipped - Invalid question type: ${question_type}`);
          continue;
        }

        // ⭐ CHUẨN HÓA ĐỘ KHÓ - HỖ TRỢ TIẾNG VIỆT
        let normalizedDifficulty = difficulty;
        const difficultyMapping = {
          'Dễ': 'Easy',
          'De': 'Easy',
          'dễ': 'Easy',
          'de': 'Easy',
          'DỄ': 'Easy',
          'Trung bình': 'Medium',
          'Trung binh': 'Medium',
          'trung bình': 'Medium',
          'trung binh': 'Medium',
          'TRUNG BÌNH': 'Medium',
          'TB': 'Medium',
          'Khó': 'Hard',
          'Kho': 'Hard',
          'khó': 'Hard',
          'kho': 'Hard',
          'KHÓ': 'Hard',
          'Nhiều': 'Hard', // Một số file có thể dùng "Nhiều"
          'Ít': 'Easy'     // Một số file có thể dùng "Ít"
        };

        if (difficultyMapping[difficulty]) {
          normalizedDifficulty = difficultyMapping[difficulty];
          console.log(`   📝 Mapped difficulty from "${difficulty}" to "${normalizedDifficulty}"`);
        }

        if (!['Easy', 'Medium', 'Hard'].includes(normalizedDifficulty)) {
          skippedCount++;
          errors.push(`Dòng ${index + 2}: Độ khó không hợp lệ (phải là: Easy/Dễ, Medium/Trung bình, Hard/Khó)`);
          console.log(`⚠️ Row ${index + 2}: Skipped - Invalid difficulty: ${difficulty}`);
          continue;
        }

        if (!correct_answer) {
          skippedCount++;
          errors.push(`Dòng ${index + 2}: Thiếu đáp án đúng`);
          console.log(`⚠️ Row ${index + 2}: Skipped - Missing correct answer`);
          continue;
        }

        // ⭐ KIỂM TRA TRẮC NGHIỆM PHẢI CÓ ÍT NHẤT 2 ĐÁP ÁN
        if ((question_type === 'SingleChoice' || question_type === 'MultipleChoice') && options.length < 2) {
          skippedCount++;
          errors.push(`Dòng ${index + 2}: Câu hỏi trắc nghiệm phải có ít nhất 2 đáp án (hiện chỉ có ${options.length})`);
          console.log(`⚠️ Row ${index + 2}: Skipped - Only ${options.length} options`);
          continue;
        }

        // 6. Insert vào question_bank
        const [questionResult] = await req.db.query(
          `INSERT INTO question_bank (subject_id, teacher_id, question_content, question_type, difficulty, correct_answer_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [subjectId, teacherId, question_content, question_type, normalizedDifficulty, correct_answer]
        );

        const questionId = questionResult.insertId;

        // 7. ⭐ INSERT OPTIONS (NẾU CÓ)
        if ((question_type === 'SingleChoice' || question_type === 'MultipleChoice') && options.length > 0) {
          const optionValues = options.map((content, idx) => {
            let isCorrect = false;
            const correctAnswerUpper = correct_answer.toUpperCase();

            if (question_type === 'SingleChoice') {
              const optionLetter = String.fromCharCode(65 + idx);
              isCorrect = (correctAnswerUpper === optionLetter);

              if (!isCorrect) {
                const correctNumber = parseInt(correctAnswerUpper);
                isCorrect = (correctNumber === idx + 1);
              }
            } else {
              const correctAnswers = correctAnswerUpper.split(',').map(a => a.trim());
              const optionLetter = String.fromCharCode(65 + idx);
              const optionNumber = String(idx + 1);
              isCorrect = correctAnswers.includes(optionLetter) || correctAnswers.includes(optionNumber);
            }

            return [questionId, content, isCorrect ? 1 : 0];
          });

          await req.db.query(
            'INSERT INTO question_options (question_id, option_content, is_correct) VALUES ?',
            [optionValues]
          );

          console.log(`✅ Inserted ${optionValues.length} options for question ${questionId}`);
        }

        // 8. Link câu hỏi với exam
        console.log(`🔗 Linking question ${questionId} to exam ${examId} with order ${questionOrder} and points ${points}`);
        await req.db.query(
          'INSERT INTO exam_questions (exam_id, question_id, question_order, points) VALUES (?, ?, ?, ?)',
          [examId, questionId, questionOrder++, points]
        );
        console.log(`✅ Successfully linked question ${questionId} to exam ${examId}`);

        insertedQuestions.push({
          question_id: questionId,
          question_content: question_content.substring(0, 50) + '...'
        });

      } catch (err) {
        errorCount++;
        console.error(`❌ Error at row ${index + 2}:`, err);
        errors.push(`Dòng ${index + 2}: ${err.message}`);
      }
    }

    console.log(`📊 Processing summary: Total=${processedCount}, Inserted=${insertedQuestions.length}, Skipped=${skippedCount}, Errors=${errorCount}`);
    // 8. Tạo thông báo
    if (insertedQuestions.length > 0) {
      await createNotification(
        req.db,
        req.io,
        teacherId,
        `Đã nhập ${insertedQuestions.length} câu hỏi vào bài thi "${exam[0].exam_name}"`,
        'Info',
        examId,
        'Exam'
      );
    }

    // 9. Kiểm tra lại số câu hỏi đã được link vào exam
    const [verifyCount] = await req.db.query(
      'SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = ?',
      [examId]
    );
    console.log(`✅ Verification: Total questions linked to exam ${examId}: ${verifyCount[0]?.count || 0}`);
    console.log(`✅ Imported questions count: ${insertedQuestions.length}`);

    // 9. Response
    res.json({
      success: true,
      message: `Nhập thành công ${insertedQuestions.length}/${questions.length} câu hỏi`,
      imported: insertedQuestions.length,
      total: questions.length,
      verified: verifyCount[0]?.count || 0,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('❌ Error importing questions:', err);

    // Xóa file nếu có lỗi
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkErr) {
        console.error('Error deleting file:', unlinkErr);
      }
    }

    res.status(500).json({
      error: 'Lỗi khi import câu hỏi',
      details: err.message
    });
  }
});

// ✅ API XEM CÂU HỎI TRONG ĐỀ THI (GET /api/teacher/exams/:examId/questions)
router.get('/:examId/questions', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { examId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền
    const [exam] = await req.db.query(
      'SELECT exam_name FROM exams WHERE exam_id = ? AND teacher_id = ?',
      [examId, teacherId]
    );

    if (!exam.length) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập bài thi này' });
    }

    // Lấy danh sách câu hỏi
    const [questions] = await req.db.query(
      `SELECT 
        eq.question_id,
        eq.question_order,
        eq.points,
        qb.question_content,
        qb.question_type,
        qb.difficulty,
        qb.correct_answer_text
      FROM exam_questions eq
      JOIN question_bank qb ON eq.question_id = qb.question_id
      WHERE eq.exam_id = ?
      ORDER BY eq.question_order ASC`,
      [examId]
    );

    // ⭐ LẤY OPTIONS CHO TỪNG CÂU HỎI (RIÊNG BIỆT)
    const formattedQuestions = await Promise.all(
      questions.map(async (q) => {
        const [options] = await req.db.query(
          `SELECT 
            option_id,
            option_content,
            is_correct
          FROM question_options
          WHERE question_id = ?
          ORDER BY option_id ASC`,
          [q.question_id]
        );

        return {
          ...q,
          options: options || []
        };
      })
    );

    res.json({
      exam_name: exam[0].exam_name,
      total_questions: formattedQuestions.length,
      questions: formattedQuestions
    });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách câu hỏi', details: err.message });
  }
});

// ✅ API XÓA CÂU HỎI KHỎI ĐỀ THI (DELETE /api/teacher/exams/:examId/questions/:questionId)
router.delete('/:examId/questions/:questionId', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { examId, questionId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền
    const [exam] = await req.db.query(
      'SELECT exam_name FROM exams WHERE exam_id = ? AND teacher_id = ?',
      [examId, teacherId]
    );

    if (!exam.length) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa bài thi này' });
    }

    // Xóa khỏi exam_questions (không xóa khỏi question_bank)
    const [result] = await req.db.query(
      'DELETE FROM exam_questions WHERE exam_id = ? AND question_id = ?',
      [examId, questionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy câu hỏi trong bài thi này' });
    }

    res.json({ message: 'Xóa câu hỏi thành công' });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Lỗi khi xóa câu hỏi', details: err.message });
  }
});

// ============================================
// 📊 API LẤY ĐIỂM TỪNG BÀI THI CỦA HỌC SINH
// Thêm vào routes/teacher/exams.js
// ============================================

// GET /api/teacher/exams/:examId/grades
router.get('/:examId/grades', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { examId } = req.params;
  const { student_id } = req.query; // Optional: lấy điểm của 1 học sinh cụ thể
  const teacherId = req.user.id || req.user.user_id;

  try {
    console.log('🔍 Get grades for exam:', examId, 'student:', student_id);

    // Kiểm tra giáo viên có quyền truy cập bài thi không
    const [exam] = await req.db.query(
      `SELECT e.exam_id 
       FROM exams e
       WHERE e.exam_id = ? AND e.teacher_id = ?`,
      [examId, teacherId]
    );

    if (!exam.length) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập bài thi này' });
    }

    // Nếu có student_id, lấy điểm của 1 học sinh
    if (student_id) {
      const [attempts] = await req.db.query(
        `SELECT 
          ea.attempt_id,
          ea.score,
          ea.start_time,
          ea.end_time,
          ea.status
         FROM exam_attempts ea
         WHERE ea.exam_id = ? AND ea.student_id = ?
         ORDER BY ea.start_time DESC
         LIMIT 1`,
        [examId, student_id]
      );

      if (attempts.length === 0) {
        return res.json({ score: null, status: 'not_taken' });
      }

      return res.json({
        score: attempts[0].score,
        status: attempts[0].status,
        start_time: attempts[0].start_time,
        end_time: attempts[0].end_time
      });
    }

    // Nếu không có student_id, lấy điểm của tất cả học sinh
    const [grades] = await req.db.query(
      `SELECT 
        u.user_id,
        u.full_name,
        ea.score,
        ea.start_time,
        ea.end_time,
        ea.status
       FROM exam_attempts ea
       JOIN users u ON ea.student_id = u.user_id
       WHERE ea.exam_id = ?
       ORDER BY u.full_name ASC`,
      [examId]
    );

    console.log('✅ Found grades:', grades.length);
    res.json(grades);

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Lỗi khi lấy điểm', details: err.message });
  }
});

// ============================================
// 📝 API QUẢN LÝ NGÂN HÀNG CÂU HỎI
// ============================================
router.post('/question-bank', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const teacherId = req.user.id || req.user.user_id;

  console.log('🔵 [QB POST] Received body:', req.body);

  const {
    question_content,
    question_text,
    question_type,
    options,
    correct_answer_text,
    correct_answer,
    subject_id,
    subject,
    difficulty
  } = req.body;

  // ✅ Normalize tên field (hỗ trợ cả 2 kiểu)
  const finalQuestionContent = question_content || question_text;
  const finalCorrectAnswer = correct_answer_text || correct_answer;
  const finalSubjectId = subject_id || subject;
  const finalDifficulty = difficulty || 'Medium';

  console.log('🔍 [QB POST] Parsed:', {
    finalQuestionContent,
    question_type,
    finalCorrectAnswer,
    finalDifficulty
  });

  // ✅ VALIDATE CƠ BẢN
  if (!finalQuestionContent || !question_type) {
    console.error('❌ [QB POST] Missing basic fields');
    return res.status(400).json({
      error: 'Thiếu thông tin bắt buộc: nội dung câu hỏi và loại câu hỏi',
      received: {
        has_content: !!finalQuestionContent,
        has_type: !!question_type
      }
    });
  }

  // ✅ VALIDATE LOẠI CÂU HỎI
  const validTypes = ['SingleChoice', 'MultipleChoice', 'FillInBlank', 'Essay'];
  if (!validTypes.includes(question_type)) {
    console.error('❌ [QB POST] Invalid question type:', question_type);
    return res.status(400).json({
      error: `Loại câu hỏi không hợp lệ. Phải là: ${validTypes.join(', ')}`,
      received: question_type
    });
  }

  // ✅ VALIDATE ĐỘ KHÓ
  const validDifficulties = ['Easy', 'Medium', 'Hard'];
  if (!validDifficulties.includes(finalDifficulty)) {
    console.error('❌ [QB POST] Invalid difficulty:', finalDifficulty);
    return res.status(400).json({
      error: `Độ khó không hợp lệ. Phải là: ${validDifficulties.join(', ')}`,
      received: finalDifficulty
    });
  }

  // ✅ VALIDATE ĐÁP ÁN (chỉ bắt buộc với trắc nghiệm)
  if (question_type === 'SingleChoice' || question_type === 'MultipleChoice') {
    if (!finalCorrectAnswer) {
      console.error('❌ [QB POST] Choice question needs correct answer');
      return res.status(400).json({
        error: 'Câu hỏi trắc nghiệm phải có đáp án đúng'
      });
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      console.error('❌ [QB POST] Choice question needs at least 2 options');
      return res.status(400).json({
        error: 'Câu hỏi trắc nghiệm phải có ít nhất 2 đáp án',
        received: { optionsCount: options?.length }
      });
    }
  }

  try {
    // ✅ INSERT VÀO QUESTION_BANK
    console.log('🔵 [QB POST] Inserting question...');

    const [questionResult] = await req.db.query(
      `INSERT INTO question_bank 
       (teacher_id, subject_id, question_content, question_type, difficulty, correct_answer_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        teacherId,
        finalSubjectId || null,
        finalQuestionContent,
        question_type,
        finalDifficulty,
        finalCorrectAnswer || 'Tự luận - Giáo viên chấm thủ công'
      ]
    );

    const questionId = questionResult.insertId;
    console.log('✅ [QB POST] Question created with ID:', questionId);

    // ✅ INSERT OPTIONS (nếu là trắc nghiệm)
    if ((question_type === 'SingleChoice' || question_type === 'MultipleChoice') && options && options.length > 0) {
      console.log('🔵 [QB POST] Inserting', options.length, 'options...');

      const optionValues = options.map((opt, index) => {
        const optionText = typeof opt === 'string' ? opt : (opt.content || opt.text || opt.option_content);
        let isCorrect = false;

        if (typeof opt === 'object' && opt.is_correct !== undefined) {
          isCorrect = opt.is_correct;
        } else {
          const correctAnswerUpper = String(finalCorrectAnswer).toUpperCase();
          const optionLetter = String.fromCharCode(65 + index);
          const optionNumber = String(index + 1);

          if (question_type === 'SingleChoice') {
            isCorrect = (correctAnswerUpper === optionLetter || correctAnswerUpper === optionNumber);
          } else {
            const correctAnswers = correctAnswerUpper.split(',').map(a => a.trim());
            isCorrect = correctAnswers.includes(optionLetter) || correctAnswers.includes(optionNumber);
          }
        }

        return [questionId, optionText, isCorrect ? 1 : 0];
      });

      await req.db.query(
        'INSERT INTO question_options (question_id, option_content, is_correct) VALUES ?',
        [optionValues]
      );

      console.log(`✅ [QB POST] Inserted ${optionValues.length} options`);
    }

    // ✅ TẠO THÔNG BÁO
    await createNotification(
      req.db,
      req.io,
      teacherId,
      `Đã thêm câu hỏi mới: "${finalQuestionContent.substring(0, 50)}..."`,
      'Info',
      questionId,
      'Question'
    );

    console.log('✅ [QB POST] Complete!');

    res.status(201).json({
      success: true,
      message: 'Thêm câu hỏi thành công',
      question_id: questionId
    });

  } catch (error) {
    console.error('❌ [QB POST] Database error:', error);
    res.status(500).json({
      error: 'Lỗi server khi thêm câu hỏi',
      details: error.message
    });
  }
});


// ============================================
// 🗑️ XÓA CÁC CÂU HỎI TRÙNG NHAU TRONG NGÂN HÀNG CÂU HỎI
// DELETE /api/teacher/exams/question-bank/duplicates
// PHẢI ĐẶT TRƯỚC route /question-bank/:questionId để tránh conflict
// ============================================
router.delete('/question-bank/duplicates', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Lấy tất cả câu hỏi của giáo viên
    const [allQuestions] = await req.db.query(
      `SELECT question_id, question_content, created_at
       FROM question_bank
       WHERE teacher_id = ?
       ORDER BY created_at ASC, question_id ASC`,
      [teacherId]
    );

    if (allQuestions.length === 0) {
      return res.json({
        message: 'Không có câu hỏi nào',
        deleted_count: 0,
        duplicates_found: 0
      });
    }

    // Nhóm các câu hỏi trùng nhau (dựa trên nội dung đã trim và normalize)
    const questionGroups = new Map();

    for (const question of allQuestions) {
      // Normalize nội dung: trim, loại bỏ khoảng trắng thừa, chuyển về lowercase để so sánh
      const normalizedContent = question.question_content
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

      if (!questionGroups.has(normalizedContent)) {
        questionGroups.set(normalizedContent, []);
      }
      questionGroups.get(normalizedContent).push({
        question_id: question.question_id,
        question_content: question.question_content,
        created_at: question.created_at
      });
    }

    // Tìm các nhóm có nhiều hơn 1 câu hỏi (trùng nhau)
    const duplicateGroups = [];
    for (const [content, questions] of questionGroups.entries()) {
      if (questions.length > 1) {
        duplicateGroups.push({
          content: content,
          questions: questions
        });
      }
    }

    if (duplicateGroups.length === 0) {
      return res.json({
        message: 'Không có câu hỏi trùng nhau',
        deleted_count: 0,
        duplicates_found: 0
      });
    }

    // Xác định câu hỏi cần xóa (giữ lại câu hỏi đầu tiên trong mỗi nhóm)
    const duplicateIds = [];
    const details = [];

    for (const group of duplicateGroups) {
      // Sắp xếp theo thời gian tạo (câu hỏi cũ nhất được giữ lại)
      const sortedQuestions = group.questions.sort((a, b) =>
        new Date(a.created_at) - new Date(b.created_at)
      );

      const keepId = sortedQuestions[0].question_id;
      const toDelete = sortedQuestions.slice(1);

      for (const item of toDelete) {
        duplicateIds.push(item.question_id);
        details.push({
          question_id: item.question_id,
          question_content: item.question_content.substring(0, 100) + (item.question_content.length > 100 ? '...' : ''),
          kept_id: keepId,
          group_size: group.questions.length
        });
      }
    }

    if (duplicateIds.length === 0) {
      return res.json({
        message: 'Không có câu hỏi trùng nhau cần xóa',
        deleted_count: 0,
        duplicates_found: duplicateGroups.length
      });
    }

    // Xóa các câu hỏi trùng nhau
    let deletedCount = 0;
    const errors = [];

    for (const questionId of duplicateIds) {
      try {
        // Xóa options trước
        await req.db.query('DELETE FROM question_options WHERE question_id = ?', [questionId]);

        // Xóa khỏi exam_questions (nếu đang được sử dụng)
        await req.db.query('DELETE FROM exam_questions WHERE question_id = ?', [questionId]);

        // Xóa câu hỏi
        await req.db.query('DELETE FROM question_bank WHERE question_id = ?', [questionId]);

        deletedCount++;
      } catch (error) {
        console.error(`❌ Error deleting question ${questionId}:`, error);
        errors.push(`Lỗi khi xóa câu hỏi ID ${questionId}: ${error.message}`);
      }
    }

    res.json({
      message: `Đã xóa ${deletedCount} câu hỏi trùng nhau`,
      deleted_count: deletedCount,
      duplicates_found: duplicateGroups.length,
      total_duplicates: duplicateIds.length,
      details: details.slice(0, 20), // Chỉ trả về 20 câu đầu để không quá dài
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error removing duplicate questions:', error);
    res.status(500).json({ error: 'Lỗi khi xóa câu hỏi trùng nhau', details: error.message });
  }
});

// ✅ XÓA CÂU HỎI KHỎI NGÂN HÀNG (DELETE /api/teacher/exams/question-bank/:questionId)
// PHẢI ĐẶT SAU route /question-bank/duplicates
router.delete('/question-bank/:questionId', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { questionId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền sở hữu
    const [question] = await req.db.query(
      'SELECT question_content FROM question_bank WHERE question_id = ? AND teacher_id = ?',
      [questionId, teacherId]
    );

    if (!question.length) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa câu hỏi này' });
    }

    // Xóa options trước
    await req.db.query('DELETE FROM question_options WHERE question_id = ?', [questionId]);

    // Xóa khỏi exam_questions (nếu đang được sử dụng)
    await req.db.query('DELETE FROM exam_questions WHERE question_id = ?', [questionId]);

    // Xóa câu hỏi
    await req.db.query('DELETE FROM question_bank WHERE question_id = ?', [questionId]);

    res.json({ message: 'Xóa câu hỏi thành công' });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa câu hỏi', details: error.message });
  }
});

// ============================================
// 🔗 LINK CÂU HỎI VÀO BÀI THI
// POST /api/teacher/exams/:examId/questions/:questionId
// ============================================
router.post('/:examId/questions/:questionId', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { examId, questionId } = req.params;
  const { points } = req.body;
  const teacherId = req.user.id || req.user.user_id;

  console.log('🔵 [Link] Linking question', questionId, 'to exam', examId);

  try {
    // 1. Kiểm tra quyền sở hữu exam
    const [exam] = await req.db.query(
      'SELECT exam_id FROM exams WHERE exam_id = ? AND teacher_id = ?',
      [examId, teacherId]
    );

    if (!exam.length) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa bài thi này' });
    }

    // 2. Kiểm tra câu hỏi có tồn tại
    const [question] = await req.db.query(
      'SELECT question_id FROM question_bank WHERE question_id = ?',
      [questionId]
    );

    if (!question.length) {
      return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
    }

    // 3. Kiểm tra đã link chưa
    const [existing] = await req.db.query(
      'SELECT * FROM exam_questions WHERE exam_id = ? AND question_id = ?',
      [examId, questionId]
    );

    if (existing.length > 0) {
      console.log('⚠️ [Link] Already linked');
      return res.json({ message: 'Câu hỏi đã được thêm vào bài thi', existing: true });
    }

    // 4. Lấy số thứ tự câu hỏi tiếp theo
    const [maxOrder] = await req.db.query(
      'SELECT COALESCE(MAX(question_order), 0) as max_order FROM exam_questions WHERE exam_id = ?',
      [examId]
    );

    const nextOrder = (maxOrder[0]?.max_order || 0) + 1;

    // 5. Link câu hỏi với exam
    await req.db.query(
      'INSERT INTO exam_questions (exam_id, question_id, question_order, points) VALUES (?, ?, ?, ?)',
      [examId, questionId, nextOrder, points || 1]
    );

    console.log('✅ [Link] Question linked successfully');

    res.json({
      message: 'Đã thêm câu hỏi vào bài thi',
      question_id: questionId,
      exam_id: examId,
      question_order: nextOrder
    });

  } catch (error) {
    console.error('❌ [Link] Error:', error);
    res.status(500).json({ error: 'Lỗi khi thêm câu hỏi vào bài thi', details: error.message });
  }
});

// ============================================
// 📥 COPY CÂU HỎI TỪ BÀI THI NÀY SANG BÀI THI KHÁC
// POST /api/teacher/exams/:targetExamId/copy-questions/:sourceExamId
// ============================================
router.post('/:targetExamId/copy-questions/:sourceExamId', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { targetExamId, sourceExamId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  console.log('🔵 [Copy Questions] Copying from exam', sourceExamId, 'to exam', targetExamId);

  try {
    // 1. Kiểm tra quyền sở hữu cả hai bài thi
    const [targetExam] = await req.db.query(
      'SELECT exam_id, exam_name FROM exams WHERE exam_id = ? AND teacher_id = ?',
      [targetExamId, teacherId]
    );

    if (!targetExam.length) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa bài thi đích' });
    }

    const [sourceExam] = await req.db.query(
      'SELECT exam_id, exam_name FROM exams WHERE exam_id = ? AND teacher_id = ?',
      [sourceExamId, teacherId]
    );

    if (!sourceExam.length) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập bài thi nguồn' });
    }

    // 2. Lấy tất cả câu hỏi từ bài thi nguồn
    const [sourceQuestions] = await req.db.query(
      `SELECT 
        question_id,
        points,
        question_order
      FROM exam_questions
      WHERE exam_id = ?
      ORDER BY question_order ASC`,
      [sourceExamId]
    );

    if (!sourceQuestions.length) {
      return res.status(400).json({ error: 'Bài thi nguồn không có câu hỏi nào' });
    }

    // 3. Lấy số thứ tự câu hỏi tiếp theo trong bài thi đích
    const [maxOrder] = await req.db.query(
      'SELECT COALESCE(MAX(question_order), 0) as max_order FROM exam_questions WHERE exam_id = ?',
      [targetExamId]
    );

    let nextOrder = (maxOrder[0]?.max_order || 0) + 1;
    let copiedCount = 0;

    // 4. Copy từng câu hỏi vào bài thi đích
    for (const sourceQ of sourceQuestions) {
      // Kiểm tra xem câu hỏi đã tồn tại trong bài thi đích chưa
      const [existing] = await req.db.query(
        'SELECT * FROM exam_questions WHERE exam_id = ? AND question_id = ?',
        [targetExamId, sourceQ.question_id]
      );

      if (existing.length === 0) {
        // Chỉ copy nếu chưa tồn tại
        await req.db.query(
          `INSERT INTO exam_questions (exam_id, question_id, points, question_order)
           VALUES (?, ?, ?, ?)`,
          [targetExamId, sourceQ.question_id, sourceQ.points, nextOrder]
        );
        copiedCount++;
        nextOrder++;
      }
    }

    // 5. Tạo thông báo
    await createNotification(
      req.db,
      req.io,
      teacherId,
      `Đã copy ${copiedCount} câu hỏi từ "${sourceExam[0].exam_name}" vào "${targetExam[0].exam_name}"`,
      'Info',
      targetExamId,
      'Exam'
    );

    res.json({
      success: true,
      message: `Đã copy ${copiedCount}/${sourceQuestions.length} câu hỏi vào bài thi mới`,
      copied: copiedCount,
      total: sourceQuestions.length
    });

  } catch (error) {
    console.error('❌ [Copy Questions] Error:', error);
    res.status(500).json({ error: 'Lỗi khi copy câu hỏi', details: error.message });
  }
});

module.exports = router;