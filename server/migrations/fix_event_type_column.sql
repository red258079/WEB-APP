-- Migration: Mở rộng cột event_type để chứa các giá trị dài hơn
-- Chạy migration này để sửa lỗi "Data truncated for column 'event_type'"
-- 
-- Lưu ý: Nếu cột đã có kích thước >= 50, sẽ báo lỗi nhưng không ảnh hưởng đến dữ liệu
-- Bạn có thể bỏ qua lỗi đó hoặc kiểm tra kích thước hiện tại trước

-- Mở rộng cột event_type lên VARCHAR(50) để chứa các giá trị như:
-- 'FaceAway', 'MultiplePeople', 'PhoneDetected', 'WebcamSuspicious', 'TabSwitch', etc.
ALTER TABLE anti_cheating_logs 
MODIFY COLUMN event_type VARCHAR(50) NOT NULL COMMENT 'Loại vi phạm (FaceAway, MultiplePeople, PhoneDetected, WebcamSuspicious, TabSwitch, etc.)';
