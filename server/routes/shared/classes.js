// server/routes/shared/classes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const roleMiddleware = require('../../middleware/role');

// Lấy chi tiết lớp học (cho cả học sinh và giáo viên)
router.get('/:classId/detail', authMiddleware, roleMiddleware(['student', 'teacher']), async (req, res) => {
  const { classId } = req.params;
  const userId = req.user.id;

  try {
    const [membership] = await req.db.query(
      `SELECT cs.*, c.teacher_id 
       FROM class_students cs
       JOIN classes c ON cs.class_id = c.class_id
       WHERE cs.class_id = ? AND cs.student_id = ?`,
      [classId, userId]
    );

    // Nếu người dùng là giáo viên, kiểm tra quyền sở hữu lớp
    if (req.user.role === 'teacher') {
      const [teacherCheck] = await req.db.query(
        `SELECT * FROM classes WHERE class_id = ? AND teacher_id = ?`,
        [classId, userId]
      );
      if (teacherCheck.length === 0 && membership.length === 0) {
        return res.status(403).json({ error: 'Bạn không có quyền truy cập lớp này' });
      }
    } else if (membership.length === 0) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập lớp này' });
    }

    const [teacher] = await req.db.query(
      `SELECT u.full_name 
       FROM users u
       WHERE u.user_id = ?`,
      [membership[0]?.teacher_id || teacherCheck[0]?.teacher_id]
    );

    const [students] = await req.db.query(
      `SELECT u.user_id, u.username, u.email, u.full_name
       FROM class_students cs
       JOIN users u ON cs.student_id = u.user_id
       WHERE cs.class_id = ?
       ORDER BY u.full_name ASC`,
      [classId]
    );

    const [tests] = await req.db.query(
      `SELECT 
          e.exam_id as test_id,
          e.exam_name as title,
          e.start_time,
          e.duration,
          e.description,
          0 as total_questions
       FROM exams e
       WHERE e.class_id = ? AND e.status IN ('active', 'upcoming')
       ORDER BY e.start_time DESC`,
      [classId]
    );

    // Lấy thông báo từ bảng notifications
    // Lấy tất cả thông báo của học sinh trong lớp này
    let announcements = [];
    try {
      // Lấy danh sách student_id trong lớp
      const [studentIds] = await req.db.query(
        `SELECT student_id FROM class_students WHERE class_id = ?`,
        [classId]
      );
      
      if (studentIds.length > 0) {
        const studentIdList = studentIds.map(s => s.student_id);
        const placeholders = studentIdList.map(() => '?').join(',');
        
        // Lấy thông báo của các học sinh trong lớp
        // Lọc thông báo có related_type = 'Msg' hoặc NULL (thông báo từ giáo viên)
        // và loại bỏ thông báo có related_type = 'Exam' hoặc 'Class' (thông báo hệ thống)
        const [result] = await req.db.query(
          `SELECT 
              notification_id as announcement_id,
              content as title,
              content,
              type,
              created_at,
              user_id as recipient_id
           FROM notifications
           WHERE user_id IN (${placeholders})
             AND (related_type IS NULL OR related_type = 'Msg' OR related_type = '')
           ORDER BY created_at DESC
           LIMIT 20`,
          studentIdList
        );
        announcements = result || [];
      }
    } catch (err) {
      console.error('Lỗi lấy thông báo từ notifications:', err);
      console.log('Chi tiết lỗi:', err.message);
    }

    res.json({
      teacher: teacher[0]?.full_name || 'Chưa có giáo viên',
      students: students,
      tests: tests,
      announcements: announcements
    });
  } catch (err) {
    console.error('Lỗi lấy chi tiết lớp:', err);
    res.status(500).json({ error: 'Lỗi khi tải chi tiết lớp học', details: err.message });
  }
});

module.exports = router;