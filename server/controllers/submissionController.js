exports.submitExam = async (req, res) => {
  const { examId } = req.params;
  const { answers } = req.body;
  const studentId = req.user.id;

  try {
    const [exam] = await req.db.query('SELECT teacher_id, class_id, exam_name FROM exams WHERE exam_id = ?', [examId]);
    if (!exam[0]) {
      return res.status(404).json({ error: 'Bài thi không tồn tại' });
    }

    const [result] = await req.db.query(
      'INSERT INTO exam_attempts (exam_id, student_id, start_time, status, is_fully_graded) VALUES (?, ?, NOW(), ?, ?)',
      [examId, studentId, 'Submitted', 0]
    );

    for (const answer of answers) {
      await req.db.query(
        'INSERT INTO exam_attempt_answers (attempt_id, question_id, option_id, answer_text) VALUES (?, ?, ?, ?)',
        [result.insertId, answer.question_id, answer.option_id, answer.answer_text]
      );
    }

    const [student] = await req.db.query('SELECT full_name FROM users WHERE user_id = ?', [studentId]);
    const [classData] = await req.db.query('SELECT class_name FROM classes WHERE class_id = ?', [exam[0].class_id]);

    // Thông báo nộp bài
    await createNotification(
      req.db,
      req.io,
      exam[0].teacher_id,
      `Học sinh ${student[0].full_name} đã nộp bài thi ${exam[0].exam_name} (Lớp ${classData[0].class_name})`,
      'Info',
      examId,
      'Exam'
    );

    // Thông báo bài thi cần chấm
    await createNotification(
      req.db,
      req.io,
      exam[0].teacher_id,
      `Có bài thi mới cần chấm: ${exam[0].exam_name} từ học sinh ${student[0].full_name}`,
      'Warning',
      result.insertId,
      'Exam'
    );

    res.json({ message: 'Nộp bài thi thành công', attempt_id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi nộp bài thi', details: error.message });
  }
};