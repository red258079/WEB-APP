const express = require('express');
const router = express.Router();
const submissionController = require('../../controllers/submissionController');
const authMiddleware = require('../../middleware/auth');

router.post('/:examId/submit', authMiddleware, submissionController.submitExam);

module.exports = router;