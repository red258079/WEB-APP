-- Sửa kích thước cột related_type trong bảng notifications
-- Cột này cần đủ lớn để chứa các giá trị như 'Class', 'Exam', 'Msg', 'Notification', etc.

-- Kiểm tra và sửa cột related_type
SET @dbname = DATABASE();
SET @tablename = 'notifications';
SET @columnname = 'related_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  CONCAT('ALTER TABLE ', @tablename, ' MODIFY COLUMN ', @columnname, ' VARCHAR(50) NULL COMMENT ''Loại đối tượng liên quan (Class, Exam, Msg, etc.)'''),
  'SELECT 1'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;











