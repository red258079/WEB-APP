-- Tạo bảng lưu trữ tài liệu học tập (KHÔNG có foreign key trước)
CREATE TABLE IF NOT EXISTS materials (
    material_id INT AUTO_INCREMENT PRIMARY KEY,
    class_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL COMMENT 'pdf, docx, xlsx, pptx, etc.',
    file_size INT NOT NULL COMMENT 'bytes',
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_class_id (class_id),
    INDEX idx_teacher_id (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm foreign key sau khi tạo bảng
ALTER TABLE materials 
    ADD CONSTRAINT fk_materials_class 
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE;

ALTER TABLE materials 
    ADD CONSTRAINT fk_materials_teacher 
    FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Tạo bảng liên kết tài liệu với câu hỏi (KHÔNG có foreign key trước)
CREATE TABLE IF NOT EXISTS question_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    material_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_question_material (question_id, material_id),
    INDEX idx_question_id (question_id),
    INDEX idx_material_id (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm foreign key sau khi tạo bảng
ALTER TABLE question_materials 
    ADD CONSTRAINT fk_question_materials_question 
    FOREIGN KEY (question_id) REFERENCES question_bank(question_id) ON DELETE CASCADE;

ALTER TABLE question_materials 
    ADD CONSTRAINT fk_question_materials_material 
    FOREIGN KEY (material_id) REFERENCES materials(material_id) ON DELETE CASCADE;

