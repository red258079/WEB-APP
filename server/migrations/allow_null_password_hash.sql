-- Migration: Cho phép password_hash NULL để hỗ trợ đăng nhập Google OAuth
-- Chạy migration này để cho phép password_hash có thể NULL

-- Sửa cột password_hash để cho phép NULL
ALTER TABLE users 
MODIFY COLUMN password_hash VARCHAR(255) NULL COMMENT 'Mật khẩu đã hash. NULL nếu đăng nhập bằng Google OAuth';






