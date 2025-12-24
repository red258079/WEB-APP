const { createNotification } = require('../routes/shared/helpers');

exports.createComplaint = async (req, res) => {
  const { examId, content } = req.body;
  const studentId = req.user.id || req.user.user_id;

  // Validate
  if (!examId || !content) {
    return res.status(400).json({ error: 'Thiếu thông tin: examId và content là bắt buộc' });
  }

  try {
    const [exam] = await req.db.query('SELECT teacher_id, exam_name, class_id FROM exams WHERE exam_id = ?', [examId]);
    if (!exam[0]) {
      return res.status(404).json({ error: 'Bài thi không tồn tại' });
    }

    // Kiểm tra xem học sinh đã làm bài thi này chưa
    const [attempts] = await req.db.query(
      'SELECT attempt_id, score FROM exam_attempts WHERE exam_id = ? AND student_id = ? AND status = "Submitted" ORDER BY start_time DESC LIMIT 1',
      [examId, studentId]
    );

    if (attempts.length === 0) {
      return res.status(400).json({ error: 'Bạn chưa làm bài thi này hoặc bài thi chưa được nộp' });
    }

    // Kiểm tra xem đã có khiếu nại chưa được xử lý cho bài thi này chưa
    const [existingComplaint] = await req.db.query(
      'SELECT complaint_id FROM complaints WHERE student_id = ? AND exam_id = ? AND status = "Pending"',
      [studentId, examId]
    );

    if (existingComplaint.length > 0) {
      return res.status(400).json({ error: 'Bạn đã có khiếu nại đang chờ xử lý cho bài thi này' });
    }

    const [result] = await req.db.query(
      'INSERT INTO complaints (student_id, exam_id, content, status) VALUES (?, ?, ?, ?)',
      [studentId, examId, content, 'Pending']
    );

    const [student] = await req.db.query('SELECT full_name FROM users WHERE user_id = ?', [studentId]);
    const [classData] = await req.db.query('SELECT class_name FROM classes WHERE class_id = ?', [exam[0].class_id]);

    // Gửi thông báo cho giáo viên
    if (req.io) {
      await createNotification(
        req.db,
        req.io,
        exam[0].teacher_id,
        `Học sinh ${student[0].full_name} đã gửi khiếu nại về bài thi "${exam[0].exam_name}" (Lớp ${classData[0].class_name})`,
        'Warning',
        result.insertId,
        'Comp' // Dùng giá trị ngắn để tránh lỗi truncate
      );
    }

    res.json({ 
      success: true,
      message: 'Gửi khiếu nại thành công', 
      complaint_id: result.insertId 
    });
  } catch (error) {
    console.error(' Lỗi gửi khiếu nại:', error);
    res.status(500).json({ error: 'Lỗi gửi khiếu nại', details: error.message });
  }
};

exports.getComplaints = async (req, res) => {
  console.log('🔵 [START] getComplaints called');
  console.log('🔵 [AUTH] req.user:', req.user);
  
  const studentId = req.user.id || req.user.user_id;
  const role = req.user.role?.toLowerCase();

  console.log('🔵 [INFO] studentId:', studentId, 'role:', role);

  let query = '';
  let params = [];

  try {
    if (role === 'student') {
      console.log('🔵 [ROLE] Processing as STUDENT');
      
      query = `
        SELECT 
          c.complaint_id,
          c.exam_id,
          e.exam_name,
          c.content,
          c.status,
          c.created_at,
          c.updated_at,
          c.teacher_response,
          COALESCE((SELECT score FROM exam_attempts WHERE exam_id = c.exam_id AND student_id = c.student_id AND status = 'Submitted' ORDER BY start_time DESC LIMIT 1), 0) as exam_score,
          COALESCE((SELECT SUM(points) FROM exam_questions WHERE exam_id = c.exam_id), 0) as total_points
        FROM complaints c
        JOIN exams e ON c.exam_id = e.exam_id
        WHERE c.student_id = ?
        ORDER BY c.created_at DESC
      `;
      params = [studentId];
      
    } else if (role === 'teacher') {
      console.log('🔵 [ROLE] Processing as TEACHER');
      
      query = `
        SELECT 
          c.complaint_id,
          c.exam_id,
          e.exam_name,
          c.content,
          c.status,
          c.created_at,
          c.updated_at,
          c.teacher_response,
          u.full_name as student_name,
          u.username as student_id,
          COALESCE((SELECT score FROM exam_attempts WHERE exam_id = c.exam_id AND student_id = c.student_id AND status = 'Submitted' ORDER BY start_time DESC LIMIT 1), 0) as exam_score,
          COALESCE((SELECT SUM(points) FROM exam_questions WHERE exam_id = c.exam_id), 0) as total_points
        FROM complaints c
        JOIN exams e ON c.exam_id = e.exam_id
        JOIN users u ON c.student_id = u.user_id
        WHERE e.teacher_id = ?
        ORDER BY c.created_at DESC
      `;
      params = [studentId];
    } else {
      console.log(' [ROLE] Invalid role:', role);
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    console.log('🔵 [QUERY] About to execute query');
    console.log('🔵 [QUERY] Params:', params);
    
    const [complaints] = await req.db.query(query, params);
    
    console.log(' [SUCCESS] Query executed, found:', complaints.length, 'complaints');

    const complaintsWithResponse = complaints.map(complaint => ({
      ...complaint,
      teacher_response: complaint.teacher_response || null
    }));

    console.log(' [RETURN] Sending response');
    res.json(complaintsWithResponse);
    
  } catch (error) {
    console.error(' [ERROR] Lỗi lấy danh sách khiếu nại ');
    console.error(' Error message:', error.message);
    console.error(' Error code:', error.code);
    console.error(' Error stack:', error.stack);
    console.error(' Query was:', query);
    console.error(' Params were:', params);
    res.status(500).json({ 
      error: 'Lỗi lấy danh sách khiếu nại', 
      details: error.message,
      code: error.code
    });
  }
};