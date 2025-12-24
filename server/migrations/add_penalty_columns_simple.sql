-- Migration đơn giản: Thêm cột penalty vào exam_attempts
-- Chạy file này nếu file create_score_audit_logs.sql gặp lỗi

-- Thêm cột penalty_reason
ALTER TABLE exam_attempts 
ADD COLUMN penalty_reason TEXT NULL COMMENT 'Lý do trừ điểm (ví dụ: chuyển tab quá 3 lần)';

-- Thêm cột penalty_amount
ALTER TABLE exam_attempts 
ADD COLUMN penalty_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Số điểm bị trừ';

















