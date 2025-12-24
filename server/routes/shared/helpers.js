// server/routes/shared/helpers.js
const createNotification = async (db, io, userId, content, type, relatedId, relatedType) => {
  try {
    console.log('🔵 [Notification] Creating notification for user:', userId);
    console.log('🔵 [Notification] Content:', content);
    console.log('🔵 [Notification] Related type:', relatedType);
    
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, content, type, related_id, related_type) VALUES (?, ?, ?, ?, ?)',
      [userId, content, type, relatedId, relatedType]
    );
    
    if (!result || !result.insertId) {
      throw new Error('Không thể tạo notification - không có insertId');
    }
    
    const notificationData = {
      notification_id: result.insertId,
      content,
      type,
      related_id: relatedId,
      related_type: relatedType,
      created_at: new Date().toISOString(),
      is_read: 0
    };
    
    const roomId = `user_${userId}`;
    console.log('🔵 [Notification] Emitting to room:', roomId);
    console.log('🔵 [Notification] Data:', notificationData);
    
    // Emit notification qua socket (nếu có io)
    if (io) {
      io.to(roomId).emit('notification', notificationData);
      
      // Log số lượng sockets trong room (cần await vì fetchSockets là async)
      const socketsInRoom = await io.in(roomId).fetchSockets();
      console.log(`📊 [Notification] Sockets in room ${roomId}:`, socketsInRoom.length);
      
      if (socketsInRoom.length === 0) {
        console.warn(`⚠️ [Notification] No sockets found in room ${roomId}! User might not be connected. Notification saved to DB but not delivered in real-time.`);
      }
    } else {
      console.warn('⚠️ [Notification] Socket.io not available, notification saved to DB only');
    }
    
    console.log('✅ [Notification] Notification created and emitted');
    return { success: true, notification_id: result.insertId };
  } catch (error) {
    console.error('❌ [Notification] Lỗi tạo thông báo:', error);
    console.error('❌ [Notification] Error stack:', error.stack);
    // Throw error để caller biết và xử lý
    throw error;
  }
};

module.exports = { createNotification };