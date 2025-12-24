-- Migration: Tạo bảng cho AI preferences và quota tracking

-- Bảng lưu preference của user
CREATE TABLE IF NOT EXISTS user_ai_preferences (
    user_id BIGINT PRIMARY KEY,
    preferred_model VARCHAR(20) DEFAULT NULL COMMENT 'groq hoặc gemini',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng theo dõi AI usage logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(20) NOT NULL COMMENT 'groq hoặc gemini',
    action_type VARCHAR(50) NOT NULL COMMENT 'create_practice_exam, create_exam, etc',
    tokens_used INT DEFAULT 0,
    practice_exam_id INT DEFAULT NULL,
    exam_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, DATE(created_at)),
    INDEX idx_user_week (user_id, YEARWEEK(created_at)),
    INDEX idx_provider_date (provider, DATE(created_at))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng theo dõi quota hệ thống
CREATE TABLE IF NOT EXISTS ai_system_quota (
    quota_id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    provider VARCHAR(20) NOT NULL COMMENT 'groq hoặc gemini',
    total_requests INT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    limit_requests INT DEFAULT 100 COMMENT 'Giới hạn requests/ngày',
    limit_tokens BIGINT DEFAULT 250000 COMMENT 'Giới hạn tokens/ngày',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (quota_id),
    UNIQUE KEY unique_provider_date (provider, date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cache nội dung tài liệu đã extract (cho AI)
CREATE TABLE IF NOT EXISTS material_cache (
    material_id INT PRIMARY KEY,
    extracted_content TEXT,
    word_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(material_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng practice exams (đề luyện tập của học sinh)
CREATE TABLE IF NOT EXISTS practice_exams (
    practice_exam_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    source_type ENUM('teacher_material', 'uploaded_file', 'question_bank') NOT NULL,
    source_id INT DEFAULT NULL COMMENT 'material_id hoặc file_id',
    exam_name VARCHAR(255) NOT NULL,
    total_questions INT DEFAULT 0,
    ai_provider VARCHAR(20) DEFAULT NULL COMMENT 'groq hoặc gemini',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('draft', 'active', 'completed') DEFAULT 'active',
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_source (source_type, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng practice exam questions
CREATE TABLE IF NOT EXISTS practice_exam_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    practice_exam_id INT NOT NULL,
    question_id BIGINT DEFAULT NULL COMMENT 'FK từ question_bank nếu có',
    question_content TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'Medium',
    points DECIMAL(5,2) DEFAULT 1.0,
    question_order INT NOT NULL,
    FOREIGN KEY (practice_exam_id) REFERENCES practice_exams(practice_exam_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(question_id) ON DELETE SET NULL,
    INDEX idx_practice_exam (practice_exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng practice exam options
CREATE TABLE IF NOT EXISTS practice_exam_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    practice_exam_id INT NOT NULL,
    question_order INT NOT NULL COMMENT 'Tham chiếu practice_exam_questions.question_order',
    option_content TEXT NOT NULL,
    is_correct TINYINT(1) DEFAULT 0,
    option_order INT NOT NULL,
    FOREIGN KEY (practice_exam_id) REFERENCES practice_exams(practice_exam_id) ON DELETE CASCADE,
    INDEX idx_practice_question (practice_exam_id, question_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng practice exam attempts
CREATE TABLE IF NOT EXISTS practice_exam_attempts (
    attempt_id INT AUTO_INCREMENT PRIMARY KEY,
    practice_exam_id INT NOT NULL,
    student_id BIGINT NOT NULL,
    score DECIMAL(10,2) DEFAULT 0,
    total_points DECIMAL(10,2) DEFAULT 0,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'InProgress',
    FOREIGN KEY (practice_exam_id) REFERENCES practice_exams(practice_exam_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_practice_exam (practice_exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





















