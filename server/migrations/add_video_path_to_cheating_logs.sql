-- Migration: Thêm cột video_path vào bảng anti_cheating_logs
-- Chạy migration này để hỗ trợ lưu trữ video vi phạm
-- Lưu ý: Nếu cột đã tồn tại, sẽ báo lỗi nhưng không ảnh hưởng đến dữ liệu

-- Kiểm tra và thêm cột video_path nếu chưa có
SET @dbname = DATABASE();
SET @tablename = 'anti_cheating_logs';
SET @columnname = 'video_path';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(500) NULL COMMENT ''Đường dẫn file video vi phạm'' AFTER event_description')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Thêm cột video_duration (thời lượng video tính bằng giây)
SET @columnname = 'video_duration';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL COMMENT ''Thời lượng video (giây)'' AFTER video_path')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Thêm cột is_recorded (đánh dấu đã lưu video)
SET @columnname = 'is_recorded';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' BOOLEAN DEFAULT 0 COMMENT ''Đã lưu video hay chưa'' AFTER video_duration')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Thêm index để tìm kiếm nhanh hơn
-- Lưu ý: Nếu index đã tồn tại, sẽ báo lỗi nhưng không ảnh hưởng
-- Bạn có thể bỏ qua lỗi hoặc xóa index cũ trước nếu cần
CREATE INDEX idx_video_path ON anti_cheating_logs(video_path);
CREATE INDEX idx_is_recorded ON anti_cheating_logs(is_recorded);

