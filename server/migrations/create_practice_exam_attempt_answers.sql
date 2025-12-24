-- Migration: Tạo bảng lưu đáp án học sinh làm bài luyện tập

CREATE TABLE IF NOT EXISTS practice_exam_attempt_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL COMMENT 'FK từ practice_exam_questions.id',
    option_id INT DEFAULT NULL COMMENT 'FK từ practice_exam_options.id (cho trắc nghiệm)',
    answer_text TEXT DEFAULT NULL COMMENT 'Đáp án text (cho FillInBlank/Essay)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES practice_exam_attempts(attempt_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES practice_exam_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES practice_exam_options(id) ON DELETE SET NULL,
    INDEX idx_attempt (attempt_id),
    INDEX idx_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





















