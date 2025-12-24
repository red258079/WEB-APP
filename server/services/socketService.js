// server/services/socketService.js
// Service xử lý các sự kiện Socket.IO

/**
 * Gửi thông báo đến một user cụ thể
 * @param {Object} io - Socket.IO instance
 * @param {Number} userId - ID của user nhận thông báo
 * @param {Object} notificationData - Dữ liệu thông báo
 */
const sendNotification = async (io, userId, notificationData) => {
  if (!io || !userId) {
    console.warn('⚠️ [SocketService] io hoặc userId không tồn tại');
    return;
  }

  try {
    const roomId = `user_${userId}`;
    io.to(roomId).emit('notification', notificationData);
    
    // Log số lượng sockets trong room
    const socketsInRoom = await io.in(roomId).fetchSockets();
    console.log(`📊 [SocketService] Sockets in room ${roomId}:`, socketsInRoom.length);
    
    if (socketsInRoom.length === 0) {
      console.warn(`⚠️ [SocketService] No sockets found in room ${roomId}! User might not be connected.`);
    }
  } catch (error) {
    console.error('❌ [SocketService] Lỗi gửi thông báo:', error);
  }
};

/**
 * Emit event đến một user cụ thể
 * @param {Object} io - Socket.IO instance
 * @param {Number} userId - ID của user
 * @param {String} eventName - Tên event
 * @param {Object} data - Dữ liệu gửi kèm
 */
const emitToUser = (io, userId, eventName, data) => {
  if (!io || !userId) {
    console.warn('⚠️ [SocketService] io hoặc userId không tồn tại');
    return;
  }

  try {
    io.to(`user_${userId}`).emit(eventName, data);
    console.log(`📤 [SocketService] Emitted ${eventName} to user_${userId}`);
  } catch (error) {
    console.error(`❌ [SocketService] Lỗi emit ${eventName}:`, error);
  }
};

/**
 * Emit event đến một room cụ thể
 * @param {Object} io - Socket.IO instance
 * @param {String} roomId - ID của room
 * @param {String} eventName - Tên event
 * @param {Object} data - Dữ liệu gửi kèm
 */
const emitToRoom = (io, roomId, eventName, data) => {
  if (!io || !roomId) {
    console.warn('⚠️ [SocketService] io hoặc roomId không tồn tại');
    return;
  }

  try {
    io.to(roomId).emit(eventName, data);
    console.log(`📤 [SocketService] Emitted ${eventName} to ${roomId}`);
  } catch (error) {
    console.error(`❌ [SocketService] Lỗi emit ${eventName}:`, error);
  }
};

/**
 * Thông báo bài thi đã bị xóa
 * @param {Object} io - Socket.IO instance
 * @param {Number} examId - ID bài thi
 * @param {Number} classId - ID lớp học (optional)
 * @param {Number} teacherId - ID giáo viên
 */
const emitExamDeleted = (io, examId, classId, teacherId) => {
  if (!io) return;

  try {
    // Emit cho lớp học (nếu có)
    if (classId) {
      emitToRoom(io, `class_${classId}`, 'exam_deleted', {
        exam_id: examId,
        class_id: classId
      });
    }

    // Emit cho giáo viên
    if (teacherId) {
      emitToUser(io, teacherId, 'exam_deleted', {
        exam_id: examId,
        class_id: classId || null
      });
    }
  } catch (error) {
    console.error('❌ [SocketService] Lỗi emit exam_deleted:', error);
  }
};

/**
 * Thông báo học sinh bị cấm thi
 * @param {Object} io - Socket.IO instance
 * @param {Number} studentId - ID học sinh
 * @param {Number} examId - ID bài thi
 * @param {String} reason - Lý do cấm
 */
const emitExamBanned = (io, studentId, examId, reason) => {
  if (!io || !studentId) return;

  emitToUser(io, studentId, 'exam_banned', {
    exam_id: examId,
    reason: reason || 'Vi phạm quy định thi'
  });
};

/**
 * Thông báo học sinh bị trừ điểm
 * @param {Object} io - Socket.IO instance
 * @param {Number} studentId - ID học sinh
 * @param {Number} examId - ID bài thi
 * @param {Number} pointsDeducted - Số điểm bị trừ
 * @param {String} reason - Lý do trừ điểm
 */
const emitPointsDeducted = (io, studentId, examId, pointsDeducted, reason) => {
  if (!io || !studentId) return;

  emitToUser(io, studentId, 'points_deducted', {
    exam_id: examId,
    points_deducted: pointsDeducted,
    reason: reason || 'Vi phạm quy định thi'
  });
};

/**
 * Thông báo học sinh bắt đầu làm bài
 * @param {Object} io - Socket.IO instance
 * @param {Number} teacherId - ID giáo viên
 * @param {Number} examId - ID bài thi
 * @param {Number} studentId - ID học sinh
 * @param {Number} attemptId - ID attempt
 * @param {Number} classId - ID lớp học
 */
const emitStudentStartedExam = (io, teacherId, examId, studentId, attemptId, classId) => {
  if (!io || !teacherId) return;

  emitToUser(io, teacherId, 'student_started_exam', {
    exam_id: examId,
    student_id: studentId,
    attempt_id: attemptId,
    class_id: classId
  });
};

/**
 * Thông báo học sinh đã nộp bài
 * @param {Object} io - Socket.IO instance
 * @param {Number} teacherId - ID giáo viên
 * @param {Number} examId - ID bài thi
 * @param {Number} studentId - ID học sinh
 * @param {Number} attemptId - ID attempt
 * @param {Number} score - Điểm số
 * @param {Number} classId - ID lớp học
 */
const emitStudentSubmittedExam = (io, teacherId, examId, studentId, attemptId, score, classId) => {
  if (!io || !teacherId) return;

  emitToUser(io, teacherId, 'student_submitted_exam', {
    exam_id: examId,
    student_id: studentId,
    attempt_id: attemptId,
    score: score,
    class_id: classId
  });
};

/**
 * Thông báo bài thi được cập nhật
 * @param {Object} io - Socket.IO instance
 * @param {Number} examId - ID bài thi
 * @param {Number} classId - ID lớp học (optional)
 */
const emitExamUpdated = (io, examId, classId) => {
  if (!io) return;

  try {
    if (classId) {
      emitToRoom(io, `class_${classId}`, 'exam_updated', {
        exam_id: examId,
        class_id: classId
      });
    }
  } catch (error) {
    console.error('❌ [SocketService] Lỗi emit exam_updated:', error);
  }
};

module.exports = {
  sendNotification,
  emitToUser,
  emitToRoom,
  emitExamDeleted,
  emitExamBanned,
  emitPointsDeducted,
  emitStudentStartedExam,
  emitStudentSubmittedExam,
  emitExamUpdated
};