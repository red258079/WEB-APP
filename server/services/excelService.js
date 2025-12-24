// server/services/excelService.js
// Service xử lý import/export Excel và CSV

const xlsx = require('xlsx');
const { parse } = require('csv-parse');
const fs = require('fs').promises;

/**
 * Parse file Excel hoặc CSV thành mảng objects
 * @param {String} filePath - Đường dẫn file
 * @param {String} mimetype - MIME type của file
 * @returns {Promise<Array>} Mảng các objects từ file
 */
const parseFile = async (filePath, mimetype) => {
  try {
    let data = [];

    if (mimetype.includes('csv')) {
      // Parse CSV
      const csvData = await fs.readFile(filePath);
      data = await new Promise((resolve, reject) => {
        parse(csvData, { columns: true, trim: true }, (err, output) => {
          if (err) reject(err);
          resolve(output);
        });
      });
    } else {
      // Parse Excel
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = xlsx.utils.sheet_to_json(sheet);
    }

    return data;
  } catch (error) {
    console.error('❌ [ExcelService] Lỗi parse file:', error);
    throw new Error(`Không thể đọc file: ${error.message}`);
  }
};

/**
 * Tạo workbook Excel mới
 * @returns {Object} Workbook object
 */
const createWorkbook = () => {
  return xlsx.utils.book_new();
};

/**
 * Tạo sheet từ mảng dữ liệu
 * @param {Array} data - Mảng dữ liệu (array of arrays hoặc array of objects)
 * @param {String} sheetName - Tên sheet
 * @param {Array} columnWidths - Độ rộng các cột (optional)
 * @returns {Object} Sheet object
 */
const createSheet = (data, sheetName, columnWidths = null) => {
  let sheet;
  
  // Nếu data là array of arrays (AOA - Array of Arrays)
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    sheet = xlsx.utils.aoa_to_sheet(data);
  } else {
    // Nếu data là array of objects
    sheet = xlsx.utils.json_to_sheet(data);
  }

  // Đặt độ rộng cột nếu có
  if (columnWidths && Array.isArray(columnWidths)) {
    sheet['!cols'] = columnWidths.map(width => ({ wch: width }));
  }

  return sheet;
};

/**
 * Thêm sheet vào workbook
 * @param {Object} workbook - Workbook object
 * @param {Object} sheet - Sheet object
 * @param {String} sheetName - Tên sheet
 */
const addSheetToWorkbook = (workbook, sheet, sheetName) => {
  xlsx.utils.book_append_sheet(workbook, sheet, sheetName);
};

/**
 * Xuất workbook ra buffer để gửi response
 * @param {Object} workbook - Workbook object
 * @param {String} fileType - Loại file ('xlsx' hoặc 'xls')
 * @returns {Buffer} Buffer chứa file Excel
 */
const exportToBuffer = (workbook, fileType = 'xlsx') => {
  try {
    return xlsx.write(workbook, { 
      type: 'buffer', 
      bookType: fileType 
    });
  } catch (error) {
    console.error('❌ [ExcelService] Lỗi export workbook:', error);
    throw new Error(`Không thể xuất file Excel: ${error.message}`);
  }
};

/**
 * Xuất workbook ra file
 * @param {Object} workbook - Workbook object
 * @param {String} filePath - Đường dẫn file output
 * @param {String} fileType - Loại file ('xlsx' hoặc 'xls')
 */
const exportToFile = (workbook, filePath, fileType = 'xlsx') => {
  try {
    xlsx.writeFile(workbook, filePath, { bookType: fileType });
  } catch (error) {
    console.error('❌ [ExcelService] Lỗi export workbook ra file:', error);
    throw new Error(`Không thể xuất file Excel: ${error.message}`);
  }
};

/**
 * Tạo file Excel từ dữ liệu và trả về buffer
 * @param {Array} sheets - Mảng các sheet config [{name, data, columnWidths}, ...]
 * @param {String} fileType - Loại file ('xlsx' hoặc 'xls')
 * @returns {Buffer} Buffer chứa file Excel
 */
const createExcelFromData = (sheets, fileType = 'xlsx') => {
  try {
    const workbook = createWorkbook();

    sheets.forEach(sheetConfig => {
      const { name, data, columnWidths } = sheetConfig;
      const sheet = createSheet(data, name, columnWidths);
      addSheetToWorkbook(workbook, sheet, name);
    });

    return exportToBuffer(workbook, fileType);
  } catch (error) {
    console.error('❌ [ExcelService] Lỗi tạo Excel từ dữ liệu:', error);
    throw error;
  }
};

module.exports = {
  parseFile,
  createWorkbook,
  createSheet,
  addSheetToWorkbook,
  exportToBuffer,
  exportToFile,
  createExcelFromData
};