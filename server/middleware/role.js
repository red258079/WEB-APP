// middleware/role.js
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;

      if (!userRole) {
        return res.status(403).json({ 
          error: 'Không xác định được vai trò người dùng' 
        });
      }

      const normalizedRole = userRole.toLowerCase();
      const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

      console.log('🔍 Role check:', {
        userRole,
        normalizedRole,
        allowedRoles: normalizedAllowedRoles
      });

      if (!normalizedAllowedRoles.includes(normalizedRole)) {
        return res.status(403).json({ 
          error: 'Bạn không có quyền truy cập vào tài nguyên này',
          required: allowedRoles,
          current: userRole
        });
      }

      next();
    } catch (error) {
      console.error('❌ Lỗi roleMiddleware:', error);
      return res.status(500).json({ 
        error: 'Lỗi kiểm tra quyền truy cập' 
      });
    }
  };
};

module.exports = roleMiddleware;