const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const roleMiddleware = require('../../middleware/role');

// ============================================
// 📊 THEO DÕI TRẠNG THÁI HỌC SINH REAL-TIME
// ============================================
router.get('/:examId/students-status', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { examId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền
    const [exam] = await req.db.query(
      'SELECT exam_name, start_time, duration FROM exams WHERE exam_id = ? AND teacher_id = ?',
      [examId, teacherId]
    );

    if (!exam.length) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập bài thi này' });
    }

    // Lấy thông tin bài thi chi tiết hơn
    const [examDetail] = await req.db.query(
      `SELECT 
        e.exam_id,
        e.exam_name,
        e.start_time,
        e.duration,
        e.class_id,
        (SELECT COUNT(*) FROM exam_questions WHERE exam_id = e.exam_id) as total_questions,
        (SELECT SUM(points) FROM exam_questions WHERE exam_id = e.exam_id) as total_points,
        CASE
          WHEN e.status IN ('deleted', 'draft') THEN e.status
          WHEN NOW() < e.start_time THEN 'upcoming'
          WHEN NOW() >= e.start_time 
               AND NOW() < DATE_ADD(e.start_time, INTERVAL e.duration MINUTE) THEN 'active'
          ELSE 'completed'
        END AS exam_status
       FROM exams e
       WHERE e.exam_id = ? AND e.teacher_id = ?`,
      [examId, teacherId]
    );

    if (!examDetail.length) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập bài thi này' });
    }

    const examInfo = examDetail[0];
    const totalQuestions = examInfo.total_questions || 0;

    // Lấy danh sách học sinh và trạng thái làm bài
    const [students] = await req.db.query(
      `SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.username,
        cs.class_id,
        ea.attempt_id,
        ea.status,
        ea.start_time,
        ea.end_time,
        ea.score,
        ea.is_banned,
        ea.cheating_detected,
        ea.penalty_amount,
        TIMESTAMPDIFF(SECOND, ea.start_time, COALESCE(ea.end_time, NOW())) as time_elapsed_seconds,
        (SELECT COUNT(*) FROM exam_attempt_answers eaa WHERE eaa.attempt_id = ea.attempt_id) as answered_count,
        (SELECT COUNT(*) FROM exam_attempt_answers eaa 
         WHERE eaa.attempt_id = ea.attempt_id AND eaa.answer_text IS NOT NULL AND eaa.answer_text != '') as answered_with_content
       FROM class_students cs
       JOIN users u ON cs.student_id = u.user_id
       LEFT JOIN exam_attempts ea ON ea.exam_id = ? AND ea.student_id = u.user_id
       WHERE cs.class_id = ?
       ORDER BY 
         CASE 
           WHEN ea.status = 'InProgress' THEN 1
           WHEN ea.status = 'Submitted' THEN 2
           WHEN ea.status = 'AutoSubmitted' THEN 3
           ELSE 4
         END,
         u.full_name ASC`,
      [examId, examInfo.class_id]
    );

    // Tính toán thời gian còn lại cho học sinh đang làm bài
    const now = new Date();
    const examStartTime = new Date(examInfo.start_time);
    const examEndTime = new Date(examStartTime.getTime() + (examInfo.duration * 60 * 1000));
    const timeRemaining = Math.max(0, Math.floor((examEndTime - now) / 1000)); // seconds

    // Tính toán thống kê
    const stats = {
      total_students: students.length,
      in_progress: students.filter(s => s.status === 'InProgress').length,
      submitted: students.filter(s => s.status === 'Submitted' || s.status === 'AutoSubmitted').length,
      not_started: students.filter(s => !s.status || s.status === null).length,
      banned: students.filter(s => s.is_banned === 1).length,
      cheating_detected: students.filter(s => s.cheating_detected === 1).length
    };

    // Tính điểm trung bình của những học sinh đã nộp
    const submittedScores = students
      .filter(s => s.status === 'Submitted' || s.status === 'AutoSubmitted')
      .map(s => parseFloat(s.score) || 0)
      .filter(score => score > 0);
    
    stats.average_score = submittedScores.length > 0
      ? (submittedScores.reduce((a, b) => a + b, 0) / submittedScores.length).toFixed(2)
      : 0;

    res.json({
      exam: {
        exam_id: examInfo.exam_id,
        exam_name: examInfo.exam_name,
        start_time: examInfo.start_time,
        duration: examInfo.duration,
        total_questions: totalQuestions,
        total_points: examInfo.total_points || 0,
        exam_status: examInfo.exam_status,
        time_remaining: timeRemaining,
        class_id: examInfo.class_id
      },
      students: students.map(s => {
        const status = s.status || 'not_started';
        let statusText = 'Chưa bắt đầu';
        let statusColor = '#718096'; // gray
        
        if (status === 'InProgress') {
          statusText = 'Đang làm bài';
          statusColor = '#3182ce'; // blue
        } else if (status === 'Submitted') {
          statusText = 'Đã nộp bài';
          statusColor = '#38a169'; // green
        } else if (status === 'AutoSubmitted') {
          statusText = 'Tự động nộp';
          statusColor = '#d69e2e'; // yellow
        }
        
        if (s.is_banned === 1) {
          statusText = 'Bị cấm thi';
          statusColor = '#e53e3e'; // red
        }

        const progress = totalQuestions > 0 
          ? Math.round(((s.answered_count || 0) / totalQuestions) * 100) 
          : 0;

        // Tính thời gian còn lại cho học sinh đang làm bài
        let studentTimeRemaining = null;
        if (status === 'InProgress' && s.start_time) {
          const studentStartTime = new Date(s.start_time);
          const studentEndTime = new Date(studentStartTime.getTime() + (examInfo.duration * 60 * 1000));
          studentTimeRemaining = Math.max(0, Math.floor((studentEndTime - now) / 1000));
        }

        return {
          student_id: s.user_id,
          full_name: s.full_name,
          email: s.email,
          username: s.username,
          attempt_id: s.attempt_id,
          status: status,
          status_text: statusText,
          status_color: statusColor,
          start_time: s.start_time,
          end_time: s.end_time,
          score: s.score ? parseFloat(s.score).toFixed(2) : null,
          time_elapsed: s.time_elapsed_seconds || 0,
          time_remaining: studentTimeRemaining,
          progress: progress,
          answered_count: s.answered_count || 0,
          answered_with_content: s.answered_with_content || 0,
          total_questions: totalQuestions,
          is_banned: s.is_banned === 1,
          cheating_detected: s.cheating_detected === 1,
          penalty_amount: s.penalty_amount || 0
        };
      }),
      stats
    });

  } catch (err) {
    console.error('❌ Lỗi lấy trạng thái học sinh:', err);
    res.status(500).json({ error: 'Lỗi khi lấy trạng thái học sinh', details: err.message });
  }
});

module.exports = router;


