-- Thêm cột google_id vào bảng users để hỗ trợ đăng nhập Google OAuth
-- Chạy migration này để thêm cột google_id vào bảng users

-- Kiểm tra và thêm cột google_id nếu chưa tồn tại
-- Lưu ý: MySQL không hỗ trợ IF NOT EXISTS cho ALTER TABLE, nên cần kiểm tra thủ công
-- Nếu cột đã tồn tại, bỏ qua lỗi

-- Thêm cột google_id
ALTER TABLE users 
ADD COLUMN google_id VARCHAR(255) NULL AFTER password_hash;

-- Tạo index cho google_id để tìm kiếm nhanh hơn
CREATE INDEX idx_google_id ON users(google_id);

-- Cập nhật comment cho cột
ALTER TABLE users 
MODIFY COLUMN google_id VARCHAR(255) NULL COMMENT 'Google OAuth ID để liên kết tài khoản Google';

