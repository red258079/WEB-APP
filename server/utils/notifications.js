// /server/utils/notifications.js
const createNotification = async (db, io, userId, content, type, relatedId, relatedType) => {
  try {
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, content, type, related_id, related_type) VALUES (?, ?, ?, ?, ?)',
      [userId, content, type, relatedId, relatedType]
    );
    io.to(`user_${userId}`).emit('notification', {
      notification_id: result.insertId,
      content,
      type,
      related_id: relatedId,
      related_type: relatedType,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lỗi tạo thông báo:', error);
  }
};

module.exports = { createNotification };