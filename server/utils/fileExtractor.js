
// utils/fileExtractor.js - Extract text từ các loại file
const fs = require('fs').promises;
const path = require('path');

class FileExtractor {
    /**
     * Extract text từ file
     */
    async extractText(filePath, fileType) {
        try {
            switch (fileType.toLowerCase()) {
                case '.txt':
                    return await this.extractFromTxt(filePath);
                case '.pdf':
                    return await this.extractFromPdf(filePath);
                case '.docx':
                case '.doc':
                    return await this.extractFromWord(filePath);
                case '.pptx':
                case '.ppt':
                    return await this.extractFromPowerPoint(filePath);
                case '.xlsx':
                case '.xls':
                    return await this.extractFromExcel(filePath);
                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }
        } catch (error) {
            console.error(`❌ Error extracting text from ${fileType}:`, error);
            throw error;
        }
    }

    /**
     * Extract từ TXT
     */
    async extractFromTxt(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            throw new Error(`Cannot read TXT file: ${error.message}`);
        }
    }

    /**
     * Extract từ PDF (cần thư viện pdf-parse)
     */
    async extractFromPdf(filePath) {
        // Kiểm tra xem có thư viện pdf-parse không
        let pdfParse;
        try {
            pdfParse = require('pdf-parse');
        } catch (err) {
            console.error('❌ pdf-parse package is not installed!');
            throw new Error('Thư viện pdf-parse chưa được cài đặt. Vui lòng chạy: npm install pdf-parse');
        }
        
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdfParse(dataBuffer);
            
            if (!data.text || data.text.trim().length === 0) {
                throw new Error('PDF file không chứa text hoặc file bị lỗi');
            }
            
            return data.text;
        } catch (error) {
            if (error.message.includes('pdf-parse')) {
                throw error; // Re-throw lỗi thiếu package
            }
            throw new Error(`Không thể đọc file PDF: ${error.message}`);
        }
    }

    /**
     * Extract từ Word (cần thư viện mammoth)
     */
    async extractFromWord(filePath) {
        // Kiểm tra xem có thư viện mammoth không
        let mammoth;
        try {
            mammoth = require('mammoth');
        } catch (err) {
            console.error('❌ mammoth package is not installed!');
            throw new Error('Thư viện mammoth chưa được cài đặt. Vui lòng chạy: npm install mammoth');
        }
        
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            
            if (!result.value || result.value.trim().length === 0) {
                throw new Error('Word file không chứa text hoặc file bị lỗi');
            }
            
            return result.value;
        } catch (error) {
            if (error.message.includes('mammoth')) {
                throw error; // Re-throw lỗi thiếu package
            }
            throw new Error(`Không thể đọc file Word: ${error.message}`);
        }
    }

    /**
     * Extract từ PowerPoint
     */
    async extractFromPowerPoint(filePath) {
        // PowerPoint extraction phức tạp hơn, tạm thời return placeholder
        return 'PowerPoint file detected. Text extraction from PPT/PPTX is not yet fully supported.\nPlease convert to PDF or Word for better results.';
    }

    /**
     * Extract từ Excel
     */
    async extractFromExcel(filePath) {
        try {
            // Sử dụng xlsx (đã có trong package.json)
            const XLSX = require('xlsx');
            const workbook = XLSX.readFile(filePath);
            
            let text = '';
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const sheetText = XLSX.utils.sheet_to_txt(sheet);
                text += `\n\nSheet: ${sheetName}\n${sheetText}`;
            });
            
            return text.trim();
        } catch (error) {
            throw new Error(`Cannot extract Excel: ${error.message}`);
        }
    }
}

module.exports = new FileExtractor();