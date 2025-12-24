const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Đăng ký
exports.register = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "Thiếu dữ liệu!" });
    }

    // kiểm tra user/email
    const [exists] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (exists.length > 0) {
      return res.status(400).json({ message: "Username hoặc email đã tồn tại!" });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, email, password_hash, role, full_name) VALUES (?, ?, ?, ?, ?)",
      [username, email, hash, role, username]
    );

    res.json({ message: "Đăng ký thành công!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({ message: "Thiếu dữ liệu!" });
    }

    let query, value;
    if (email) {
      query = "SELECT * FROM users WHERE email = ?";
      value = email;
    } else {
      query = "SELECT * FROM users WHERE username = ?";
      value = username;
    }

    const [rows] = await pool.query(query, [value]);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Người dùng không tồn tại!" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ message: "Sai mật khẩu!" });

    // tạo JWT token
    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Đăng nhập thành công!",
      token,
      user: { id: user.user_id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};
