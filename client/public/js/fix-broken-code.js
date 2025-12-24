const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'teacher.js');
let content = fs.readFileSync(filePath, 'utf8');

// Tìm và xóa các object/array còn sót lại sau khi xóa console.log
// Pattern: dòng bắt đầu bằng khoảng trắng + tên property + : (nhưng không có { trước đó)
const lines = content.split('\n');
const fixed = [];
let i = 0;

while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Kiểm tra xem có phải là phần còn lại của object không
    // (dòng bắt đầu bằng property name và dấu :, nhưng không có { hoặc function trước đó)
    if (trimmed.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/) && 
        i > 0 && 
        !lines[i-1].trim().match(/\{|function|const|let|var|if|for|while|switch|case|return|await|async/)) {
        // Có thể là phần còn lại của object, kiểm tra xem có phải không
        let j = i;
        let foundClosing = false;
        let braceCount = 0;
        
        // Tìm dòng đóng } hoặc });
        while (j < lines.length && j < i + 10) {
            if (lines[j].includes('});') || (lines[j].includes('}') && braceCount === 0)) {
                foundClosing = true;
                // Xóa từ dòng i đến dòng j
                i = j + 1;
                break;
            }
            if (lines[j].includes('{')) braceCount++;
            if (lines[j].includes('}')) braceCount--;
            j++;
        }
        
        if (foundClosing) {
            continue; // Đã xóa, tiếp tục
        }
    }
    
    fixed.push(line);
    i++;
}

fs.writeFileSync(filePath, fixed.join('\n'), 'utf8');
console.log('Đã sửa các dòng code bị hỏng');

























