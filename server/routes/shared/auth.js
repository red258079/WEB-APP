const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const emailService = require('../../services/emailService');
const { OAuth2Client } = require('google-auth-library');
const router = express.Router();

// Khởi tạo Google OAuth Client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID || '1028134720370-jgqmf3pg0p25vjgmhtgj9a4q2rid4t4e.apps.googleusercontent.com',
  process.env.GOOGLE_CLIENT_SECRET || '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'
);

// ============================================
// RATE LIMITING cho OTP
// ============================================
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Tối đa 5 requests
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút!'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Tạo OTP 6 số
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate email
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ============================================
// EXISTING ROUTES - Register & Login
// ============================================

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const db = req.db;
    const { username, email, password, role, full_name } = req.body;

    // Kiểm tra dữ liệu
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'Thiếu dữ liệu!' });
    }

    // Kiểm tra email đã tồn tại
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ message: 'Email đã được sử dụng!' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await db.query(
      'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, full_name || username, role]
    );

    // Lấy user vừa tạo
    const [newUser] = await db.query(
      'SELECT user_id, username, email, full_name, role FROM users WHERE email = ?', 
      [email]
    );
    
    res.status(201).json({ 
      message: 'Đăng ký thành công!', 
      user: newUser[0] 
    });
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server!', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    console.log('Request body:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email và password!' });
    }

    // Lấy user
    const [users] = await req.db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email không tồn tại!' });
    }

    const user = users[0];
    
    console.log('User found:', {
      user_id: user.user_id,
      email: user.email,
      hasPassword: !!user.password_hash
    });

    // Kiểm tra password_hash
    if (!user.password_hash) {
      console.error('❌ Password hash is NULL for user:', user.email);
      return res.status(500).json({ error: 'Tài khoản chưa có mật khẩu!' });
    }

    // So sánh password
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Mật khẩu không đúng!' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      message: 'Đăng nhập thành công!', 
      token, 
      role: user.role 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi server!', details: err.message });
  }
});

// ============================================
// NEW ROUTES - Forgot Password with OTP
// ============================================

// 1️⃣ POST /api/auth/forgot-password - Gửi OTP
router.post('/forgot-password', otpLimiter, async (req, res) => {
  try {
    const db = req.db;
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email không hợp lệ'
      });
    }

    // Kiểm tra user tồn tại
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email không tồn tại trong hệ thống'
      });
    }

    // Xóa tất cả OTP cũ của email này
    await db.query('DELETE FROM otps WHERE email = ?', [email]);

    // Tạo OTP mới
    const otp = generateOTP();
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    await db.query(
      'INSERT INTO otps (id, email, otp, expiresAt, verified, attempts) VALUES (?, ?, ?, ?, 0, 0)',
      [id, email, otp, expiresAt]
    );

    // Gửi email
    try {
      await emailService.sendOTP(email, otp);
      
      // Log (chỉ để dev)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 OTP sent to ${email}: ${otp}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!',
        expiresIn: 300
      });
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
      return res.status(500).json({
        success: false,
        message: emailError.message || 'Không thể gửi email. Vui lòng kiểm tra cấu hình email server hoặc thử lại sau!'
      });
    }

  } catch (error) {
    console.error('❌ Error in forgot-password:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi gửi OTP. Vui lòng thử lại!'
    });
  }
});

// 2️⃣ POST /api/auth/verify-otp - Xác thực OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const db = req.db;
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ email và mã OTP'
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP phải là 6 chữ số'
      });
    }

    // Tìm OTP chưa verify
    const [otps] = await db.query(
      'SELECT * FROM otps WHERE email = ? AND verified = 0 ORDER BY createdAt DESC LIMIT 1',
      [email]
    );

    if (otps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy yêu cầu OTP. Vui lòng gửi lại OTP!'
      });
    }

    const otpRecord = otps[0];

    // Kiểm tra hết hạn
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await db.query('DELETE FROM otps WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng gửi lại mã mới!'
      });
    }

    // Kiểm tra số lần thử
    if (otpRecord.attempts >= 5) {
      await db.query('DELETE FROM otps WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({
        success: false,
        message: 'Bạn đã nhập sai quá nhiều lần. Vui lòng gửi lại OTP mới!'
      });
    }

    // Kiểm tra OTP đúng không
    if (otpRecord.otp !== otp) {
      await db.query(
        'UPDATE otps SET attempts = attempts + 1 WHERE id = ?',
        [otpRecord.id]
      );
      
      return res.status(400).json({
        success: false,
        message: `Mã OTP không chính xác. Còn ${5 - otpRecord.attempts - 1} lần thử.`
      });
    }

    // OTP đúng - đánh dấu đã verify
    await db.query('UPDATE otps SET verified = 1 WHERE id = ?', [otpRecord.id]);

    console.log(`✅ OTP verified for ${email}`);

    return res.status(200).json({
      success: true,
      message: 'Xác thực OTP thành công!',
      token: otpRecord.id
    });

  } catch (error) {
    console.error('❌ Error in verify-otp:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xác thực OTP'
    });
  }
});

