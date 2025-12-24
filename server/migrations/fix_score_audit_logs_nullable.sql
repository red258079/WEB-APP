-- Sửa lại bảng score_audit_logs để cho phép NULL cho new_score và new_total_score
-- Vì có thể chỉ thay đổi điểm câu hỏi hoặc chỉ thay đổi tổng điểm

ALTER TABLE score_audit_logs 
MODIFY COLUMN new_score DECIMAL(10,2) NULL COMMENT 'Điểm câu hỏi mới (NULL nếu chỉ thay đổi tổng điểm)',
MODIFY COLUMN new_total_score DECIMAL(10,2) NULL COMMENT 'Tổng điểm mới (NULL nếu chỉ thay đổi điểm câu hỏi)';














