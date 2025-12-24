// server/routes/student/statistics.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const roleMiddleware = require('../../middleware/role');

// GET /api/student/statistics - Thống kê học tập cho học sinh
router.get('/', authMiddleware, roleMiddleware(['Student']), async (req, res) => {
  const studentId = req.user.id || req.user.user_id;

  try {
    const db = req.db;

    // 1. Thống kê tổng quan
    const [totalStats] = await db.query(
      `SELECT 
        COUNT(DISTINCT ea.exam_id) as total_exams_attempted,
        COUNT(DISTINCT ea.attempt_id) as total_attempts,
        COALESCE(AVG(ea.score), 0) as avg_score,
        COALESCE(MAX(ea.score), 0) as highest_score,
        COALESCE(MIN(ea.score), 0) as lowest_score,
        COUNT(DISTINCT CASE WHEN ea.status = 'Submitted' THEN ea.exam_id END) as completed_exams,
        COUNT(DISTINCT cs.class_id) as total_classes
       FROM exam_attempts ea
       LEFT JOIN class_students cs ON cs.student_id = ea.student_id
       WHERE ea.student_id = ?
         AND ea.status IN ('Submitted', 'AutoSubmitted')`,
      [studentId]
    );

    // 2. Phân bố điểm theo mức
    const [scoreDistribution] = await db.query(
      `SELECT 
        CASE 
          WHEN ea.score >= 8 AND ea.score <= 10 THEN 'Giỏi (8-10)'
          WHEN ea.score >= 6.5 AND ea.score < 8 THEN 'Khá (6.5-8)'
          WHEN ea.score >= 5 AND ea.score < 6.5 THEN 'Trung bình (5-6.5)'
          WHEN ea.score < 5 THEN 'Yếu (<5)'
          ELSE 'Chưa chấm'
        END as grade_level,
        COUNT(*) as count
       FROM exam_attempts ea
       WHERE ea.student_id = ?
         AND ea.status IN ('Submitted', 'AutoSubmitted')
         AND ea.score IS NOT NULL
       GROUP BY grade_level
       ORDER BY 
         CASE grade_level
           WHEN 'Giỏi (8-10)' THEN 1
           WHEN 'Khá (6.5-8)' THEN 2
           WHEN 'Trung bình (5-6.5)' THEN 3
           WHEN 'Yếu (<5)' THEN 4
           ELSE 5
         END`,
      [studentId]
    );

    // 3. Điểm theo môn học
    const [subjectStats] = await db.query(
      `SELECT 
        s.subject_name,
        COUNT(DISTINCT ea.exam_id) as exam_count,
        COALESCE(AVG(ea.score), 0) as avg_score,
        COALESCE(MAX(ea.score), 0) as highest_score
       FROM exam_attempts ea
       JOIN exams e ON ea.exam_id = e.exam_id
       LEFT JOIN subjects s ON e.subject_id = s.subject_id
       WHERE ea.student_id = ?
         AND ea.status IN ('Submitted', 'AutoSubmitted')
         AND ea.score IS NOT NULL
       GROUP BY s.subject_id, s.subject_name
       ORDER BY avg_score DESC`,
      [studentId]
    );

    // 4. Điểm theo thời gian (7 ngày gần nhất)
    const [scoreTrend] = await db.query(
      `SELECT 
        DATE_FORMAT(ea.created_at, '%Y-%m-%d') as date,
        DATE_FORMAT(ea.created_at, '%d/%m') as label,
        COALESCE(AVG(ea.score), 0) as avg_score,
        COUNT(*) as attempt_count
       FROM exam_attempts ea
       WHERE ea.student_id = ?
         AND ea.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         AND ea.status IN ('Submitted', 'AutoSubmitted')
         AND ea.score IS NOT NULL
       GROUP BY DATE_FORMAT(ea.created_at, '%Y-%m-%d')
       ORDER BY date ASC`,
      [studentId]
    );

    // 5. Top bài thi điểm cao nhất
    const [topExams] = await db.query(
      `SELECT 
        e.exam_name,
        s.subject_name,
        ea.score,
        ea.created_at as submitted_at
       FROM exam_attempts ea
       JOIN exams e ON ea.exam_id = e.exam_id
       LEFT JOIN subjects s ON e.subject_id = s.subject_id
       WHERE ea.student_id = ?
         AND ea.status IN ('Submitted', 'AutoSubmitted')
         AND ea.score IS NOT NULL
       ORDER BY ea.score DESC
       LIMIT 5`,
      [studentId]
    );

    // 6. Tỷ lệ đạt (>= 5 điểm)
    const [passStats] = await db.query(
      `SELECT 
        COUNT(CASE WHEN ea.score >= 5 THEN 1 END) as passed,
        COUNT(*) as total
       FROM exam_attempts ea
       WHERE ea.student_id = ?
         AND ea.status IN ('Submitted', 'AutoSubmitted')
         AND ea.score IS NOT NULL`,
      [studentId]
    );

    const passRate = passStats[0].total > 0
      ? ((passStats[0].passed / passStats[0].total) * 100).toFixed(1)
      : 0;

    // 7. Thống kê theo lớp học
    const [classStats] = await db.query(
      `SELECT 
        c.class_name,
        COUNT(DISTINCT ea.exam_id) as exam_count,
        COALESCE(AVG(ea.score), 0) as avg_score
       FROM class_students cs
       JOIN classes c ON cs.class_id = c.class_id
       LEFT JOIN exams e ON e.class_id = c.class_id
       LEFT JOIN exam_attempts ea ON ea.exam_id = e.exam_id AND ea.student_id = cs.student_id
       WHERE cs.student_id = ?
         AND ea.status IN ('Submitted', 'AutoSubmitted')
       GROUP BY c.class_id, c.class_name
       HAVING exam_count > 0
       ORDER BY avg_score DESC`,
      [studentId]
    );

    // Format dữ liệu phân bố điểm
    const distributionData = {
      'Giỏi (8-10)': 0,
      'Khá (6.5-8)': 0,
      'Trung bình (5-6.5)': 0,
      'Yếu (<5)': 0
    };

    scoreDistribution.forEach(item => {
      if (distributionData.hasOwnProperty(item.grade_level)) {
        distributionData[item.grade_level] = parseInt(item.count);
      }
    });

    res.json({
      // Thống kê tổng quan
      total_exams_attempted: parseInt(totalStats[0]?.total_exams_attempted) || 0,
      total_attempts: parseInt(totalStats[0]?.total_attempts) || 0,
      avg_score: parseFloat(totalStats[0]?.avg_score || 0).toFixed(1),
      highest_score: parseFloat(totalStats[0]?.highest_score || 0).toFixed(1),
      lowest_score: parseFloat(totalStats[0]?.lowest_score || 0).toFixed(1),
      completed_exams: parseInt(totalStats[0]?.completed_exams) || 0,
      total_classes: parseInt(totalStats[0]?.total_classes) || 0,
      
      // Phân bố điểm
      distribution: distributionData,
      
      // Tỷ lệ đạt
      pass_rate: passRate,
      
      // Điểm theo môn học
      subject_stats: subjectStats.map(s => ({
        ...s,
        avg_score: parseFloat(s.avg_score || 0).toFixed(1),
        highest_score: parseFloat(s.highest_score || 0).toFixed(1),
        exam_count: parseInt(s.exam_count) || 0
      })),
      
      // Điểm theo thời gian
      score_trend: scoreTrend.map(t => ({
        ...t,
        avg_score: parseFloat(t.avg_score || 0).toFixed(1),
        attempt_count: parseInt(t.attempt_count) || 0
      })),
      
      // Top bài thi
      top_exams: topExams.map(e => ({
        ...e,
        score: parseFloat(e.score || 0).toFixed(1)
      })),
      
      // Thống kê theo lớp
      class_stats: classStats.map(c => ({
        ...c,
        avg_score: parseFloat(c.avg_score || 0).toFixed(1),
        exam_count: parseInt(c.exam_count) || 0
      }))
    });

  } catch (err) {
    console.error('❌ Lỗi khi lấy thống kê học sinh:', err);
    res.status(500).json({ 
      error: 'Lỗi khi lấy thống kê', 
      details: err.message 
    });
  }
});

module.exports = router;





































