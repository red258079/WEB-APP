const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const authMiddleware = require('../../middleware/auth');
const roleMiddleware = require('../../middleware/role');

console.log('📚 Materials routes module loaded');

// ============================================
// QUAN TRỌNG: Route download phải đứng ĐẦU TIÊN
// ============================================

// Middleware để log tất cả request đến materials routes
router.use('/materials', (req, res, next) => {
  console.log('🔍 [MATERIALS] Request to materials:', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    params: req.params
  });
  next();
});

// Test route không cần auth để kiểm tra routing
router.get('/materials/test-route', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ message: 'Route is working!', path: req.path });
});

// GET /api/teacher/materials/:materialId/download - Download tài liệu
// QUAN TRỌNG: Route này phải match với /api/teacher/materials/:materialId/download
router.get('/materials/:materialId/download', (req, res, next) => {
  console.log('🔵 [MATERIALS DOWNLOAD] Route matched!', {
    path: req.path,
    url: req.url,
    method: req.method,
    params: req.params,
    headers: req.headers.authorization ? 'Has auth header' : 'No auth header'
  });
  next();
}, authMiddleware, (req, res, next) => {
  console.log('🔵 [MATERIALS DOWNLOAD] After auth middleware', {
    user: req.user ? { id: req.user.id, role: req.user.role } : 'No user'
  });
  next();
}, roleMiddleware(['teacher', 'student']), async (req, res) => {
  const { materialId } = req.params;
  const userId = req.user.id || req.user.user_id;
  const role = req.user.role;

  console.log('📥 [MATERIALS DOWNLOAD] Request received:', { 
    materialId, 
    userId, 
    role,
    path: req.path,
    url: req.url,
    method: req.method
  });

  try {
    // Lấy thông tin tài liệu
    const [materials] = await req.db.query(
      `SELECT m.*, c.class_id, c.teacher_id
       FROM materials m
       JOIN classes c ON m.class_id = c.class_id
       WHERE m.material_id = ?`,
      [materialId]
    );

    if (materials.length === 0) {
      console.log('❌ Material not found:', materialId);
      return res.status(404).json({ error: 'Không tìm thấy tài liệu' });
    }

    const material = materials[0];
    console.log('✅ Material found:', { 
      material_id: material.material_id, 
      file_path: material.file_path,
      file_name: material.file_name
    });

    // Kiểm tra quyền truy cập
    if (role === 'teacher' && material.teacher_id !== userId) {
      console.log('❌ Teacher permission denied');
      return res.status(403).json({ error: 'Bạn không có quyền truy cập tài liệu này' });
    }

    if (role === 'student') {
      // Kiểm tra học sinh có trong lớp không
      const [student] = await req.db.query(
        'SELECT student_id FROM class_students WHERE class_id = ? AND student_id = ?',
        [material.class_id, userId]
      );

      if (student.length === 0) {
        console.log('❌ Student permission denied');
        return res.status(403).json({ error: 'Bạn không có quyền truy cập tài liệu này' });
      }
    }

    // Kiểm tra file tồn tại
    const fs = require('fs');
    if (!fs.existsSync(material.file_path)) {
      console.log('❌ File not found:', material.file_path);
      return res.status(404).json({ error: 'File không tồn tại' });
    }

    console.log('✅ Sending file:', material.file_name);
    // Gửi file
    res.download(material.file_path, material.file_name);
  } catch (err) {
    console.error('❌ Lỗi download tài liệu:', err);
    res.status(500).json({ error: 'Lỗi server', details: err.message });
  }
});

// Test route để kiểm tra routing
router.get('/materials/test', (req, res) => {
  res.json({ message: 'Materials route is working!', path: req.path });
});

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/materials');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `material-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file PDF, Word, Excel, PowerPoint hoặc Text'));
    }
  }
});


// GET /api/teacher/classes/:classId/materials - Lấy danh sách tài liệu của lớp
router.get('/classes/:classId/materials', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { classId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền truy cập lớp
    const [classCheck] = await req.db.query(
      'SELECT class_id FROM classes WHERE class_id = ? AND teacher_id = ?',
      [classId, teacherId]
    );

    if (classCheck.length === 0) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập lớp này' });
    }

    // Lấy danh sách tài liệu
    const [materials] = await req.db.query(
      `SELECT 
        m.material_id,
        m.title,
        m.description,
        m.file_name,
        m.file_path,
        m.file_type,
        m.file_size,
        m.upload_date,
        COUNT(DISTINCT qm.question_id) as linked_questions_count
      FROM materials m
      LEFT JOIN question_materials qm ON m.material_id = qm.material_id
      WHERE m.class_id = ?
      GROUP BY m.material_id
      ORDER BY m.upload_date DESC`,
      [classId]
    );

    res.json(materials);
  } catch (err) {
    console.error('Lỗi lấy danh sách tài liệu:', err);
    res.status(500).json({ error: 'Lỗi server', details: err.message });
  }
});

