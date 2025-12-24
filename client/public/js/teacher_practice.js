// teacher_practice.js - Modal chọn AI model cho giáo viên
// Expose functions ra global scope

// Kiểm tra xem đã có functions từ student_practice.js chưa
if (typeof window.showAIModelModal === 'undefined') {
    // Tạo modal HTML
    function createAIModelModal() {
        const modal = document.createElement('div');
        modal.id = 'aiModelModal';
        modal.className = 'modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: none; align-items: center; justify-content: center;';
        
        modal.innerHTML = `
            <div class="ai-model-modal-content" style="background: white; border-radius: 15px; padding: 30px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto; position: relative;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #2d3748;">🤖 Chọn AI Model</h2>
                    <span class="close-btn" onclick="closeAIModelModal()" style="font-size: 28px; cursor: pointer; color: #666;">&times;</span>
                </div>
                
                <div id="quotaInfo" class="quota-info" style="display: none;"></div>
                
                <div class="model-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                    <!-- Groq Option -->
                    <div class="model-card" data-model="groq" onclick="selectAIModel('groq')" style="border: 2px solid #e1e8ed; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s; background: white;">
                        <div class="model-header" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                            <div class="model-icon" style="font-size: 2.5rem;">⚡</div>
                            <div class="model-title" style="flex: 1;">
                                <h3 style="margin: 0; font-size: 1.3rem; color: #2d3748;">Groq (Llama 3.1)</h3>
                                <span class="badge badge-fast" style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: #e6fffa; color: #234e52; margin-top: 5px;">Nhanh nhất</span>
                            </div>
                        </div>
                        <div class="model-features" style="margin: 15px 0;">
                            <div class="feature-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 0.9rem; color: #4a5568;">
                                <span class="icon" style="font-size: 1.2rem; width: 24px; text-align: center;">⚡</span>
                                <span>Tốc độ: <strong>Rất nhanh</strong> (~2 giây)</span>
                            </div>
                            <div class="feature-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 0.9rem; color: #4a5568;">
                                <span class="icon" style="font-size: 1.2rem; width: 24px; text-align: center;">✅</span>
                                <span>Chất lượng: <strong>Cao</strong></span>
                            </div>
                            <div class="feature-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 0.9rem; color: #4a5568;">
                                <span class="icon" style="font-size: 1.2rem; width: 24px; text-align: center;">💰</span>
                                <span>Chi phí: <strong>Thấp</strong></span>
                            </div>
                        </div>
                        <div class="model-suggestion" style="background: #f7fafc; padding: 12px; border-radius: 8px; margin: 15px 0; font-size: 0.85rem; color: #667eea; border-left: 3px solid #667eea;">
                            💡 Phù hợp: Tạo đề nhanh, câu hỏi đơn giản đến trung bình
                        </div>
                        <button class="btn-select-model" data-model="groq" onclick="event.stopPropagation(); selectAIModel('groq');" style="width: 100%; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600; cursor: pointer; transition: all 0.3s; margin-top: 10px;">
                            ⚡ Chọn Groq
                        </button>
                    </div>
                    
                    <!-- Gemini Option -->
                    <div class="model-card" data-model="gemini" onclick="selectAIModel('gemini')" style="border: 2px solid #e1e8ed; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s; background: white;">
                        <div class="model-header" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                            <div class="model-icon" style="font-size: 2.5rem;">🧠</div>
                            <div class="model-title" style="flex: 1;">
                                <h3 style="margin: 0; font-size: 1.3rem; color: #2d3748;">Gemini 2.5 Flash</h3>
                                <span class="badge badge-quality" style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: #eef2ff; color: #4338ca; margin-top: 5px;">Chất lượng cao</span>
                            </div>
                        </div>
                        <div class="model-features" style="margin: 15px 0;">
                            <div class="feature-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 0.9rem; color: #4a5568;">
                                <span class="icon" style="font-size: 1.2rem; width: 24px; text-align: center;">⏱️</span>
                                <span>Tốc độ: <strong>Trung bình</strong> (~5 giây)</span>
                            </div>
                            <div class="feature-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 0.9rem; color: #4a5568;">
                                <span class="icon" style="font-size: 1.2rem; width: 24px; text-align: center;">✅</span>
                                <span>Chất lượng: <strong>Rất cao</strong></span>
                            </div>
                            <div class="feature-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 0.9rem; color: #4a5568;">
                                <span class="icon" style="font-size: 1.2rem; width: 24px; text-align: center;">💰</span>
                                <span>Chi phí: <strong>Miễn phí</strong></span>
                            </div>
                        </div>
                        <div class="model-suggestion" style="background: #f7fafc; padding: 12px; border-radius: 8px; margin: 15px 0; font-size: 0.85rem; color: #667eea; border-left: 3px solid #667eea;">
                            💡 Phù hợp: Đề phức tạp, câu hỏi khó, cần độ chính xác cao
                        </div>
                        <button class="btn-select-model" data-model="gemini" onclick="event.stopPropagation(); selectAIModel('gemini');" style="width: 100%; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600; cursor: pointer; transition: all 0.3s; margin-top: 10px;">
                            🧠 Chọn Gemini
                        </button>
                    </div>
                </div>
                
                <div class="preference-option" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e8ed;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.9rem; color: #4a5568;">
                        <input type="checkbox" id="rememberPreference" style="width: 18px; height: 18px; cursor: pointer;">
                        <span>Nhớ lựa chọn của tôi (không hỏi lại lần sau)</span>
                    </label>
                </div>
                
                <div class="modal-footer" style="margin-top: 20px; text-align: right;">
                    <button class="btn btn-secondary" onclick="closeAIModelModal()" style="padding: 10px 20px; border: none; border-radius: 8px; background: #95a5a6; color: white; cursor: pointer; font-weight: 600;">Hủy</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Thêm CSS
        const style = document.createElement('style');
        style.textContent = `
            .model-card:hover {
                border-color: #667eea !important;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
            }
            .model-card.selected {
                border-color: #667eea !important;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%) !important;
            }
            .btn-select-model:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }
            @media (max-width: 768px) {
                .model-options {
                    grid-template-columns: 1fr !important;
                }
                .ai-model-modal-content {
                    width: 95% !important;
                    padding: 20px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Expose functions ra global scope
    window.showAIModelModal = async function(context = 'teacher', onSelectCallback = null) {
        let modal = document.getElementById('aiModelModal');
        if (!modal) {
            createAIModelModal();
            modal = document.getElementById('aiModelModal');
        }
        
        const quotaInfo = document.getElementById('quotaInfo');
        
        // Giáo viên không cần hiển thị quota
        if (quotaInfo) {
            quotaInfo.style.display = 'none';
        }
        
        // Kiểm tra preference
        const preference = await window.getUserAIPreference();
        if (preference) {
            const rememberCheckbox = document.getElementById('rememberPreference');
            if (rememberCheckbox) {
                rememberCheckbox.checked = true;
            }
        }
        
        // Lưu callback
        if (onSelectCallback) {
            modal.dataset.callback = 'custom';
            window.aiModelSelectCallback = onSelectCallback;
        }
        
        modal.style.display = 'flex';
    };
    
    window.selectAIModel = async function(model) {
        const remember = document.getElementById('rememberPreference')?.checked || false;
        
        if (remember) {
            try {
                await apiPost('/api/ai/preference', { model });
            } catch (error) {
                console.error('Error saving preference:', error);
            }
        }
        
        window.closeAIModelModal();
        
        window.selectedAIModel = model;
        window.dispatchEvent(new CustomEvent('aiModelSelected', { 
            detail: { model, remember } 
        }));
        
        if (window.aiModelSelectCallback) {
            window.aiModelSelectCallback(model);
            window.aiModelSelectCallback = null;
        }
    };
    
    window.closeAIModelModal = function() {
        const modal = document.getElementById('aiModelModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };
    
    window.getUserAIPreference = async function() {
        try {
            const response = await apiGet('/api/ai/preference');
            return response?.model || null;
        } catch (error) {
            return null;
        }
    };
}