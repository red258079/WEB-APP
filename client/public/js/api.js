// API Helper Functions
// Tự động xử lý authentication, JSON parsing và error handling

(function() {
    'use strict';

    // Helper để build full URL
    function buildUrl(url) {
        // Nếu URL đã là absolute (bắt đầu với http:// hoặc https://), dùng trực tiếp
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // Nếu có API_BASE_URL từ CONFIG, dùng nó
        const baseUrl = (window.CONFIG && window.CONFIG.API_BASE_URL) || '';
        
        // Nếu baseUrl rỗng, dùng relative URL (cùng domain)
        if (!baseUrl) {
            return url;
        }
        
        // Kết hợp baseUrl và url
        const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const path = url.startsWith('/') ? url : '/' + url;
        return base + path;
    }

    // Helper để get headers với token
    function getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };
        
        // Thêm Authorization header nếu có token
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    // Helper để parse response và handle errors
    async function handleResponse(response) {
        // Lấy text trước để có thể log nếu cần
        const text = await response.text();
        
        // Nếu response rỗng, trả về null
        if (!text || text.trim() === '') {
            return null;
        }
        
        // Parse JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            // Nếu không parse được JSON, throw error với text gốc
            throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
        }
        
        // Nếu response không OK, throw error với message từ server
        if (!response.ok) {
            const error = new Error(data.message || data.error || `HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }
        
        return data;
    }

    // GET request
    window.apiGet = async function(url, options = {}) {
        try {
            const fullUrl = buildUrl(url);
            const headers = getHeaders(options.headers);
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: headers,
                ...options
            });
            
            return await handleResponse(response);
        } catch (error) {
            // Nếu là network error, wrap lại với message rõ ràng hơn
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
            }
            throw error;
        }
    };

    // POST request
    window.apiPost = async function(url, data = null, options = {}) {
        try {
            const fullUrl = buildUrl(url);
            const headers = getHeaders(options.headers);
            
            // Nếu data là FormData, không set Content-Type (browser sẽ tự set với boundary)
            let body;
            if (data instanceof FormData) {
                // Xóa Content-Type để browser tự set
                delete headers['Content-Type'];
                body = data;
            } else if (data !== null) {
                body = JSON.stringify(data);
            }
            
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: headers,
                body: body,
                ...options
            });
            
            return await handleResponse(response);
        } catch (error) {
            // Nếu là network error, wrap lại với message rõ ràng hơn
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                // KHÔNG throw - trả về error object để caller xử lý
                const networkError = new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
                networkError.isNetworkError = true;
                throw networkError;
            }
            // Với các lỗi khác, vẫn throw nhưng wrap lại để caller có thể catch
            throw error;
        }
    };

    // PUT request
    window.apiPut = async function(url, data = null, options = {}) {
        try {
            const fullUrl = buildUrl(url);
            const headers = getHeaders(options.headers);
            
            let body;
            if (data instanceof FormData) {
                delete headers['Content-Type'];
                body = data;
            } else if (data !== null) {
                body = JSON.stringify(data);
            }
            
            const response = await fetch(fullUrl, {
                method: 'PUT',
                headers: headers,
                body: body,
                ...options
            });
            
            return await handleResponse(response);
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
            }
            throw error;
        }
    };

    // DELETE request
    window.apiDelete = async function(url, options = {}) {
        try {
            const fullUrl = buildUrl(url);
            const headers = getHeaders(options.headers);
            
            const response = await fetch(fullUrl, {
                method: 'DELETE',
                headers: headers,
                ...options
            });
            
            return await handleResponse(response);
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
            }
            throw error;
        }
    };

    // API helpers đã được load (không log để giảm noise)
})();