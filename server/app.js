const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');

// Load environment variables FIRST
dotenv.config();

// Import email service
const emailService = require('./services/emailService');

// Shared routes
const authRoutes = require('./routes/shared/auth');
const userRoutes = require('./routes/shared/user');
const sharedClassesRoutes = require('./routes/shared/classes');
const complaintRoutes = require('./routes/shared/complaints');
const notificationRoutes = require('./routes/shared/notifications');
const aiRoutes = require('./routes/shared/ai');

// Teacher routes
const teacherClassesRoutes = require('./routes/teacher/classes');
const teacherExamRoutes = require('./routes/teacher/exams');
const teacherCheatingRoutes = require('./routes/teacher/cheating');
const gradingRoutes = require('./routes/teacher/grading');
const teacherStatisticsRoutes = require('./routes/teacher/statistics');
const teacherMonitoringRoutes = require('./routes/teacher/monitoring');
const teacherQuestionAnalysisRoutes = require('./routes/teacher/questionAnalysis');
const teacherMaterialsRoutes = require('./routes/teacher/materials');

// Student routes
const studentClassesRoutes = require('./routes/student/classes');
const studentExamRoutes = require('./routes/student/exams');
const submissionRoutes = require('./routes/student/submissions');
const studentStatisticsRoutes = require('./routes/student/statistics');

// Admin routes
const adminRoutes = require('./routes/admin/admin');


// App configuration
const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Tạo HTTP server cho Socket.IO
const server = http.createServer(app);

// Cấu hình CORS
const corsOptions = {
  origin: isProduction
    ? process.env.FRONTEND_URL || 'http://localhost:3000'
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Khởi tạo Socket.IO với xác thực
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware xác thực Socket.IO
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Xử lý Socket.IO events
io.on('connection', (socket) => {
  const userId = socket.user.id || socket.user.user_id;
  console.log(`✅ Client connected: ${socket.id}, User ID: ${userId}`);
  console.log(`🔵 [Socket] User object:`, socket.user);

  socket.join(`user_${userId}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room: ${roomId}`);
  });

  socket.on('student-submit', (data) => {
    console.log('Student submitted:', data);
    const userId = socket.user.id || socket.user.user_id;
    io.to(data.classId).emit('new-submission', {
      ...data,
      submittedBy: userId,
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(` Client disconnected: ${socket.id}, Reason: ${reason}`);
  });
});

// Gắn Socket.IO vào app.locals
app.locals.io = io;

// Cấu hình middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware để bỏ qua ngrok warning page
app.use((req, res, next) => {
  // Thêm header để bỏ qua ngrok warning
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Serve static files từ client/public
app.use('/client/public', express.static(path.join(__dirname, '../client/public')));

// Serve các trang HTML từ client/src/pages
app.use('/client/src/pages', express.static(path.join(__dirname, '../client/src/pages')));

// Serve file index.html và các file khác từ client
app.use('/client', express.static(path.join(__dirname, '../client')));

// Route để serve trang login
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/src/pages/login.html'));
});

// Route để serve trang register
app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/src/pages/register.html'));
});

// Route để serve trang forgot-password
app.get('/forgot-password.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/src/pages/forgot_password.html'));
});

// Route để serve trang chủ (index.html)
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Route root - serve trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Tạo MySQL connection pool
// Debug log để kiểm tra biến môi trường (xem có bị dư khoảng trắng không)
console.log('🔌 DB Config Check:', {
  host: `"${process.env.DB_HOST}"`,
  port: `"${process.env.DB_PORT}"`,
  user: `"${process.env.DB_USER}"`,
  database: `"${process.env.DB_NAME}"`
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306, // Thêm dòng này vào connection pool
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'edexis',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Aiven yêu cầu SSL
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Tạm thời tắt check chứng chỉ để tránh lỗi handshake
  } : undefined
});

// Test database connection
pool.getConnection()
  .then(conn => {
    console.log(' Database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error(' Database connection failed:', err.message);
  });

app.locals.pool = pool;

// Middleware để truyền db và io
app.use((req, res, next) => {
  req.db = app.locals.pool;
  req.io = app.locals.io;
  next();
});

// Test email service khi khởi động
emailService.testConnection().then(isReady => {
  if (!isReady) {
    console.warn('⚠️  Email service chưa sẵn sàng. Kiểm tra lại cấu hình EMAIL trong .env!');
  }
});


// Route kiểm tra server và database
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT 1');
    res.json({ message: 'Backend working!', dbCheck: rows });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});


// Shared routes 
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/classes', sharedClassesRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);

// Teacher routes
app.use('/api/teacher/classes', teacherClassesRoutes);
app.use('/api/teacher/exams', teacherExamRoutes);
app.use('/api/teacher/cheating', teacherCheatingRoutes);
app.use('/api/teacher/grading', gradingRoutes);
app.use('/api/teacher/statistics', teacherStatisticsRoutes);
app.use('/api/teacher/monitoring', teacherMonitoringRoutes);
// QUAN TRỌNG: teacherMaterialsRoutes phải đứng TRƯỚC teacherQuestionAnalysisRoutes
// để route /materials/:materialId/download được match trước

// Middleware để log tất cả request đến /api/teacher/materials
app.use('/api/teacher/materials', (req, res, next) => {
  console.log('🌐 [APP LEVEL] Request to /api/teacher/materials:', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl
  });
  next();
});

app.use('/api/teacher', teacherMaterialsRoutes);
app.use('/api/teacher', teacherQuestionAnalysisRoutes);

// Student routes
app.use('/api/student/classes', studentClassesRoutes);
app.use('/api/student/exams', studentExamRoutes);
app.use('/api/student/submissions', submissionRoutes);
app.use('/api/student/statistics', studentStatisticsRoutes);
app.use('/api/student/practice', require('./routes/student/practice'));

// Admin routes
app.use('/api/admin', adminRoutes);

// 404 handler 
app.use((req, res, next) => {
  console.log(` 404 - Route not found: ${req.method} ${req.path}`);
  // Trả về JSON thay vì HTML
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(' Error stack:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    details: isProduction ? undefined : err.message,
  });
});

// Cleanup OTP hết hạn mỗi giờ
setInterval(async () => {
  try {
    const [result] = await pool.query('DELETE FROM otps WHERE expiresAt < NOW()');
    if (result.affectedRows > 0) {
      console.log(`🧹 Đã xóa ${result.affectedRows} OTP hết hạn`);
    }
  } catch (error) {
    console.error(' Lỗi khi xóa OTP:', error.message);
  }
}, 60 * 60 * 1000); // Mỗi 1 giờ

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(` Backend running at http://0.0.0.0:${port}`);
  console.log(` Socket.IO ready`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Forgot password page: http://localhost:${port}/forgot-password`);
});