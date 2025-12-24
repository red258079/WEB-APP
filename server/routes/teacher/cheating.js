const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');

console.log('✅ Cheating routes loaded');

//  Lấy tất cả log gian lận (có filter)
router.get('/cheating-logs', authMiddleware, async (req, res) => {
    try {
        console.log('🔵 GET /cheating-logs called');
        console.log('User:', req.user);
        console.log('Query:', req.query);
        
        const teacher_id = req.user.id;
        const { exam_id, event_type } = req.query;

        let query = `
            SELECT 
                acl.log_id,
                acl.attempt_id,
                acl.event_type,
                acl.event_description,
                acl.event_time,
                acl.video_path,
                acl.video_duration,
                acl.is_recorded,
                ea.exam_id,
                ea.student_id,
                e.exam_name,
                u.full_name as student_name
            FROM anti_cheating_logs acl
            JOIN exam_attempts ea ON acl.attempt_id = ea.attempt_id
            JOIN exams e ON ea.exam_id = e.exam_id
            JOIN users u ON ea.student_id = u.user_id
            WHERE e.teacher_id = ?
        `;

        const params = [teacher_id];

        if (exam_id && exam_id !== 'all') {
            query += ' AND ea.exam_id = ?';
            params.push(exam_id);
        }

        if (event_type && event_type !== 'all') {
            query += ' AND acl.event_type = ?';
            params.push(event_type);
        }

        query += ' ORDER BY acl.event_time DESC';

        console.log('📊 Executing query with params:', params);
        const [logs] = await req.db.query(query, params);
        console.log('✅ Found logs:', logs.length);
        
        res.json(logs);
    } catch (error) {
        console.error('❌ Error fetching cheating logs:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
});

//  Lấy chi tiết log của 1 attempt
router.get('/cheating-logs/:attempt_id', authMiddleware, async (req, res) => {
    try {
        console.log('🔵 GET /cheating-logs/:attempt_id called');
        
        const { attempt_id } = req.params;
        const teacher_id = req.user.id;

        const [attempt] = await req.db.query(` 
            SELECT ea.*, e.exam_name, e.teacher_id, u.full_name as student_name
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.exam_id
            JOIN users u ON ea.student_id = u.user_id
            WHERE ea.attempt_id = ? AND e.teacher_id = ?
        `, [attempt_id, teacher_id]);

        if (attempt.length === 0) {
            return res.status(403).json({ error: 'Không có quyền' });
        }

        const [logs] = await req.db.query(`
            SELECT 
                log_id,
                attempt_id,
                event_type,
                event_description,
                event_time,
                video_path,
                video_duration,
                is_recorded
            FROM anti_cheating_logs
            WHERE attempt_id = ?
            ORDER BY event_time DESC
        `, [attempt_id]);

        res.json({
            ...attempt[0],
            logs
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
});

//  Cấm thi học sinh
router.post('/ban-student', authMiddleware, async (req, res) => {
    try {
        console.log('🔵 POST /ban-student called');
        
        const { attempt_id, reason } = req.body;
        const teacher_id = req.user.id;

        const [attempt] = await req.db.query(` //
            SELECT ea.*, e.teacher_id
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.exam_id
            WHERE ea.attempt_id = ? AND e.teacher_id = ?
        `, [attempt_id, teacher_id]);

        if (attempt.length === 0) {
            return res.status(403).json({ error: 'Không có quyền' });
        }

        await req.db.query(`
            UPDATE exam_attempts
            SET is_banned = 1, score = 0
            WHERE attempt_id = ?
        `, [attempt_id]);

        await req.db.query(`
            INSERT INTO teacher_actions (teacher_id, exam_id, student_id, action_type, details)
            VALUES (?, ?, ?, 'ban_student', ?)
        `, [teacher_id, attempt[0].exam_id, attempt[0].student_id, reason]);

        res.json({ success: true, message: 'Đã cấm thi học sinh' });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
});

// ============================================
// 🎥 XEM VIDEO VI PHẠM
// ============================================
const path = require('path');
const fs = require('fs');
const videoStorage = require('../../utils/videoStorage');

router.get('/violation-video/:log_id', authMiddleware, async (req, res) => {
    try {
        const { log_id } = req.params;
        const teacher_id = req.user.id;

        // Lấy thông tin log và kiểm tra quyền
        const [logs] = await req.db.query(`
            SELECT 
                acl.log_id,
                acl.attempt_id,
                acl.video_path,
                acl.event_type,
                ea.exam_id,
                e.teacher_id
            FROM anti_cheating_logs acl
            JOIN exam_attempts ea ON acl.attempt_id = ea.attempt_id
            JOIN exams e ON ea.exam_id = e.exam_id
            WHERE acl.log_id = ? AND e.teacher_id = ?
        `, [log_id, teacher_id]);

        if (logs.length === 0) {
            return res.status(403).json({ error: 'Không có quyền xem video này' });
        }

        const log = logs[0];
        if (!log.video_path) {
            return res.status(404).json({ error: 'Không có video cho log này' });
        }

        // Lấy đường dẫn tuyệt đối
        const videoPath = videoStorage.getAbsolutePath(log.video_path);
        
        // Kiểm tra file có tồn tại không
        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ error: 'File video không tồn tại' });
        }

        // Set headers để stream video
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Hỗ trợ range requests (cho video streaming)
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Trả về toàn bộ file
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        console.error('❌ Error serving video:', error);
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
});

module.exports = router;