const { Class } = require('../models');
const { v4: uuidv4 } = require('uuid');

exports.createClass = async (req, res) => {
    try {
        const { className, subject, description } = req.body;
        const joinCode = uuidv4().slice(0, 8);
        const newClass = await Class.create({ className, subject, description, joinCode });
        res.status(201).json({ message: 'Lớp học được tạo thành công!', class: newClass });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllClasses = async (req, res) => {
    try {
        const classes = await Class.findAll();
        res.json(classes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getClassSchedule = async (req, res) => {
    const { classId } = req.params;
    try {
        const schedule = [
            { subject: 'Toán', date: '12/10/2025', time: '08:00', room: '301' },
            { subject: 'Văn', date: '13/10/2025', time: '10:00', room: '302' }
        ];
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.joinClass = async (req, res) => {
    const { joinCode } = req.body;
    try {
        const cls = await Class.findOne({ where: { joinCode } });
        if (!cls) return res.status(404).json({ error: 'Mã tham gia không hợp lệ!' });
        cls.studentCount += 1;
        await cls.save();
        res.json({ message: 'Tham gia lớp học thành công!', class: cls });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};