const getUserProfile = async (req, res) => {
  try {
    console.log('User ID from token:', req.user.id);
    if (!req.user || !req.user.id) {
      console.log('Invalid user data from token');
      return res.status(400).json({ error: 'Invalid user data from token' });
    }
    const pool = req.app.locals.pool;
    const userId = req.user.id;

    console.log('Querying user with ID:', userId);
    const [userRows] = await pool.execute(
      'SELECT user_id, username, email, full_name, role, phone, dob FROM Users WHERE user_id = ?', // Chỉ lấy cột có trong schema
      [userId]
    );
    console.log('User rows fetched:', userRows);

    if (userRows.length === 0) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];
    const className = null; // Chưa có lớp
    const avgScore = 0.0; // Placeholder
    const rank = 'Chưa có xếp hạng';

    // Định dạng dob chỉ lấy ngày
    const dob = user.dob ? user.dob.toISOString().split('T')[0] : null;

    res.json({
      user: {
        username: user.username,
        id: user.user_id,
        avgScore: avgScore,
        rank: rank,
        class: className || 'Chưa có lớp',
        email: user.email,
        phone: user.phone || null,
        dob: dob, // Chỉ chứa YYYY-MM-DD
        fullName: user.full_name || user.username
      },
      upcomingTests: [],
      myClasses: [],
      availableTests: [],
      myResults: [],
      ranking: { total: 0, students: [] },
      recentComplaints: [],
      notifications: []
    });
  } catch (err) {
    console.error('Error fetching profile:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id;
    const { phone, dob } = req.body;

    if (!phone && !dob) {
      return res.status(400).json({ error: 'Ít nhất một trường phone hoặc dob phải được cung cấp!' });
    }
    if (phone && !/^\d{10,11}$/.test(phone)) {
      return res.status(400).json({ error: 'Số điện thoại không hợp lệ!' });
    }
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return res.status(400).json({ error: 'Định dạng ngày sinh không hợp lệ (YYYY-MM-DD)!' });
    }

    const updateFields = [];
    const values = [];
    if (phone) {
      updateFields.push('phone = ?');
      values.push(phone);
    }
    if (dob) {
      updateFields.push('dob = ?');
      values.push(dob); // Đảm bảo dob là YYYY-MM-DD
    }
    values.push(userId);

    await pool.execute(
      `UPDATE Users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      values
    );

    res.json({ message: 'Cập nhật thông tin thành công!' });
  } catch (err) {
    console.error('Error updating profile:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getUserProfile, updateUserProfile };