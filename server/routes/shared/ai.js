// routes/shared/ai.js - API endpoints cho AI preferences, quota và generate exam
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const roleMiddleware = require('../../middleware/role');
const aiService = require('../../services/aiService');
const geminiService = require('../../services/geminiService');

// ============================================
// GET /api/ai/preference - Lấy AI preference của user
// ============================================
router.get('/preference', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    
    const [preference] = await req.db.query(
      `SELECT preferred_model, updated_at 
       FROM user_ai_preferences 
       WHERE user_id = ?`,
      [userId]
    );
    
    res.json({
      model: preference.length > 0 ? preference[0].preferred_model : null,
      updated_at: preference.length > 0 ? preference[0].updated_at : null
    });
  } catch (error) {
    console.error('❌ Error getting AI preference:', error);
    res.status(500).json({ error: 'Lỗi khi lấy preference', details: error.message });
  }
});

// ============================================
// POST /api/ai/preference - Lưu AI preference
// ============================================
router.post('/preference', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { model } = req.body;
    
    if (model && !['groq', 'gemini'].includes(model)) {
      return res.status(400).json({ error: 'Invalid model. Must be "groq" or "gemini"' });
    }
    
    await req.db.query(
      `INSERT INTO user_ai_preferences (user_id, preferred_model, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         preferred_model = VALUES(preferred_model),
         updated_at = NOW()`,
      [userId, model]
    );
    
    res.json({ success: true, message: 'Preference đã được lưu' });
  } catch (error) {
    console.error('❌ Error saving AI preference:', error);
    res.status(500).json({ error: 'Lỗi khi lưu preference', details: error.message });
  }
});

// ============================================
// GET /api/ai/quota - Lấy quota của user (học sinh)
// ============================================
router.get('/quota', authMiddleware, roleMiddleware(['student']), async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Groq quota: 10 lần/ngày
    const [groqCount] = await req.db.query(
      `SELECT COUNT(*) as count 
       FROM ai_usage_logs 
       WHERE user_id = ? 
         AND provider = 'groq'
         AND action_type = 'create_practice_exam'
         AND DATE(created_at) = CURDATE()`,
      [userId]
    );
    
    // Gemini quota: 5 lần/ngày
    const [geminiCount] = await req.db.query(
      `SELECT COUNT(*) as count 
       FROM ai_usage_logs 
       WHERE user_id = ? 
         AND provider = 'gemini'
         AND action_type = 'create_practice_exam'
         AND DATE(created_at) = CURDATE()`,
      [userId]
    );
    
    const groqUsed = groqCount[0].count || 0;
    const geminiUsed = geminiCount[0].count || 0;
    
    res.json({
      groq: {
        used: groqUsed,
        limit: 10,
        remaining: Math.max(0, 10 - groqUsed)
      },
      gemini: {
        used: geminiUsed,
        limit: 5,
        remaining: Math.max(0, 5 - geminiUsed)
      }
    });
  } catch (error) {
    console.error('❌ Error getting quota:', error);
    res.status(500).json({ error: 'Lỗi khi lấy quota', details: error.message });
  }
});

// ============================================
// GET /api/ai/system-quota - Lấy quota hệ thống (admin/teacher)
// ============================================
router.get('/system-quota', authMiddleware, roleMiddleware(['teacher', 'admin']), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Lấy quota cho cả 2 providers
    const [quota] = await req.db.query(
      `SELECT provider, total_requests, limit_requests, total_tokens, limit_tokens
       FROM ai_system_quota
       WHERE date = CURDATE()`,
      []
    );
    
    const groqQuota = quota.find(q => q.provider === 'groq') || {
      provider: 'groq',
      total_requests: 0,
      limit_requests: 100,
      total_tokens: 0,
      limit_tokens: 250000
    };
    
    const geminiQuota = quota.find(q => q.provider === 'gemini') || {
      provider: 'gemini',
      total_requests: 0,
      limit_requests: 100,
      total_tokens: 0,
      limit_tokens: 250000
    };
    
    res.json({
      groq: groqQuota,
      gemini: geminiQuota
    });
  } catch (error) {
    console.error('❌ Error getting system quota:', error);
    res.status(500).json({ error: 'Lỗi khi lấy system quota', details: error.message });
  }
});

