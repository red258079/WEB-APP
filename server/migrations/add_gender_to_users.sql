-- Migration: Thêm cột gender vào bảng users
-- Chạy migration này để thêm cột gender (giới tính) vào bảng users

-- Thêm cột gender
ALTER TABLE users 
ADD COLUMN gender ENUM('male', 'female', 'other') NULL AFTER dob;

-- Cập nhật comment cho cột
ALTER TABLE users 
MODIFY COLUMN gender ENUM('male', 'female', 'other') NULL COMMENT 'Giới tính: male (Nam), female (Nữ), other (Khác)';






