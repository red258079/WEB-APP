exports.getNotifications = async (req, res) => {
  const userId = req.user.id || req.user.user_id;

  try {
    const [notifications] = await req.db.query(
      `SELECT 
        notification_id,
        user_id,
        content,
        type,
        related_id,
        related_type,
        COALESCE(is_read, 0) as is_read,
        created_at
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi lấy danh sách thông báo', details: error.message });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user.id;

  try {
    const [result] = await req.db.query(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Thông báo không tồn tại hoặc không thuộc về bạn' });
    }
    res.json({ message: 'Đánh dấu thông báo đã đọc' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi đánh dấu thông báo', details: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  const userId = req.user.id || req.user.user_id;

  try {
    await req.db.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND (is_read = 0 OR is_read IS NULL)',
      [userId]
    );
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi đánh dấu thông báo', details: error.message });
  }
};

// Gửi thông báo cho học sinh (chỉ giáo viên)
exports.sendNotification = async (req, res) => {
  const { recipient_id, title, content, type, priority } = req.body;
  const teacherId = req.user.id || req.user.user_id;

  // Validate
  if (!recipient_id || !content) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin bắt buộc: recipient_id và content' 
    });
  }

  // Kiểm tra recipient_id có tồn tại và là học sinh không
  try {
    const [recipient] = await req.db.query(
      'SELECT user_id, role, full_name FROM users WHERE user_id = ?',
      [recipient_id]
    );

    if (recipient.length === 0) {
      return res.status(404).json({ error: 'Người nhận không tồn tại' });
    }

    if (recipient[0].role && recipient[0].role.toLowerCase() !== 'student') {
      return res.status(403).json({ 
        error: 'Chỉ có thể gửi thông báo cho học sinh' 
      });
    }

    // Tạo nội dung thông báo (kết hợp title và content nếu có)
    const notificationContent = title 
      ? `${title}\n\n${content}` 
      : content;

    // Sử dụng helper createNotification
    const { createNotification } = require('../routes/shared/helpers');
    
    try {
      await createNotification(
        req.db,
        req.io,
        recipient_id,
        notificationContent,
        type || 'Info',
        null, // related_id (có thể để null hoặc thêm sau)
        null // related_type - tạm thời dùng NULL để tránh lỗi truncate, sẽ sửa sau khi chạy migration
      );

      console.log(`✅ [Notification] Teacher ${teacherId} sent notification to student ${recipient_id}`);

      res.json({ 
        success: true,
        message: `Đã gửi thông báo đến ${recipient[0].full_name || 'học sinh'}`,
        recipient_id,
        recipient_name: recipient[0].full_name
      });
    } catch (notifError) {
      // Nếu lỗi khi tạo notification, vẫn log nhưng không throw
      console.error('❌ [Notification] Lỗi khi tạo notification:', notifError);
      // Vẫn trả về success vì có thể notification đã được tạo nhưng có warning
      // Hoặc có thể throw error để client biết
      throw notifError;
    }
  } catch (error) {
    console.error('❌ [Notification] Lỗi gửi thông báo:', error);
    res.status(500).json({ 
      error: 'Lỗi gửi thông báo', 
      details: error.message 
    });
  }
};