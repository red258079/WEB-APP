-- Tạo bảng audit log cho việc chỉnh sửa điểm
CREATE TABLE IF NOT EXISTS score_audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    question_id INT NULL,
    old_score DECIMAL(10,2) NULL,
    new_score DECIMAL(10,2) NULL COMMENT 'Điểm câu hỏi mới (NULL nếu chỉ thay đổi tổng điểm)',
    old_total_score DECIMAL(10,2) NULL,
    new_total_score DECIMAL(10,2) NULL COMMENT 'Tổng điểm mới (NULL nếu chỉ thay đổi điểm câu hỏi)',
    reason TEXT NOT NULL COMMENT 'Lý do chỉnh sửa điểm (bắt buộc)',
    edited_by INT NOT NULL COMMENT 'ID giáo viên chỉnh sửa',
    edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES exam_attempts(attempt_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(question_id) ON DELETE SET NULL,
    FOREIGN KEY (edited_by) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_attempt_id (attempt_id),
    INDEX idx_edited_by (edited_by),
    INDEX idx_edited_at (edited_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm cột penalty_reason vào exam_attempts để lưu lý do trừ điểm
-- Lưu ý: Nếu cột đã tồn tại, sẽ báo lỗi nhưng không ảnh hưởng đến hệ thống
-- Có thể bỏ qua lỗi nếu cột đã tồn tại

-- Kiểm tra và thêm cột penalty_reason
SET @dbname = DATABASE();
SET @tablename = 'exam_attempts';
SET @columnname = 'penalty_reason';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TEXT NULL COMMENT ''Lý do trừ điểm (ví dụ: chuyển tab quá 3 lần)''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Kiểm tra và thêm cột penalty_amount
SET @columnname = 'penalty_amount';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DECIMAL(10,2) DEFAULT 0 COMMENT ''Số điểm bị trừ''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

