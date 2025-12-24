-- Tạo bảng backup_history để lưu lịch sử backup
-- Lưu ý: Bảng này sẽ tự động được tạo khi sử dụng chức năng backup
-- File này chỉ để tham khảo hoặc chạy thủ công nếu cần

-- Xóa bảng cũ nếu có (nếu cần sửa lại)
DROP TABLE IF EXISTS backup_history;

-- Tạo bảng backup_history
-- Lưu ý: Kiểu dữ liệu của created_by phải khớp với user_id trong bảng users
-- Nếu user_id là INT UNSIGNED, thì created_by cũng phải là INT UNSIGNED
CREATE TABLE backup_history (
    backup_id INT AUTO_INCREMENT PRIMARY KEY,
    backup_file VARCHAR(255) NOT NULL,
    backup_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    -- Foreign key sẽ được thêm nếu kiểu dữ liệu khớp
    -- FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
    INDEX idx_created_at (created_at),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;











