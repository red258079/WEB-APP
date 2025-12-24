-- Migration: Thêm cột video_path vào bảng anti_cheating_logs
-- Chạy migration này để hỗ trợ lưu trữ video vi phạm
-- 
-- HƯỚNG DẪN:
-- 1. Kiểm tra xem cột đã tồn tại chưa bằng cách chạy:
--    DESCRIBE anti_cheating_logs;
-- 2. Nếu cột chưa có, chạy các câu lệnh ALTER TABLE bên dưới
-- 3. Nếu cột đã có, bỏ qua câu lệnh đó

-- Thêm cột video_path
ALTER TABLE anti_cheating_logs 
ADD COLUMN video_path VARCHAR(500) NULL COMMENT 'Đường dẫn file video vi phạm' AFTER event_description;

-- Thêm cột video_duration
ALTER TABLE anti_cheating_logs 
ADD COLUMN video_duration INT NULL COMMENT 'Thời lượng video (giây)' AFTER video_path;

-- Thêm cột is_recorded
ALTER TABLE anti_cheating_logs 
ADD COLUMN is_recorded BOOLEAN DEFAULT 0 COMMENT 'Đã lưu video hay chưa' AFTER video_duration;

-- Thêm index (nếu index đã tồn tại sẽ báo lỗi, nhưng không ảnh hưởng)
CREATE INDEX idx_video_path ON anti_cheating_logs(video_path);
CREATE INDEX idx_is_recorded ON anti_cheating_logs(is_recorded);












