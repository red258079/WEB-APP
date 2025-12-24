const bcrypt = require('bcrypt');

const password = '258079a';
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Lỗi tạo hash:', err);
    return;
  }
  console.log('New password hash:', hash);
});