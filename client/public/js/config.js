// API Configuration
// Hỗ trợ cả relative URLs (cùng domain) và absolute URLs (khác domain)

(function () {
    'use strict';

    // Helper để detect localhost
    function isLocalhost() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    }

    // Helper để get meta tag content
    function getMetaContent(name) {
        const meta = document.querySelector(`meta[name="${name}"]`);
        return meta ? meta.content : null;
    }

    // CẤU HÌNH PRODUCTION: Thay đường dẫn bên dưới bằng URL của Backend trên Render sau khi deploy xong
    // Ví dụ: const PRODUCTION_API_URL = 'https://edexis-backend.onrender.com';
    const PRODUCTION_API_URL = ''; // <-- ĐIỀN URL RENDER VÀO ĐÂY

    // Get API Base URL với priority
    function getApiBaseUrl() {
        // Priority 1: Window variable (injected từ HTML hoặc script)
        if (window.API_BASE_URL) return window.API_BASE_URL;

        // Priority 2: Meta tag
        const metaUrl = getMetaContent('api-base-url');
        if (metaUrl) return metaUrl;

        // Priority 3: LocalStorage (user override)
        const saved = localStorage.getItem('API_BASE_URL');
        if (saved) return saved;

        // Priority 4: Auto-detect localhost (development)
        if (isLocalhost()) {
            return 'http://localhost:3000';
        }

        // Priority 5: Production URL hardcoded
        if (PRODUCTION_API_URL) return PRODUCTION_API_URL;

        // Priority 6: Empty string = dùng relative URLs (cùng domain)
        // Phù hợp với Cloudflare Tunnel một đường link duy nhất
        return '';
    }

    // Get Socket URL với priority
    function getSocketUrl() {
        // Priority 1: Window variable
        if (window.SOCKET_URL) return window.SOCKET_URL;

        // Priority 2: Meta tag
        const metaUrl = getMetaContent('socket-url');
        if (metaUrl) return metaUrl;

        // Priority 3: LocalStorage
        const saved = localStorage.getItem('SOCKET_URL');
        if (saved) return saved;

        // Priority 4: Auto-detect localhost
        if (isLocalhost()) {
            return 'http://localhost:3000';
        }

        // Priority 5: Dùng current origin (cùng domain)
        return window.location.origin;
    }

    // Export CONFIG object
    window.CONFIG = {
        API_BASE_URL: getApiBaseUrl(),
        SOCKET_URL: getSocketUrl(),

        // Helper để update config runtime (cho phép user thay đổi)
        setApiBaseUrl: function (url) {
            localStorage.setItem('API_BASE_URL', url);
            this.API_BASE_URL = url;
        },

        setSocketUrl: function (url) {
            localStorage.setItem('SOCKET_URL', url);
            this.SOCKET_URL = url;
        },

        // Reset về default
        reset: function () {
            localStorage.removeItem('API_BASE_URL');
            localStorage.removeItem('SOCKET_URL');
            this.API_BASE_URL = getApiBaseUrl();
            this.SOCKET_URL = getSocketUrl();
        },

        // Check nếu đang dùng relative URLs
        isRelative: function () {
            return !this.API_BASE_URL || this.API_BASE_URL === '';
        }
    };

    // Config đã được load (không log để giảm noise)
})();










