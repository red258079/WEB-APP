const express = require('express');
const router = express.Router();
const complaintController = require('../../controllers/complaintController');
const authMiddleware = require('../../middleware/auth');
const roleMiddleware = require('../../middleware/role');

router.post('/', authMiddleware, complaintController.createComplaint);
router.get('/', authMiddleware, complaintController.getComplaints);

module.exports = router;