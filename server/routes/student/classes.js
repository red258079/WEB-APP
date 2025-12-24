// server/routes/student/classes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const roleMiddleware = require('../../middleware/role');
const { createNotification } = require('../shared/helpers');

// Tham gia lớp học bằng mã code
router.post('/join', authMiddleware, roleMiddleware(['student']), async (req, res) => {
  const { classCode } = req.body;
  const studentId = req.user.id;

  if (!classCode) {
    return res.status(400).json({ error: 'Mã lớp là bắt buộc' });
  }

  try {
    const [classResult] = await req.db.query(
      `SELECT class_id, class_name, teacher_id FROM classes WHERE class_code = ? AND status = 'active'`,
      [classCode]
    );

    if (classResult.length === 0) {
      return res.status(404).json({ error: 'Lớp học không tồn tại hoặc mã lớp không đúng' });
    }

    const classId = classResult[0].class_id;
    const teacherId = classResult[0].teacher_id;

    const [existing] = await req.db.query(
      `SELECT * FROM class_students WHERE class_id = ? AND student_id = ?`,
      [classId, studentId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Bạn đã tham gia lớp này' });
    }

    await req.db.query(
      `INSERT INTO class_students (class_id, student_id, joined_at) VALUES (?, ?, NOW())`,
      [classId, studentId]
    );

    const [student] = await req.db.query('SELECT full_name FROM users WHERE user_id = ?', [studentId]);
    await createNotification(
      req.db,
      req.io,
      teacherId,
      `Học sinh ${student[0].full_name} đã tham gia lớp ${classResult[0].class_name}`,
      'Info',
      classId,
      'Class'
    );

    res.json({ message: 'Tham gia lớp học thành công', classId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi khi tham gia lớp', details: err.message });
  }
});

// Lấy danh sách lớp học mà học sinh đã tham gia
router.get('/my', authMiddleware, roleMiddleware(['student']), async (req, res) => {
  const studentId = req.user.id;

  try {
    const [classes] = await req.db.query(
      `SELECT 
          c.class_id,
          c.class_name,
          COALESCE(s.subject_name, 'Chưa có môn học') as subject_name,
          c.class_code,
          c.icon,
          c.academic_year,
          c.description,
          c.status
       FROM class_students cs
       JOIN classes c ON cs.class_id = c.class_id
       LEFT JOIN subjects s ON c.subject_id = s.subject_id
       WHERE cs.student_id = ? AND c.status = 'active'
       ORDER BY c.class_name ASC`,
      [studentId]
    );

    res.json({ myClasses: classes });
  } catch (err) {
    console.error('Lỗi lấy lớp học:', err);
    res.status(500).json({ error: 'Lỗi khi tải danh sách lớp học', details: err.message });
  }
});

// Lấy danh sách tài liệu của lớp học (cho học sinh)
router.get('/:classId/materials', authMiddleware, roleMiddleware(['student']), async (req, res) => {
  const { classId } = req.params;
  const studentId = req.user.id;

  try {
    // Kiểm tra học sinh có trong lớp không
    const [membership] = await req.db.query(
      'SELECT class_id FROM class_students WHERE class_id = ? AND student_id = ?',
      [classId, studentId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập lớp này' });
    }

    // Lấy danh sách tài liệu
    const [materials] = await req.db.query(
      `SELECT 
        m.material_id,
        m.title,
        m.description,
        m.file_name,
        m.file_type,
        m.file_size,
        m.upload_date,
        COUNT(DISTINCT qm.question_id) as linked_questions_count
      FROM materials m
      LEFT JOIN question_materials qm ON m.material_id = qm.material_id
      WHERE m.class_id = ?
      GROUP BY m.material_id
      ORDER BY m.upload_date DESC`,
      [classId]
    );

    res.json(materials);
  } catch (err) {
    console.error('Lỗi lấy danh sách tài liệu:', err);
    res.status(500).json({ error: 'Lỗi server', details: err.message });
  }
});

module.exports = router;