const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const roleMiddleware = require('../../middleware/role');

// ============================================
// 📊 PHÂN TÍCH ĐỘ KHÓ CÂU HỎI
// ============================================
router.get('/question-bank/analysis', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Lấy tất cả câu hỏi của giáo viên với thống kê
    const [questions] = await req.db.query(
      `SELECT 
        qb.question_id,
        qb.question_content,
        qb.question_type,
        qb.difficulty as set_difficulty,
        qb.created_at,
        COUNT(DISTINCT eaa.attempt_id) as total_attempts,
        SUM(CASE WHEN eaa.is_correct = 1 THEN 1 ELSE 0 END) as correct_attempts,
        SUM(CASE WHEN eaa.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_attempts,
        CASE 
          WHEN COUNT(DISTINCT eaa.attempt_id) > 0 
          THEN ROUND((SUM(CASE WHEN eaa.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT eaa.attempt_id)) * 100, 2)
          ELSE 0
        END as correct_rate,
        CASE 
          WHEN COUNT(DISTINCT eaa.attempt_id) > 0 
          THEN ROUND((SUM(CASE WHEN eaa.is_correct = 0 THEN 1 ELSE 0 END) / COUNT(DISTINCT eaa.attempt_id)) * 100, 2)
          ELSE 0
        END as incorrect_rate
       FROM question_bank qb
       LEFT JOIN exam_questions eq ON qb.question_id = eq.question_id
       LEFT JOIN exam_attempt_answers eaa ON eq.question_id = eaa.question_id AND eaa.is_correct IS NOT NULL
       WHERE qb.teacher_id = ?
       GROUP BY qb.question_id, qb.question_content, qb.question_type, qb.difficulty, qb.created_at
       ORDER BY total_attempts DESC, correct_rate ASC`,
      [teacherId]
    );

    // Phân loại độ khó thực tế dựa trên tỷ lệ đúng
    const analyzedQuestions = questions.map(q => {
      let actual_difficulty = 'Unknown';
      let difficulty_score = 0;

      if (q.total_attempts >= 5) { // Cần ít nhất 5 lần làm để đánh giá
        if (q.correct_rate >= 80) {
          actual_difficulty = 'Easy';
          difficulty_score = 1;
        } else if (q.correct_rate >= 60) {
          actual_difficulty = 'Medium';
          difficulty_score = 2;
        } else if (q.correct_rate >= 40) {
          actual_difficulty = 'Medium-Hard';
          difficulty_score = 3;
        } else {
          actual_difficulty = 'Hard';
          difficulty_score = 4;
        }
      } else {
        actual_difficulty = 'Insufficient Data';
      }

      return {
        question_id: q.question_id,
        question_content: q.question_content.substring(0, 100) + (q.question_content.length > 100 ? '...' : ''),
        question_type: q.question_type,
        set_difficulty: q.set_difficulty,
        actual_difficulty: actual_difficulty,
        difficulty_score: difficulty_score,
        total_attempts: q.total_attempts || 0,
        correct_attempts: q.correct_attempts || 0,
        incorrect_attempts: q.incorrect_attempts || 0,
        correct_rate: parseFloat(q.correct_rate || 0),
        incorrect_rate: parseFloat(q.incorrect_rate || 0),
        created_at: q.created_at
      };
    });

    // Thống kê tổng quan
    const stats = {
      total_questions: analyzedQuestions.length,
      questions_with_data: analyzedQuestions.filter(q => q.total_attempts >= 5).length,
      easy_count: analyzedQuestions.filter(q => q.actual_difficulty === 'Easy').length,
      medium_count: analyzedQuestions.filter(q => q.actual_difficulty === 'Medium').length,
      medium_hard_count: analyzedQuestions.filter(q => q.actual_difficulty === 'Medium-Hard').length,
      hard_count: analyzedQuestions.filter(q => q.actual_difficulty === 'Hard').length,
      avg_correct_rate: analyzedQuestions.length > 0
        ? analyzedQuestions.reduce((sum, q) => sum + q.correct_rate, 0) / analyzedQuestions.length
        : 0
    };

    res.json({
      questions: analyzedQuestions,
      stats
    });

  } catch (err) {
    console.error('❌ Lỗi phân tích độ khó câu hỏi:', err);
    res.status(500).json({ error: 'Lỗi khi phân tích độ khó câu hỏi', details: err.message });
  }
});

// ============================================
// 📊 PHÂN TÍCH ĐỘ KHÓ CÂU HỎI THEO ID
// ============================================
router.get('/question-bank/:questionId/analysis', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { questionId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền
    const [question] = await req.db.query(
      'SELECT question_id FROM question_bank WHERE question_id = ? AND teacher_id = ?',
      [questionId, teacherId]
    );

    if (!question.length) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập câu hỏi này' });
    }

    // Lấy thống kê chi tiết
    const [stats] = await req.db.query(
      `SELECT 
        COUNT(DISTINCT eaa.attempt_id) as total_attempts,
        SUM(CASE WHEN eaa.is_correct = 1 THEN 1 ELSE 0 END) as correct_attempts,
        SUM(CASE WHEN eaa.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_attempts,
        COUNT(DISTINCT eq.exam_id) as used_in_exams,
        COUNT(DISTINCT ea.student_id) as unique_students
       FROM question_bank qb
       LEFT JOIN exam_questions eq ON qb.question_id = eq.question_id
       LEFT JOIN exam_attempt_answers eaa ON eq.question_id = eaa.question_id AND eaa.is_correct IS NOT NULL
       LEFT JOIN exam_attempts ea ON eaa.attempt_id = ea.attempt_id
       WHERE qb.question_id = ?`,
      [questionId]
    );

    const stat = stats[0];
    const correct_rate = stat.total_attempts > 0 
      ? (stat.correct_attempts / stat.total_attempts) * 100 
      : 0;

    let actual_difficulty = 'Unknown';
    if (stat.total_attempts >= 5) {
      if (correct_rate >= 80) {
        actual_difficulty = 'Easy';
      } else if (correct_rate >= 60) {
        actual_difficulty = 'Medium';
      } else if (correct_rate >= 40) {
        actual_difficulty = 'Medium-Hard';
      } else {
        actual_difficulty = 'Hard';
      }
    } else {
      actual_difficulty = 'Insufficient Data';
    }

    res.json({
      question_id: questionId,
      total_attempts: stat.total_attempts || 0,
      correct_attempts: stat.correct_attempts || 0,
      incorrect_attempts: stat.incorrect_attempts || 0,
      correct_rate: parseFloat(correct_rate.toFixed(2)),
      incorrect_rate: parseFloat((100 - correct_rate).toFixed(2)),
      used_in_exams: stat.used_in_exams || 0,
      unique_students: stat.unique_students || 0,
      actual_difficulty: actual_difficulty
    });

  } catch (err) {
    console.error('❌ Lỗi phân tích câu hỏi:', err);
    res.status(500).json({ error: 'Lỗi khi phân tích câu hỏi', details: err.message });
  }
});

module.exports = router;

                                                            


