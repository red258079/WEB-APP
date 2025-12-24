// services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import fetch (Node.js 18+ có sẵn, nếu không thì dùng node-fetch)
let fetch;
try {
    // Thử dùng fetch global (Node.js 18+)
    if (typeof globalThis.fetch !== 'undefined') {
        fetch = globalThis.fetch;
    } else {
        // Fallback về node-fetch nếu cần
        fetch = require('node-fetch');
    }
} catch (e) {
    // Nếu không có node-fetch, dùng https module
    const https = require('https');
    fetch = (url) => {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        json: () => Promise.resolve(JSON.parse(data)),
                        ok: res.statusCode === 200
                    });
                });
            }).on('error', reject);
        });
    };
}

class GeminiService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY is not defined in environment variables');
            throw new Error('GEMINI_API_KEY is not defined in environment variables');
        }
        try {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            console.log('✅ Gemini AI client initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Gemini client:', error);
            throw error;
        }
    }

    /**
     * Tạo prompt cho AI
     */
    createPrompt(subject, topic, numQuestions, difficulty, questionTypes, additionalRequirements) {
        const difficultyText = {
            'easy': 'dễ',
            'medium': 'trung bình',
            'hard': 'khó',
            'mixed': 'hỗn hợp (có cả dễ, trung bình và khó)'
        };

        const typeMapping = {
            'SingleChoice': 'Trắc nghiệm 1 đáp án đúng',
            'MultipleChoice': 'Trắc nghiệm nhiều đáp án đúng',
            'FillInBlank': 'Điền vào chỗ trống',
            'Essay': 'Tự luận'
        };

        const typesText = questionTypes.map(t => typeMapping[t] || t).join(', ');

        return `Bạn là một chuyên gia giáo dục xuất sắc. Hãy tạo một đề thi chất lượng cao với các yêu cầu sau:

**THÔNG TIN ĐỀ THI:**
- Môn học: ${subject}
- Chủ đề: ${topic}
- Số lượng câu hỏi: ${numQuestions}
- Độ khó: ${difficultyText[difficulty] || difficulty}
- Loại câu hỏi: ${typesText}
${additionalRequirements ? `- Yêu cầu bổ sung: ${additionalRequirements}` : ''}

**QUY ĐỊNH QUAN TRỌNG:**
1. Trả về KẾT QUẢ DƯỚI DẠNG JSON HỢP LỆ (KHÔNG có markdown, KHÔNG có giải thích)
2. Câu hỏi phải chính xác về mặt học thuật
3. Đáp án phải rõ ràng và không gây nhầm lẫn
4. Phân bổ độ khó hợp lý nếu là "hỗn hợp"
5. Với trắc nghiệm, các đáp án sai phải hợp lý (không quá dễ loại trừ)

**CẤU TRÚC JSON YÊU CẦU:**

{
  "questions": [
    {
      "questionText": "Nội dung câu hỏi chính xác và rõ ràng",
      "type": "SingleChoice hoặc MultipleChoice hoặc FillInBlank hoặc Essay",
      "options": ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"],
      "correctAnswer": "A",
      "difficulty": "Easy hoặc Medium hoặc Hard",
      "points": 10,
      "explanation": "Giải thích ngắn gọn tại sao đáp án này đúng (tùy chọn)"
    }
  ]
}

**CHI TIẾT THEO TỪNG LOẠI CÂU HỎI:**

1. **SingleChoice** (Trắc nghiệm 1 đáp án):
   - options: Mảng 4 đáp án ["A. ...", "B. ...", "C. ...", "D. ..."]
   - correctAnswer: Một chữ cái (VD: "B")

2. **MultipleChoice** (Trắc nghiệm nhiều đáp án):
   - options: Mảng 4 đáp án ["A. ...", "B. ...", "C. ...", "D. ..."]
   - correctAnswer: Nhiều chữ cái cách nhau bởi dấu phẩy (VD: "A,C,D")

3. **FillInBlank** (Điền vào chỗ trống):
   - options: [] (mảng rỗng)
   - correctAnswer: Đáp án đúng (VD: "H2O", "1945", "photosynthesis")

4. **Essay** (Tự luận):
   - options: [] (mảng rỗng)
   - correctAnswer: Gợi ý câu trả lời mẫu hoặc các điểm chính cần có

**LƯU Ý:**
- Độ khó "Easy": Kiến thức cơ bản, nhận biết
- Độ khó "Medium": Hiểu và vận dụng
- Độ khó "Hard": Vận dụng cao, phân tích, tổng hợp
- Điểm mỗi câu có thể khác nhau tùy độ khó (Easy: 5-10đ, Medium: 10-15đ, Hard: 15-20đ)
- Với độ khó "mixed": Phân bổ 30% Easy, 50% Medium, 20% Hard

CHỈ TRẢ VỀ JSON, KHÔNG THÊM BẤT KỲ TEXT NÀO KHÁC!`;
    }

    /**
     * Parse response từ AI
     */
    parseAIResponse(text) {
        try {
            console.log('Raw AI response (first 500 chars):', text.substring(0, 500)); // Log 500 ký tự đầu
            
            // Loại bỏ markdown code blocks nếu có
            let jsonText = text
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            
            // Tìm JSON object trong text - tìm từ đầu đến cuối object hoàn chỉnh
            let jsonStart = jsonText.indexOf('{');
            if (jsonStart === -1) {
                throw new Error('No JSON object found in response');
            }
            
            // Tìm vị trí kết thúc của JSON object (đếm dấu ngoặc)
            let braceCount = 0;
            let jsonEnd = -1;
            let inString = false;
            let escapeNext = false;
            
            for (let i = jsonStart; i < jsonText.length; i++) {
                const char = jsonText[i];
                
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                
                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }
                
                if (char === '"' && !escapeNext) {
                    inString = !inString;
                    continue;
                }
                
                if (!inString) {
                    if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            jsonEnd = i;
                            break;
                        }
                    }
                }
            }
            
            if (jsonEnd === -1) {
                throw new Error('Incomplete JSON object in response');
            }
            
            // Lấy JSON object hoàn chỉnh
            jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
            
            // Loại bỏ các ký tự không hợp lệ ở cuối (nếu có)
            jsonText = jsonText.trim();
            
            console.log('Extracted JSON (first 300 chars):', jsonText.substring(0, 300));
            
            // Parse JSON - thử parse trực tiếp trước
            let data;
            try {
                data = JSON.parse(jsonText);
            } catch (parseError) {
                // Nếu parse lỗi, thử loại bỏ các ký tự đặc biệt ở cuối
                console.warn('⚠️ First parse attempt failed, trying to clean JSON...');
                
                // Loại bỏ các ký tự không hợp lệ ở cuối (như dấu chấm, phẩy, v.v.)
                let cleanedJson = jsonText.replace(/[^\}]*$/, '');
                
                // Đảm bảo kết thúc bằng }
                if (!cleanedJson.trim().endsWith('}')) {
                    // Tìm vị trí } cuối cùng
                    const lastBrace = cleanedJson.lastIndexOf('}');
                    if (lastBrace !== -1) {
                        cleanedJson = cleanedJson.substring(0, lastBrace + 1);
                    }
                }
                
                try {
                    data = JSON.parse(cleanedJson);
                    console.log('✅ Successfully parsed after cleaning');
                } catch (secondError) {
                    console.error('❌ Parse error details:', {
                        originalError: parseError.message,
                        cleanedError: secondError.message,
                        jsonLength: jsonText.length,
                        jsonPreview: jsonText.substring(0, 200) + '...'
                    });
                    throw new Error(`Failed to parse JSON: ${parseError.message}. JSON preview: ${jsonText.substring(0, 200)}`);
                }
            }
            
            if (!data.questions || !Array.isArray(data.questions)) {
                throw new Error('Invalid response format: questions array not found');
            }

            // Validate và chuẩn hóa dữ liệu
            const validatedQuestions = data.questions.map((q, index) => {
                // Kiểm tra các trường bắt buộc
                if (!q.questionText || !q.type || !q.correctAnswer) {
                    throw new Error(`Question ${index + 1} is missing required fields`);
                }

                // Validate type
                const validTypes = ['SingleChoice', 'MultipleChoice', 'FillInBlank', 'Essay'];
                if (!validTypes.includes(q.type)) {
                    throw new Error(`Question ${index + 1} has invalid type: ${q.type}`);
                }

                // Validate difficulty
                const validDifficulties = ['Easy', 'Medium', 'Hard'];
                if (q.difficulty && !validDifficulties.includes(q.difficulty)) {
                    q.difficulty = 'Medium'; // Default
                }

                // Validate options cho trắc nghiệm
                if ((q.type === 'SingleChoice' || q.type === 'MultipleChoice') && (!q.options || q.options.length < 2)) {
                    throw new Error(`Question ${index + 1} must have at least 2 options`);
                }

                // Đảm bảo có options array (rỗng cho FillInBlank và Essay)
                if (!q.options) {
                    q.options = [];
                }

                // Đảm bảo có points
                if (!q.points || q.points <= 0) {
                    q.points = 10;
                }

                return {
                    questionText: q.questionText.trim(),
                    type: q.type,
                    options: q.options,
                    correctAnswer: q.correctAnswer.trim(),
                    difficulty: q.difficulty || 'Medium',
                    points: q.points,
                    explanation: q.explanation || ''
                };
            });

            return validatedQuestions;
        } catch (error) {
            console.error('Parse error:', error);
            console.log('Full AI response:', text);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách models có sẵn
     */
    async getAvailableModels() {
        try {
            // Thử list models từ API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
            const data = await response.json();
            
            if (data.models) {
                const availableModels = data.models
                    .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''))
                    .filter(name => name.includes('gemini'));
                
                console.log('📋 Available models:', availableModels);
                return availableModels;
            }
            
            return [];
        } catch (error) {
            console.warn('⚠️ Không thể lấy danh sách models:', error.message);
            return [];
        }
    }

    /**
     * Tìm model khả dụng (ưu tiên free tier)
     */
    async findAvailableModel() {
        // Thử list models từ API trước
        const availableModels = await this.getAvailableModels();
        
        // Nếu có models từ API, ưu tiên free tier models
        if (availableModels.length > 0) {
            // Ưu tiên các model free tier (flash, không có "pro" hoặc "preview")
            const freeTierModels = availableModels.filter(m => 
                (m.includes('flash') || m.includes('lite')) && 
                !m.includes('pro') && 
                !m.includes('preview') &&
                !m.includes('exp')
            );
            
            // Nếu có free tier models, dùng chúng
            if (freeTierModels.length > 0) {
                // Ưu tiên gemini-2.5-flash hoặc gemini-flash-latest
                const preferred = freeTierModels.find(m => 
                    m === 'gemini-2.5-flash' || 
                    m === 'gemini-flash-latest' ||
                    m === 'gemini-2.0-flash'
                );
                return preferred || freeTierModels[0];
            }
            
            // Nếu không có free tier, thử flash models (có thể có quota)
            const flashModels = availableModels.filter(m => 
                m.includes('flash') && !m.includes('pro')
            );
            if (flashModels.length > 0) {
                return flashModels[0];
            }
            
            // Cuối cùng mới dùng pro models
            const proModels = availableModels.filter(m => m.includes('pro'));
            if (proModels.length > 0) {
                return proModels[0];
            }
            
            // Nếu không có gì, dùng model đầu tiên
            return availableModels[0];
        }
        
        // Fallback: thử các model free tier phổ biến
        const fallbackModels = [
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-pro',
            'gemini-1.5-pro'
        ];
        
        for (const modelName of fallbackModels) {
            try {
                const model = this.genAI.getGenerativeModel({ model: modelName });
                // Test với prompt ngắn
                await model.generateContent('test');
                console.log(`✅ Tìm thấy model khả dụng: ${modelName}`);
                return modelName;
            } catch (error) {
                // Tiếp tục thử model tiếp theo
                continue;
            }
        }
        
        return null;
    }

    /**
     * Tạo đề thi với AI
     */
    async generateExam(examData) {
        try {
            const { subject, topic, numQuestions, difficulty, questionTypes, additionalRequirements } = examData;

            // Validate input
            if (!subject || !topic || !numQuestions || !difficulty || !questionTypes || questionTypes.length === 0) {
                throw new Error('Missing required fields');
            }

            if (numQuestions < 1 || numQuestions > 50) {
                throw new Error('Number of questions must be between 1 and 50');
            }

            // Tạo prompt
            const prompt = this.createPrompt(
                subject,
                topic,
                numQuestions,
                difficulty,
                questionTypes,
                additionalRequirements || ''
            );

            console.log('🤖 Generating exam with AI...');
            console.log('📚 Subject:', subject);
            console.log('📖 Topic:', topic);
            console.log('🔢 Num Questions:', numQuestions);

            // Tìm model khả dụng
            const modelName = await this.findAvailableModel();
            
            if (!modelName) {
                throw new Error('Không thể tìm thấy model Gemini khả dụng. Vui lòng kiểm tra API key và quyền truy cập.');
            }
            
            console.log(`✅ Sử dụng model: ${modelName}`);
            
            // Sử dụng model đã tìm được
            let model, result, response, text;
            try {
                model = this.genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent(prompt);
                response = result.response;
                text = response.text();
            } catch (apiError) {
                // Xử lý lỗi quota (429) - thử model free tier khác
                if (apiError.status === 429) {
                    console.warn('⚠️ Model bị vượt quota, thử model free tier khác...');
                    
                    // Thử các model free tier
                    const freeTierModels = [
                        'gemini-2.5-flash',
                        'gemini-flash-latest',
                        'gemini-2.0-flash',
                        'gemini-1.5-flash'
                    ];
                    
                    let success = false;
                    for (const freeModel of freeTierModels) {
                        if (freeModel === modelName) continue; // Bỏ qua model đã thử
                        
                        try {
                            console.log(`🔄 Thử model free tier: ${freeModel}`);
                            const freeModelInstance = this.genAI.getGenerativeModel({ model: freeModel });
                            const freeResult = await freeModelInstance.generateContent(prompt);
                            const freeResponse = freeResult.response;
                            text = freeResponse.text();
                            console.log(`✅ Thành công với model free tier: ${freeModel}`);
                            success = true;
                            break;
                        } catch (freeError) {
                            console.warn(`⚠️ Model ${freeModel} cũng lỗi:`, freeError.message);
                            continue;
                        }
                    }
                    
                    if (!success) {
                        const retryDelay = apiError.errorDetails?.find(d => d['@type']?.includes('RetryInfo'))?.retryDelay || '33s';
                        throw new Error(`Đã vượt quá quota của tất cả models. Vui lòng đợi ${retryDelay} hoặc nâng cấp lên paid plan. Xem thêm: https://ai.google.dev/gemini-api/docs/rate-limits`);
                    }
                }
                // Xử lý lỗi API key bị leak hoặc không hợp lệ
                else if (apiError.status === 403) {
                    if (apiError.message && apiError.message.includes('leaked')) {
                        throw new Error('API key đã bị báo là rò rỉ. Vui lòng tạo API key mới trong Google AI Studio (https://aistudio.google.com/apikey) và cập nhật vào file .env');
                    } else if (apiError.message && apiError.message.includes('API key')) {
                        throw new Error('API key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại API key trong file .env');
                    } else {
                        throw new Error('API key không có quyền truy cập model này. Vui lòng kiểm tra quyền của API key trong Google Cloud Console');
                    }
                } else if (apiError.status === 401) {
                    throw new Error('API key không hợp lệ. Vui lòng kiểm tra lại API key trong file .env');
                } else {
                    throw apiError;
                }
            }

            console.log('📥 AI Response received, length:', text.length);

            if (!text || text.trim().length === 0) {
                console.error('❌ No text found in AI response');
                throw new Error('AI returned empty response');
            }

            console.log('✅ AI Response received, parsing...');

            // Parse và validate
            const questions = this.parseAIResponse(text);

            console.log(`✅ Successfully generated ${questions.length} questions`);

            return {
                success: true,
                questions: questions,
                metadata: {
                    subject,
                    topic,
                    difficulty,
                    totalQuestions: questions.length,
                    totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('❌ Gemini Service Error:', error);
            
            // Nếu đã là error message rõ ràng, giữ nguyên
            if (error.message && (
                error.message.includes('API key') || 
                error.message.includes('rò rỉ') ||
                error.message.includes('leaked')
            )) {
                throw error;
            }
            
            // Nếu không, wrap lại với message rõ ràng hơn
            throw new Error(`AI Generation failed: ${error.message}`);
        }
    }

    /**
     * Test connection với Gemini API
     */
    async testConnection() {
        try {
            console.log('🔍 Testing Gemini API connection...');
            
            // Tìm model khả dụng
            const modelName = await this.findAvailableModel();
            
            if (!modelName) {
                return {
                    success: false,
                    message: 'Không thể tìm thấy model Gemini khả dụng. Vui lòng kiểm tra API key và quyền truy cập.'
                };
            }
            
            console.log(`✅ Sử dụng model: ${modelName}`);
            
            // Test với model đã tìm được
            const model = this.genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'Hello' in Vietnamese");
            const response = result.response;
            const text = response.text();
            
            console.log('✅ Gemini API connection successful');
            
            return {
                success: true,
                message: 'Connection successful',
                model: modelName,
                response: text
            };
        } catch (error) {
            console.error('❌ Gemini API connection failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = new GeminiService();