const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Tạo báo cáo PDF cho admin
 */
async function generateAdminReport(reportData, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: 'Báo cáo thống kê hệ thống thi trực tuyến',
          Author: 'Hệ thống Edexis',
          Subject: 'Báo cáo thống kê',
          Creator: 'Edexis System'
        }
      });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Sử dụng font mặc định (Helvetica) - có thể hiển thị một số ký tự tiếng Việt
      // Nếu cần hỗ trợ đầy đủ, cần thêm font TTF hỗ trợ tiếng Việt
      
      // Helper function để chuyển đổi tiếng Việt sang không dấu (fallback)
      const removeVietnameseAccents = (str) => {
        if (!str) return '';
        return str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D');
      };
      
      // Header - sử dụng không dấu để tránh lỗi encoding
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(removeVietnameseAccents('BAO CAO THONG KE HE THONG THI TRUC TUYEN'), { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Ngay xuat bao cao: ${new Date().toLocaleDateString('vi-VN')}`, { align: 'center' });
      
      if (options.period) {
        const periodNames = {
          week: '7 ngay qua',
          month: '30 ngay qua',
          quarter: '3 thang qua',
          year: '1 nam qua',
          custom: `Tu ${options.start_date} den ${options.end_date}`
        };
        doc.text(`Khoang thoi gian: ${periodNames[options.period] || 'N/A'}`, { align: 'center' });
      }
      
      doc.moveDown();
      
      // Thống kê tổng quan
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text(removeVietnameseAccents('THONG KE TONG QUAN'), { underline: true });
      doc.moveDown(0.5);
      
      const stats = reportData.stats || {};
      doc.fontSize(11)
         .font('Helvetica')
         .text(`Tong so bai thi: ${stats.total_exams || 0}`)
         .text(`Tong so luot lam bai: ${stats.total_attempts || 0}`)
         .text(`Diem trung binh: ${parseFloat(stats.average_score || 0).toFixed(2)}`)
         .text(`Ty le hoan thanh: ${parseFloat(stats.completion_rate || 0).toFixed(2)}%`)
         .text(`Canh bao gian lan: ${stats.cheating_warnings || 0}`)
         .text(`So hoc sinh vi pham: ${stats.violating_students || 0}`);
      
      doc.moveDown();
      
      // Xu hướng điểm theo thời gian
      if (reportData.trend && reportData.trend.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(removeVietnameseAccents('XU HUONG DIEM THEO THOI GIAN'), { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(10)
           .font('Helvetica-Bold');
        doc.text('Ngay', 50, doc.y, { continued: true, width: 200 });
        doc.text('Diem trung binh', { width: 200 });
        doc.moveDown(0.3);
        
        doc.font('Helvetica');
        reportData.trend.forEach(item => {
          const dateLabel = item.label || item.date || 'N/A';
          const avgScore = parseFloat(item.avg_score || 0).toFixed(2);
          doc.fontSize(10)
             .text(dateLabel, 50, doc.y, { continued: true, width: 200 })
             .text(avgScore, { width: 200 });
        });
        
        doc.moveDown();
      }
      
      // Phân bố xếp loại
      if (reportData.gradeDistribution && reportData.gradeDistribution.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(removeVietnameseAccents('PHAN BO XEP LOAI'), { underline: true });
        doc.moveDown(0.5);
        
        const total = reportData.gradeDistribution.reduce((sum, item) => sum + parseInt(item.count), 0);
        
        doc.font('Helvetica');
        reportData.gradeDistribution.forEach(item => {
          const percent = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
          const grade = removeVietnameseAccents(item.grade);
          doc.fontSize(11)
             .text(`${grade}: ${item.count} hoc sinh (${percent}%)`);
        });
        
        doc.moveDown();
      }
      
      // So sánh môn học
      if (reportData.subjectComparison && reportData.subjectComparison.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(removeVietnameseAccents('SO SANH DIEM THEO MON HOC'), { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(10)
           .font('Helvetica-Bold');
        doc.text('Mon hoc', 50, doc.y, { continued: true, width: 200 });
        doc.text('Diem TB', { continued: true, width: 100 });
        doc.text('So hoc sinh', { width: 100 });
        doc.moveDown(0.3);
        
        doc.font('Helvetica');
        reportData.subjectComparison.forEach(subject => {
          const subjectName = removeVietnameseAccents(subject.subject_name || 'N/A');
          const avgScore = parseFloat(subject.avg_score || 0).toFixed(2);
          const studentCount = subject.student_count || 0;
          doc.fontSize(10)
             .text(subjectName, 50, doc.y, { continued: true, width: 200 })
             .text(avgScore, { continued: true, width: 100 })
             .text(studentCount.toString(), { width: 100 });
        });
        
        doc.moveDown();
      }
      
      // Top học sinh xuất sắc
      if (reportData.topStudents && reportData.topStudents.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(removeVietnameseAccents('TOP 10 HOC SINH XUAT SAC'), { underline: true });
        doc.moveDown(0.5);
        
        doc.font('Helvetica');
        reportData.topStudents.forEach((student, index) => {
          const name = removeVietnameseAccents(student.full_name || 'N/A');
          doc.fontSize(11)
             .text(`${index + 1}. ${name} - Diem TB: ${parseFloat(student.avg_score || 0).toFixed(2)} - So bai thi: ${student.exam_count || 0}`);
        });
        
        doc.moveDown();
      }
      
      // Học sinh cần hỗ trợ
      if (reportData.warningStudents && reportData.warningStudents.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(removeVietnameseAccents('HOC SINH CAN HO TRO'), { underline: true });
        doc.moveDown(0.5);
        
        doc.font('Helvetica');
        reportData.warningStudents.forEach((student, index) => {
          const name = removeVietnameseAccents(student.full_name || 'N/A');
          doc.fontSize(11)
             .text(`${index + 1}. ${name} - Diem TB: ${parseFloat(student.avg_score || 0).toFixed(2)} - Canh bao: ${student.warning_count || 0}`);
        });
        
        doc.moveDown();
      }
      
      // Báo cáo chi tiết theo kỳ thi
      if (reportData.details && reportData.details.length > 0) {
        doc.addPage();
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('BAO CAO CHI TIET THEO KY THI', { underline: true });
        doc.moveDown(0.5);
        
        doc.font('Helvetica');
        reportData.details.forEach((exam, index) => {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(`${index + 1}. ${removeVietnameseAccents(exam.exam_name || 'N/A')}`, { underline: true });
          doc.fontSize(10)
             .font('Helvetica')
             .text(`Mon hoc: ${removeVietnameseAccents(exam.subject_name || 'N/A')}`)
             .text(`So hoc sinh: ${exam.student_count || 0}`)
             .text(`Diem trung binh: ${parseFloat(exam.average_score || 0).toFixed(2)}`)
             .text(`Diem cao nhat: ${parseFloat(exam.highest_score || 0).toFixed(2)}`)
             .text(`Diem thap nhat: ${parseFloat(exam.lowest_score || 0).toFixed(2)}`)
             .text(`Ty le hoan thanh: ${parseFloat(exam.completion_rate || 0).toFixed(2)}%`)
             .text(`Canh bao gian lan: ${exam.cheating_warnings || 0}`);
          doc.moveDown();
        });
      }
      
      // Lịch sử sửa điểm
      if (reportData.scoreHistory && reportData.scoreHistory.length > 0) {
        doc.addPage();
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('LICH SU SUA DIEM CUA GIAO VIEN', { underline: true });
        doc.moveDown(0.5);
        
        doc.font('Helvetica');
        doc.fontSize(10)
           .font('Helvetica-Bold');
        doc.text('Thoi gian', 50, doc.y, { continued: true, width: 80 });
        doc.text('Giao vien', { continued: true, width: 100 });
        doc.text('Hoc sinh', { continued: true, width: 100 });
        doc.text('Bai thi', { continued: true, width: 100 });
        doc.text('Diem cu', { continued: true, width: 60 });
        doc.text('Diem moi', { width: 60 });
        doc.moveDown(0.3);
        
        doc.font('Helvetica');
        reportData.scoreHistory.slice(0, 20).forEach((sh, index) => {
          if (doc.y > 700) {
            doc.addPage();
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Thoi gian', 50, doc.y, { continued: true, width: 80 });
            doc.text('Giao vien', { continued: true, width: 100 });
            doc.text('Hoc sinh', { continued: true, width: 100 });
            doc.text('Bai thi', { continued: true, width: 100 });
            doc.text('Diem cu', { continued: true, width: 60 });
            doc.text('Diem moi', { width: 60 });
            doc.moveDown(0.3);
            doc.font('Helvetica');
          }
          
          const time = new Date(sh.edited_at).toLocaleString('vi-VN');
          const teacher = removeVietnameseAccents(sh.teacher_name || 'N/A');
          const student = removeVietnameseAccents(sh.student_name || 'N/A');
          const exam = removeVietnameseAccents(sh.exam_name || 'N/A');
          const oldScore = sh.old_score ? parseFloat(sh.old_score).toFixed(2) : 'N/A';
          const newScore = sh.new_score ? parseFloat(sh.new_score).toFixed(2) : 'N/A';
          
          doc.fontSize(9)
             .text(time.substring(0, 16), 50, doc.y, { continued: true, width: 80 })
             .text(teacher.substring(0, 20), { continued: true, width: 100 })
             .text(student.substring(0, 20), { continued: true, width: 100 })
             .text(exam.substring(0, 25), { continued: true, width: 100 })
             .text(oldScore, { continued: true, width: 60 })
             .text(newScore, { width: 60 });
        });
        
        doc.moveDown();
      }
      
      // Lịch sử khiếu nại
      if (reportData.complaintsHistory && reportData.complaintsHistory.length > 0) {
        doc.addPage();
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('LICH SU KHIEU NAI CUA HOC SINH', { underline: true });
        doc.moveDown(0.5);
        
        doc.font('Helvetica');
        reportData.complaintsHistory.slice(0, 20).forEach((c, index) => {
          if (doc.y > 700) {
            doc.addPage();
          }
          
          const studentName = removeVietnameseAccents(c.student_name || 'N/A');
          const examName = removeVietnameseAccents(c.exam_name || 'N/A');
          const subjectName = removeVietnameseAccents(c.subject_name || 'N/A');
          const content = removeVietnameseAccents(c.content || 'N/A');
          const response = removeVietnameseAccents(c.teacher_response || '');
          
          doc.fontSize(11)
             .font('Helvetica-Bold')
             .text(`${index + 1}. ${studentName} - ${examName}`, { underline: true });
          doc.fontSize(10)
             .font('Helvetica')
             .text(`Thoi gian: ${new Date(c.created_at).toLocaleString('vi-VN')}`)
             .text(`Mon hoc: ${subjectName}`)
             .text(`Trang thai: ${c.status === 'Pending' ? 'Dang cho' : c.status === 'Resolved' ? 'Da giai quyet' : 'Da tu choi'}`)
             .text(`Noi dung: ${content.substring(0, 100)}...`);
          if (c.teacher_response) {
            doc.text(`Phan hoi: ${response.substring(0, 100)}...`);
          }
          doc.moveDown();
        });
      }
      
      // Footer
      doc.fontSize(9)
         .font('Helvetica')
         .text(
           `Bao cao duoc tao tu dong boi he thong Edexis - Trang ${doc.page}`,
           { align: 'center' }
         );
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateAdminReport
};