// ============================================
// POST /api/ai/test - Test connection với AI provider
// ============================================
router.post('/test', authMiddleware, roleMiddleware(['teacher', 'admin']), async (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider || !['groq', 'gemini'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider. Must be "groq" or "gemini"' });
    }
    
    const result = await aiService.testConnection(provider);
    res.json(result);
  } catch (error) {
    console.error('❌ Error testing AI connection:', error);
    res.status(500).json({ error: 'Lỗi khi test connection', details: error.message });
  }
});

// ============================================
// GET /api/ai/test - Test kết nối với Gemini API (legacy)
// ============================================
router.get('/test', async (req, res) => {
  try {
    const result = await geminiService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Gemini API connection successful',
        response: result.response
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Gemini API connection failed',
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error testing Gemini connection:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing connection',
      error: error.message
    });
  }
});

// ============================================
// POST /api/ai/generate-exam - Tạo đề thi với AI (hỗ trợ Groq và Gemini)
// ============================================
router.post('/generate-exam', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  try {
    const {
      subject,
      topic,
      numQuestions,
      difficulty,
      questionTypes,
      additionalRequirements,
      ai_model = 'groq' // Mặc định Groq
    } = req.body;

    // Validate input
    if (!subject || !topic || !numQuestions || !difficulty || !questionTypes) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subject, topic, numQuestions, difficulty, questionTypes'
      });
    }

    if (!Array.isArray(questionTypes) || questionTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questionTypes must be a non-empty array'
      });
    }

    // Validate số lượng câu hỏi
    const num = parseInt(numQuestions);
    if (isNaN(num) || num < 1 || num > 30) {
      return res.status(400).json({
        success: false,
        message: 'numQuestions must be between 1 and 30'
      });
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard', 'mixed'];
    if (!validDifficulties.includes(difficulty.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty. Must be: easy, medium, hard, or mixed'
      });
    }

    // Validate question types
    const validTypes = ['SingleChoice', 'MultipleChoice', 'FillInBlank', 'Essay'];
    const invalidTypes = questionTypes.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid question types: ${invalidTypes.join(', ')}`
      });
    }

    console.log('Received exam generation request:', {
      subject,
      topic,
      numQuestions: num,
      difficulty,
      questionTypes,
      ai_model
    });

    // Validate AI model
    if (!['groq', 'gemini'].includes(ai_model)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ai_model. Must be "groq" or "gemini"'
      });
    }

    // Sử dụng AI service chung (hỗ trợ cả Groq và Gemini)
    let result;
    const groqService = require('../../services/groqService');
    
    if (ai_model === 'groq') {
      console.log('🤖 [GROQ] Generating exam...');
      // Sử dụng Groq service
      result = await groqService.generateExam({
        subject,
        topic,
        numQuestions: num,
        difficulty,
        questionTypes,
        additionalRequirements: additionalRequirements || ''
      });
      console.log('✅ [GROQ] Exam generated successfully');
    } else {
      console.log('🤖 [GEMINI] Generating exam...');
      // Sử dụng Gemini service
      result = await geminiService.generateExam({
        subject,
        topic,
        numQuestions: num,
        difficulty,
        questionTypes,
        additionalRequirements: additionalRequirements || ''
      });
      console.log('✅ [GEMINI] Exam generated successfully');
    }
    
    // Log usage
    const userId = req.user.id || req.user.user_id;
    try {
      await req.db.query(
        `INSERT INTO ai_usage_logs (user_id, provider, action_type, tokens_used)
         VALUES (?, ?, 'create_exam', ?)`,
        [userId, ai_model, 0]
      );
      
      // Update system quota
      await req.db.query(
        `INSERT INTO ai_system_quota (date, provider, total_requests)
         VALUES (CURDATE(), ?, 1)
         ON DUPLICATE KEY UPDATE 
           total_requests = total_requests + 1,
           updated_at = NOW()`,
        [ai_model]
      );
    } catch (logError) {
      console.warn('⚠️ Error logging AI usage:', logError);
    }

    // Trả về kết quả
    res.json({
      success: true,
      questions: result.questions,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('Error in /api/ai/generate-exam:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate exam with AI',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================
// POST /api/ai/regenerate-question - Tạo lại một câu hỏi cụ thể
// ============================================
router.post('/regenerate-question', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  try {
    const { subject, topic, difficulty, type } = req.body;

    if (!subject || !topic || !difficulty || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Tạo một câu hỏi mới
    const result = await geminiService.generateExam({
      subject,
      topic,
      numQuestions: 1,
      difficulty,
      questionTypes: [type],
      additionalRequirements: ''
    });

    res.json({
      success: true,
      question: result.questions[0]
    });

  } catch (error) {
    console.error('Error regenerating question:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