// POST /api/teacher/classes/:classId/materials - Upload tài liệu mới
router.post('/classes/:classId/materials', authMiddleware, roleMiddleware(['teacher']), (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // Xử lý lỗi từ multer
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File quá lớn! Tối đa 50MB' });
      }
      // Lỗi từ fileFilter hoặc multer khác
      return res.status(400).json({ error: err.message || 'Lỗi upload file' });
    }
    next();
  });
}, async (req, res) => {
  const { classId } = req.params;
  const teacherId = req.user.id || req.user.user_id;
  const { title, description } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng chọn file để upload' });
    }

    if (!title || !title.trim()) {
      // Xóa file đã upload nếu thiếu title
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề tài liệu' });
    }

    // Kiểm tra quyền truy cập lớp
    const [classCheck] = await req.db.query(
      'SELECT class_id FROM classes WHERE class_id = ? AND teacher_id = ?',
      [classId, teacherId]
    );

    if (classCheck.length === 0) {
      // Xóa file đã upload nếu không có quyền
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({ error: 'Bạn không có quyền truy cập lớp này' });
    }

    // Lưu thông tin tài liệu vào database
    const [result] = await req.db.query(
      `INSERT INTO materials (class_id, teacher_id, title, description, file_name, file_path, file_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        classId,
        teacherId,
        title.trim(),
        description ? description.trim() : null,
        req.file.originalname,
        req.file.path,
        path.extname(req.file.originalname).toLowerCase(),
        req.file.size
      ]
    );

    res.json({
      success: true,
      material: {
        material_id: result.insertId,
        title: title.trim(),
        description: description ? description.trim() : null,
        file_name: req.file.originalname,
        file_type: path.extname(req.file.originalname).toLowerCase(),
        file_size: req.file.size
      }
    });
  } catch (err) {
    console.error('Lỗi upload tài liệu:', err);
    // Xóa file nếu có lỗi
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Lỗi server', details: err.message });
  }
});

// DELETE /api/teacher/materials/:materialId - Xóa tài liệu
router.delete('/materials/:materialId', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { materialId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền sở hữu
    const [material] = await req.db.query(
      'SELECT file_path FROM materials WHERE material_id = ? AND teacher_id = ?',
      [materialId, teacherId]
    );

    if (material.length === 0) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa tài liệu này' });
    }

    // Xóa file vật lý
    try {
      await fs.unlink(material[0].file_path);
    } catch (fileError) {
      console.warn('Không thể xóa file:', fileError.message);
    }

    // Xóa khỏi database (cascade sẽ xóa các liên kết trong question_materials)
    await req.db.query('DELETE FROM materials WHERE material_id = ?', [materialId]);

    res.json({ success: true, message: 'Xóa tài liệu thành công' });
  } catch (err) {
    console.error('Lỗi xóa tài liệu:', err);
    res.status(500).json({ error: 'Lỗi server', details: err.message });
  }
});

// POST /api/teacher/questions/:questionId/materials/:materialId - Liên kết tài liệu với câu hỏi
router.post('/questions/:questionId/materials/:materialId', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { questionId, materialId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền sở hữu câu hỏi và tài liệu
    const [question] = await req.db.query(
      'SELECT question_id FROM question_bank WHERE question_id = ? AND teacher_id = ?',
      [questionId, teacherId]
    );

    const [material] = await req.db.query(
      'SELECT material_id FROM materials WHERE material_id = ? AND teacher_id = ?',
      [materialId, teacherId]
    );

    if (question.length === 0 || material.length === 0) {
      return res.status(403).json({ error: 'Bạn không có quyền liên kết tài liệu này' });
    }

    // Tạo liên kết
    await req.db.query(
      `INSERT INTO question_materials (question_id, material_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE question_id = question_id`,
      [questionId, materialId]
    );

    res.json({ success: true, message: 'Liên kết tài liệu thành công' });
  } catch (err) {
    console.error('Lỗi liên kết tài liệu:', err);
    res.status(500).json({ error: 'Lỗi server', details: err.message });
  }
});

// DELETE /api/teacher/questions/:questionId/materials/:materialId - Hủy liên kết tài liệu với câu hỏi
router.delete('/questions/:questionId/materials/:materialId', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { questionId, materialId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền
    const [question] = await req.db.query(
      'SELECT question_id FROM question_bank WHERE question_id = ? AND teacher_id = ?',
      [questionId, teacherId]
    );

    if (question.length === 0) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
    }

    // Xóa liên kết
    await req.db.query(
      'DELETE FROM question_materials WHERE question_id = ? AND material_id = ?',
      [questionId, materialId]
    );

    res.json({ success: true, message: 'Hủy liên kết tài liệu thành công' });
  } catch (err) {
    console.error('Lỗi hủy liên kết tài liệu:', err);
    res.status(500).json({ error: 'Lỗi server', details: err.message });
  }
});

// GET /api/teacher/questions/:questionId/materials - Lấy danh sách tài liệu liên kết với câu hỏi
router.get('/questions/:questionId/materials', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  const { questionId } = req.params;
  const teacherId = req.user.id || req.user.user_id;

  try {
    // Kiểm tra quyền
    const [question] = await req.db.query(
      'SELECT question_id FROM question_bank WHERE question_id = ? AND teacher_id = ?',
      [questionId, teacherId]
    );

    if (question.length === 0) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập câu hỏi này' });
    }

    // Lấy danh sách tài liệu liên kết
    const [materials] = await req.db.query(
      `SELECT 
        m.material_id,
        m.title,
        m.description,
        m.file_name,
        m.file_type,
        m.file_size,
        m.upload_date
      FROM materials m
      JOIN question_materials qm ON m.material_id = qm.material_id
      WHERE qm.question_id = ?
      ORDER BY m.upload_date DESC`,
      [questionId]
    );

    res.json(materials);
  } catch (err) {
    console.error('Lỗi lấy tài liệu liên kết:', err);
    res.status(500).json({ error: 'Lỗi server', details: err.message });
  }
});

module.exports = router;