// 3️⃣ POST /api/auth/reset-password - Đặt mật khẩu mới
router.post('/reset-password', async (req, res) => {
  try {
    const db = req.db;
    const { token, newPassword } = req.body;

    // Validation
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    // Tìm OTP đã verified
    const [otps] = await db.query(
      'SELECT * FROM otps WHERE id = ? AND verified = 1',
      [token]
    );

    if (otps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã được sử dụng'
      });
    }

    const otpRecord = otps[0];

    // Kiểm tra token còn hiệu lực (10 phút từ khi tạo)
    const tenMinutesLater = new Date(new Date(otpRecord.createdAt).getTime() + 10 * 60 * 1000);
    if (new Date() > tenMinutesLater) {
      await db.query('DELETE FROM otps WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({
        success: false,
        message: 'Token đã hết hạn. Vui lòng thực hiện lại từ đầu!'
      });
    }

    // Tìm user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [otpRecord.email]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    const user = users[0];

    // Hash và cập nhật mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [hashedPassword, user.user_id]
    );

    // Xóa OTP đã sử dụng
    await db.query('DELETE FROM otps WHERE id = ?', [otpRecord.id]);

    console.log(`🔑 Password reset successfully for ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.'
    });

  } catch (error) {
    console.error('❌ Error in reset-password:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi đặt lại mật khẩu'
    });
  }
});

// 4️⃣ POST /api/auth/resend-otp - Gửi lại OTP
router.post('/resend-otp', otpLimiter, async (req, res) => {
  try {
    const db = req.db;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email'
      });
    }

    // Kiểm tra user tồn tại
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email không tồn tại trong hệ thống'
      });
    }

    // Xóa OTP cũ
    await db.query('DELETE FROM otps WHERE email = ?', [email]);

    // Tạo OTP mới
    const otp = generateOTP();
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      'INSERT INTO otps (id, email, otp, expiresAt, verified, attempts) VALUES (?, ?, ?, ?, 0, 0)',
      [id, email, otp, expiresAt]
    );

    // Gửi email
    try {
      await emailService.sendOTP(email, otp);

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 OTP resent to ${email}: ${otp}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Mã OTP mới đã được gửi đến email của bạn'
      });
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
      return res.status(500).json({
        success: false,
        message: emailError.message || 'Không thể gửi email. Vui lòng kiểm tra cấu hình email server hoặc thử lại sau!'
      });
    }

  } catch (error) {
    console.error('❌ Error in resend-otp:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi gửi lại OTP'
    });
  }
});

// ============================================
// GOOGLE OAUTH ROUTES
// ============================================

// POST /api/auth/google - Xử lý đăng nhập Google
router.post('/google', async (req, res) => {
  try {
    const db = req.db;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu Google token!'
      });
    }

    // Xác thực token với Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID || '1028134720370-jgqmf3pg0p25vjgmhtgj9a4q2rid4t4e.apps.googleusercontent.com'
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Không thể lấy email từ Google!'
      });
    }

    // Kiểm tra user đã tồn tại chưa (theo email HOẶC google_id)
    let [usersByEmail] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    let [usersByGoogleId] = await db.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
    
    let user = null;
    
    // Ưu tiên tìm theo google_id (nếu đã liên kết Google trước đó)
    if (usersByGoogleId.length > 0) {
      user = usersByGoogleId[0];
      console.log(`🔍 Tìm thấy user theo google_id: ${email}, role: ${user.role}`);
    } 
    // Nếu không tìm thấy theo google_id, tìm theo email
    else if (usersByEmail.length > 0) {
      user = usersByEmail[0];
      console.log(`🔍 Tìm thấy user theo email: ${email}, role: ${user.role}, google_id: ${user.google_id || 'NULL'}`);
    }

    // Nếu không tìm thấy user nào → User mới, cần chọn role
    if (!user) {
      console.log(`🆕 User mới từ Google: ${email} - Yêu cầu chọn role`);
      return res.json({
        success: false,
        needsRoleSelection: true,
        message: 'Vui lòng chọn vai trò của bạn',
        userInfo: {
          email,
          name: name || email.split('@')[0],
          picture,
          googleId
        }
      });
    }
    
    // User đã tồn tại - cập nhật google_id nếu chưa có
    try {
      if (!user.google_id) {
        await db.query('UPDATE users SET google_id = ? WHERE user_id = ?', [googleId, user.user_id]);
        console.log(`✅ Đã cập nhật google_id cho user: ${email}`);
      }
    } catch (err) {
      // Bỏ qua lỗi nếu cột google_id chưa tồn tại
      if (err.code === 'ER_BAD_FIELD_ERROR' && err.message.includes('google_id')) {
        console.warn('⚠️ Cột google_id chưa tồn tại. Vui lòng chạy migration add_google_id_to_users.sql');
      } else {
        throw err;
      }
    }
    
    console.log(`✅ Đăng nhập Google thành công: ${email}, role: ${user.role}`);

    // Tạo JWT token
    const jwtToken = jwt.sign(
      { id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      success: true,
      message: 'Đăng nhập Google thành công!',
      token: jwtToken,
      role: user.role,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name
      }
    });

  } catch (error) {
    console.error('❌ Error in Google OAuth:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi xác thực Google!',
      details: error.message
    });
  }
});

// POST /api/auth/google/complete - Hoàn tất đăng ký Google với role đã chọn
router.post('/google/complete', async (req, res) => {
  try {
    const db = req.db;
    const { token, role, fullName, username } = req.body;

    if (!token || !role) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu token hoặc role!'
      });
    }

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role không hợp lệ! Chỉ chấp nhận student hoặc teacher'
      });
    }

    // Xác thực token với Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID || '1028134720370-jgqmf3pg0p25vjgmhtgj9a4q2rid4t4e.apps.googleusercontent.com'
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Không thể lấy email từ Google!'
      });
    }

    // Kiểm tra user đã tồn tại chưa
    let [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email đã được sử dụng!'
      });
    }

    // Sử dụng thông tin từ form hoặc từ Google
    const finalFullName = fullName || name || email.split('@')[0];
    const finalUsername = username || email.split('@')[0] + '_' + Date.now().toString().slice(-6);
    
    // Kiểm tra username đã tồn tại chưa
    const [existingUsername] = await db.query('SELECT * FROM users WHERE username = ?', [finalUsername]);
    if (existingUsername.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Tên đăng nhập đã được sử dụng! Vui lòng chọn tên khác.'
      });
    }
    
    try {
      // Tạo user với password_hash = NULL (đăng nhập bằng Google)
      await db.query(
        'INSERT INTO users (username, email, password_hash, full_name, role, google_id) VALUES (?, ?, NULL, ?, ?, ?)',
        [finalUsername, email, finalFullName, role, googleId]
      );
    } catch (err) {
      // Nếu lỗi do password_hash không thể NULL, tạo password hash mặc định
      if (err.code === 'ER_BAD_NULL_ERROR' && err.message.includes('password_hash')) {
        console.warn('⚠️ password_hash không thể NULL. Tạo password hash mặc định.');
        // Tạo password hash ngẫu nhiên (user sẽ không dùng password này)
        const crypto = require('crypto');
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        try {
          await db.query(
            'INSERT INTO users (username, email, password_hash, full_name, role, google_id) VALUES (?, ?, ?, ?, ?, ?)',
            [finalUsername, email, hashedPassword, finalFullName, role, googleId]
          );
        } catch (err2) {
          // Nếu cột google_id chưa tồn tại
          if (err2.code === 'ER_BAD_FIELD_ERROR' && err2.message.includes('google_id')) {
            console.warn('⚠️ Cột google_id chưa tồn tại. Tạo user không có google_id.');
            await db.query(
              'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
              [finalUsername, email, hashedPassword, finalFullName, role]
            );
          } else {
            throw err2;
          }
        }
      } else if (err.code === 'ER_BAD_FIELD_ERROR' && err.message.includes('google_id')) {
        console.warn('⚠️ Cột google_id chưa tồn tại. Tạo user không có google_id.');
        // Tạo password hash mặc định
        const crypto = require('crypto');
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        await db.query(
          'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
          [finalUsername, email, hashedPassword, finalFullName, role]
        );
      } else {
        throw err;
      }
    }

    // Lấy user vừa tạo
    [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    
    console.log(`✅ Tạo tài khoản mới từ Google với role ${role}: ${email}`);

    // Tạo JWT token
    const jwtToken = jwt.sign(
      { id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      success: true,
      message: 'Đăng ký Google thành công!',
      token: jwtToken,
      role: user.role,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name
      }
    });

  } catch (error) {
    console.error('❌ Error in Google OAuth Complete:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi hoàn tất đăng ký Google!',
      details: error.message
    });
  }
});

module.exports = router;