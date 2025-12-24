
function showNotification(message, type = 'info') {
    const toastContainer = document.createElement('div');
    toastContainer.className = `toast align-items-center text-white bg-${type} border-0`;
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '1050';
    toastContainer.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    document.body.appendChild(toastContainer);
    const toast = new bootstrap.Toast(toastContainer);
    toast.show();
    setTimeout(() => toastContainer.remove(), 3000);
}

// Lấy token từ localStorage
const token = localStorage.getItem('token');
if (!token) {
    showNotification('Vui lòng đăng nhập để truy cập dashboard!', 'error');
    setTimeout(() => window.location.href = './login.html', 1500);
    throw new Error('No token');
}

const ADMIN_PRIMARY_COLOR = '#7f8ac5';
const ADMIN_PRIMARY_BG = 'rgba(127, 138, 197, 0.18)';


// Biến toàn cục để lưu dữ liệu gốc cho lọc users và chi tiết môn học
let allUsers = [];
let allStudents = [];

// Toggle Sidebar
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.createElement('div');
sidebarOverlay.className = 'sidebar-overlay';
document.body.appendChild(sidebarOverlay);

// Toggle sidebar function
function toggleSidebar() {
    sidebar.classList.toggle('show');
    sidebarOverlay.classList.toggle('show');
}

// Toggle button click
toggleSidebarBtn?.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleSidebar();
});

// Close sidebar when clicking overlay
sidebarOverlay.addEventListener('click', function () {
    sidebar.classList.remove('show');
    sidebarOverlay.classList.remove('show');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function (e) {
    if (window.innerWidth <= 767.98) {
        if (sidebar.classList.contains('show') &&
            !sidebar.contains(e.target) &&
            !toggleSidebarBtn.contains(e.target)) {
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('show');
        }
    }
});

// Close sidebar on escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
        sidebarOverlay.classList.remove('show');
    }
});

// Navigation and Section Switching
const pageTitles = {
    'dashboard': 'Dashboard Tổng Quan',
    'users': 'Quản Lý Người Dùng',
    'exams': 'Quản Lý Kỳ Thi',
    'questions': 'Ngân Hàng Câu Hỏi',
    'subjects': 'Quản Lý Môn Học',
    'reports': 'Báo Cáo & Thống Kê',
    'settings': 'Cài Đặt Hệ Thống'
};

// Hàm xử lý quick action
function handleQuickAction(sectionName, buttonId) {
    switchSection(sectionName);
    // Đợi section được hiển thị rồi mới click button
    setTimeout(() => {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.click();
        }
    }, 200);
}

// Hàm chuyển đổi section
function switchSection(sectionName) {
    // Kiểm tra sectionName hợp lệ
    if (!sectionName || sectionName === 'null' || sectionName === 'undefined') {
        return;
    }

    // Cập nhật navigation
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const navLink = document.querySelector(`.nav-link[data-section="${sectionName}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }

    // Ẩn tất cả sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Hiển thị section được chọn
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.error('Không tìm thấy section:', sectionName + '-section');
    }

    // Cập nhật tiêu đề
    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl) {
        pageTitleEl.textContent = pageTitles[sectionName] || 'Dashboard';
    }

    // Load dữ liệu tương ứng
    if (sectionName === 'dashboard') {
        setTimeout(loadDashboardData, 100);
    } else if (sectionName === 'users') {
        setTimeout(loadUsersData, 100);
    } else if (sectionName === 'exams') {
        setTimeout(loadExamsData, 100);
    } else if (sectionName === 'questions') {
        setTimeout(() => {
            loadSubjectsForQuestionFilter();
            loadQuestionsData(1);
        }, 100);
    } else if (sectionName === 'subjects') {
        setTimeout(loadSubjectsData, 100);
    } else if (sectionName === 'reports') {
        setTimeout(() => {
            loadReportsData();
            loadAIUsageReport();
        }, 100);
    } else if (sectionName === 'monitor-cheating') {
        setTimeout(loadCheatingData, 100);
    } else if (sectionName === 'settings') {
        setTimeout(loadSettingsData, 100);
    }
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const sectionName = this.getAttribute('data-section');
        if (sectionName) {
            switchSection(sectionName);
        } else {
        }
    });
});

// DARK MODE FUNCTIONALITY
(function () {
    // Kiểm tra theme đã lưu hoặc sử dụng light mode mặc định
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateDarkModeIcon(savedTheme === 'dark');

    // Toggle dark mode
    document.getElementById('toggleDarkMode')?.addEventListener('click', function () {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateDarkModeIcon(newTheme === 'dark');
    });

    function updateDarkModeIcon(isDark) {
        const icon = document.getElementById('darkModeIcon');
        if (icon) {
            icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
        }
    }
})();

// SETTINGS FUNCTIONALITY - NEW FEATURES

// Backup Functions
async function createBackup() {
    try {
        showNotification('Đang tạo bản sao lưu...', 'info');
        // Sử dụng apiPost từ api.js
        await apiPost('/api/admin/backup/create', {});
        showNotification('Tạo bản sao lưu thành công!', 'success');
    } catch (err) {
        showNotification('Lỗi tạo bản sao lưu: ' + err.message, 'error');
    }
}

async function viewBackupHistory() {
    try {
        // Sử dụng apiGet từ api.js
        const backups = await apiGet('/api/admin/backup/history');

        if (backups.length === 0) {
            showNotification('Chưa có bản backup nào', 'info');
            return;
        }

        // Hiển thị danh sách backup trong modal hoặc alert
        const backupList = backups.map(b =>
            `- ${b.backup_file} (${(b.backup_size / 1024).toFixed(2)} KB) - ${new Date(b.created_at).toLocaleString('vi-VN')}`
        ).join('\n');

        alert('Lịch sử backup:\n\n' + backupList);
    } catch (err) {
        showNotification('Lỗi tải lịch sử backup: ' + err.message, 'error');
    }
}

async function restoreBackup() {
    const fileInput = document.getElementById('restoreFile');
    const overwrite = document.getElementById('restoreOverwrite')?.checked;
    if (!fileInput || !fileInput.files.length) {
        showNotification('Vui lòng chọn file sao lưu!', 'error');
        return;
    }
    if (!confirm('Bạn có chắc chắn muốn khôi phục? Dữ liệu hiện tại có thể bị mất!')) return;

    try {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('overwrite', overwrite ? 'true' : 'false');

        showNotification('Đang khôi phục...', 'info');
        // Sử dụng apiPost từ api.js - nhưng với FormData cần dùng fetch trực tiếp
        const baseUrl = window.CONFIG?.API_BASE_URL || '';
        const response = await fetch(baseUrl + '/api/admin/backup/restore', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }
        const data = await response.json();
        showNotification('Khôi phục thành công!', 'success');
        // Clear file input
        fileInput.value = '';
    } catch (err) {
        console.error('Lỗi khôi phục:', err);
        showNotification('Lỗi khôi phục: ' + err.message, 'error');
    }
}

// Logs Functions
function viewSystemLogs() {
    showNotification('Đang tải log...', 'info');
    // Sử dụng CONFIG để build URL
    window.open((window.CONFIG?.API_BASE_URL || '') + '/api/admin/logs/view', '_blank');
}

async function exportLogs() {
    try {
        // Sử dụng fetch trực tiếp vì cần blob
        const baseUrl = window.CONFIG?.API_BASE_URL || '';
        const response = await fetch(baseUrl + '/api/admin/logs/export', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(await response.text());
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        showNotification('Xuất log thành công!', 'success');
    } catch (err) {
        showNotification('Lỗi xuất log: ' + err.message, 'error');
    }
}

async function clearOldLogs() {
    if (!confirm('Bạn có chắc chắn muốn xóa log cũ?')) return;
    try {
        // Sử dụng apiPost từ api.js
        await apiPost('/api/admin/logs/clear', {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        showNotification('Xóa log cũ thành công!', 'success');
    } catch (err) {
        showNotification('Lỗi xóa log: ' + err.message, 'error');
    }
}

// API Functions
function generateAPIKey() {
    const apiKey = 'api_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    document.getElementById('apiKey').value = apiKey;
    showNotification('Đã tạo API Key mới!', 'success');
}

function copyAPIKey() {
    const apiKeyInput = document.getElementById('apiKey');
    apiKeyInput.select();
    document.execCommand('copy');
    showNotification('Đã sao chép API Key!', 'success');
}

// Performance Functions
function viewPerformanceStats() {
    showNotification('Đang tải thống kê hiệu suất...', 'info');
    // Có thể mở modal hoặc chuyển đến trang thống kê
}

async function clearCache() {
    if (!confirm('Bạn có chắc chắn muốn xóa cache?')) return;
    try {
        // Sử dụng apiPost từ api.js
        await apiPost('/api/admin/cache/clear', {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        showNotification('Xóa cache thành công!', 'success');
    } catch (err) {
        showNotification('Lỗi xóa cache: ' + err.message, 'error');
    }
}

async function optimizeDatabase() {
    if (!confirm('Bạn có chắc chắn muốn tối ưu database? Quá trình này có thể mất vài phút.')) return;
    try {
        showNotification('Đang tối ưu database...', 'info');
        // Sử dụng apiGet/apiPost từ api.js
        // Sử dụng apiPost từ api.js
        await apiPost('/api/admin/database/optimize', {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        showNotification('Tối ưu database thành công!', 'success');
    } catch (err) {
        showNotification('Lỗi tối ưu database: ' + err.message, 'error');
    }
}

// ==========================================
// SETTINGS FUNCTIONALITY
// ==========================================
async function loadSettingsData() {
    try {
        // Sử dụng apiGet/apiPost từ api.js
        const settings = await apiGet('/api/admin/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });


        if (!settings || Object.keys(settings).length === 0) {
        }

        // Fill exam settings
        if (settings.exam) {
            const defaultDurationEl = document.getElementById('defaultDuration');
            if (defaultDurationEl) defaultDurationEl.value = settings.exam.defaultDuration || 60;
            const defaultPassingScoreEl = document.getElementById('defaultPassingScore');
            if (defaultPassingScoreEl) defaultPassingScoreEl.value = settings.exam.defaultPassingScore || 5.0;
            const enableAutoSubmitEl = document.getElementById('enableAutoSubmit');
            if (enableAutoSubmitEl) enableAutoSubmitEl.checked = settings.exam.enableAutoSubmit !== false;
            const enableReviewBeforeSubmitEl = document.getElementById('enableReviewBeforeSubmit');
            if (enableReviewBeforeSubmitEl) enableReviewBeforeSubmitEl.checked = settings.exam.enableReviewBeforeSubmit !== false;
        }

        // Fill anti-cheat settings
        if (settings.antiCheat) {
            const maxWarningsEl = document.getElementById('maxWarnings');
            if (maxWarningsEl) maxWarningsEl.value = settings.antiCheat.maxWarnings || 3;
            const enableWebcamMonitoringEl = document.getElementById('enableWebcamMonitoring');
            if (enableWebcamMonitoringEl) enableWebcamMonitoringEl.checked = settings.antiCheat.enableWebcamMonitoring !== false;
            const enableTabSwitchDetectionEl = document.getElementById('enableTabSwitchDetection');
            if (enableTabSwitchDetectionEl) enableTabSwitchDetectionEl.checked = settings.antiCheat.enableTabSwitchDetection !== false;
            const enableCopyPasteDetectionEl = document.getElementById('enableCopyPasteDetection');
            if (enableCopyPasteDetectionEl) enableCopyPasteDetectionEl.checked = settings.antiCheat.enableCopyPasteDetection !== false;
        }

        // Fill notification settings
        if (settings.notification) {
            const enableEmailEl = document.getElementById('enableEmail');
            if (enableEmailEl) enableEmailEl.checked = settings.notification.enableEmail === true;
            const notifyExamStartEl = document.getElementById('notifyExamStart');
            if (notifyExamStartEl) notifyExamStartEl.checked = settings.notification.notifyExamStart !== false;
            const notifyExamEndEl = document.getElementById('notifyExamEnd');
            if (notifyExamEndEl) notifyExamEndEl.checked = settings.notification.notifyExamEnd !== false;
            const notifyScoreAvailableEl = document.getElementById('notifyScoreAvailable');
            if (notifyScoreAvailableEl) notifyScoreAvailableEl.checked = settings.notification.notifyScoreAvailable !== false;
        }

        // Fill security settings
        if (settings.security) {
            const sessionTimeoutEl = document.getElementById('sessionTimeout');
            if (sessionTimeoutEl) sessionTimeoutEl.value = settings.security.sessionTimeout || 30;
            const maxLoginAttemptsEl = document.getElementById('maxLoginAttempts');
            if (maxLoginAttemptsEl) maxLoginAttemptsEl.value = settings.security.maxLoginAttempts || 5;
            const accountLockoutDurationEl = document.getElementById('accountLockoutDuration');
            if (accountLockoutDurationEl) accountLockoutDurationEl.value = settings.security.accountLockoutDuration || 15;
            const requireStrongPasswordEl = document.getElementById('requireStrongPassword');
            if (requireStrongPasswordEl) requireStrongPasswordEl.checked = settings.security.requireStrongPassword === true;
            const enableTwoFactorEl = document.getElementById('enableTwoFactor');
            if (enableTwoFactorEl) enableTwoFactorEl.checked = settings.security.enableTwoFactor === true;
            const enableIPWhitelistEl = document.getElementById('enableIPWhitelist');
            if (enableIPWhitelistEl) enableIPWhitelistEl.checked = settings.security.enableIPWhitelist === true;
        }

        // Fill display settings
        if (settings.display) {
            const languageEl = document.getElementById('language');
            if (languageEl) languageEl.value = settings.display.language || 'vi';

            const primaryColorEl = document.getElementById('primaryColor');
            if (primaryColorEl) primaryColorEl.value = settings.display.primaryColor || ADMIN_PRIMARY_COLOR;

            const tabColorEl = document.getElementById('tabColor');
            if (tabColorEl) tabColorEl.value = settings.display.tabColor || '#667eea';

            const tabColorHexEl = document.getElementById('tabColorHex');
            if (tabColorHexEl) tabColorHexEl.value = settings.display.tabColor || '#667eea';

            const fontSizeEl = document.getElementById('fontSize');
            if (fontSizeEl) fontSizeEl.value = settings.display.fontSize || 'medium';

            const compactModeEl = document.getElementById('compactMode');
            if (compactModeEl) compactModeEl.checked = settings.display.compactMode === true;

            const showAnimationsEl = document.getElementById('showAnimations');
            if (showAnimationsEl) showAnimationsEl.checked = settings.display.showAnimations !== false;

            const showTooltipsEl = document.getElementById('showTooltips');
            if (showTooltipsEl) showTooltipsEl.checked = settings.display.showTooltips !== false;

            const itemsPerPageEl = document.getElementById('itemsPerPage');
            if (itemsPerPageEl) itemsPerPageEl.value = settings.display.itemsPerPage || 25;

            // Áp dụng settings ngay lập tức
            applyDisplaySettings(settings.display);

            // Lưu vào localStorage
            localStorage.setItem('systemSettings', JSON.stringify(settings));
        }

        // Fill email settings
        if (settings.email) {
            const smtpHostEl = document.getElementById('smtpHost');
            if (smtpHostEl) smtpHostEl.value = settings.email.smtpHost || '';
            const smtpPortEl = document.getElementById('smtpPort');
            if (smtpPortEl) smtpPortEl.value = settings.email.smtpPort || '';
            const smtpSecureEl = document.getElementById('smtpSecure');
            if (smtpSecureEl) smtpSecureEl.value = settings.email.smtpSecure || 'tls';
            const smtpEmailEl = document.getElementById('smtpEmail');
            if (smtpEmailEl) smtpEmailEl.value = settings.email.smtpEmail || '';
            const emailFromNameEl = document.getElementById('emailFromName');
            if (emailFromNameEl) emailFromNameEl.value = settings.email.emailFromName || '';
            // Không fill password field vì lý do bảo mật
        }

        // Fill user settings
        if (settings.user) {
            const minPasswordLengthEl = document.getElementById('minPasswordLength');
            if (minPasswordLengthEl) minPasswordLengthEl.value = settings.user.minPasswordLength || 8;
            const passwordExpiryDaysEl = document.getElementById('passwordExpiryDays');
            if (passwordExpiryDaysEl) passwordExpiryDaysEl.value = settings.user.passwordExpiryDays || 90;
            const preventPasswordReuseEl = document.getElementById('preventPasswordReuse');
            if (preventPasswordReuseEl) preventPasswordReuseEl.checked = settings.user.preventPasswordReuse === true;
            const allowStudentRegistrationEl = document.getElementById('allowStudentRegistration');
            if (allowStudentRegistrationEl) allowStudentRegistrationEl.checked = settings.user.allowStudentRegistration === true;
            const requireEmailVerificationEl = document.getElementById('requireEmailVerification');
            if (requireEmailVerificationEl) requireEmailVerificationEl.checked = settings.user.requireEmailVerification === true;
            const maxStudentsPerClassEl = document.getElementById('maxStudentsPerClass');
            if (maxStudentsPerClassEl) maxStudentsPerClassEl.value = settings.user.maxStudentsPerClass || 50;
        }

        // Fill system settings
        if (settings.system) {
            const questionsPerPageEl = document.getElementById('questionsPerPage');
            if (questionsPerPageEl) questionsPerPageEl.value = settings.system.questionsPerPage || 20;
            const autoSaveIntervalEl = document.getElementById('autoSaveInterval');
            if (autoSaveIntervalEl) autoSaveIntervalEl.value = settings.system.autoSaveInterval || 60;
            const logRetentionDaysEl = document.getElementById('logRetentionDays');
            if (logRetentionDaysEl) logRetentionDaysEl.value = settings.system.logRetentionDays || 30;
            const backupFrequencyEl = document.getElementById('backupFrequency');
            if (backupFrequencyEl) backupFrequencyEl.value = settings.system.backupFrequency || 7;
            const enableMaintenanceModeEl = document.getElementById('enableMaintenanceMode');
            if (enableMaintenanceModeEl) enableMaintenanceModeEl.checked = settings.system.enableMaintenanceMode === true;
            const enableCachingEl = document.getElementById('enableCaching');
            if (enableCachingEl) enableCachingEl.checked = settings.system.enableCaching !== false;
            // Không fill password field vì lý do bảo mật
        }

        // Fill backup settings
        if (settings.backup) {
            const backupScheduleEl = document.getElementById('backupSchedule');
            if (backupScheduleEl) backupScheduleEl.value = settings.backup.schedule || 'weekly';
            const backupRetentionEl = document.getElementById('backupRetention');
            if (backupRetentionEl) backupRetentionEl.value = settings.backup.retention || 7;
            const backupIncludeFilesEl = document.getElementById('backupIncludeFiles');
            if (backupIncludeFilesEl) backupIncludeFilesEl.checked = settings.backup.includeFiles !== false;
            const backupCompressEl = document.getElementById('backupCompress');
            if (backupCompressEl) backupCompressEl.checked = settings.backup.compress !== false;
        }

        // Fill logs settings
        if (settings.logs) {
            const logLevelEl = document.getElementById('logLevel');
            if (logLevelEl) logLevelEl.value = settings.logs.level || 'info';
            const maxLogFileSizeEl = document.getElementById('maxLogFileSize');
            if (maxLogFileSizeEl) maxLogFileSizeEl.value = settings.logs.maxFileSize || 10;
            const logUserActionsEl = document.getElementById('logUserActions');
            if (logUserActionsEl) logUserActionsEl.checked = settings.logs.logUserActions === true;
            const logAPIRequestsEl = document.getElementById('logAPIRequests');
            if (logAPIRequestsEl) logAPIRequestsEl.checked = settings.logs.logAPIRequests === true;
            const enableSystemMonitoringEl = document.getElementById('enableSystemMonitoring');
            if (enableSystemMonitoringEl) enableSystemMonitoringEl.checked = settings.logs.enableSystemMonitoring === true;
            const monitoringIntervalEl = document.getElementById('monitoringInterval');
            if (monitoringIntervalEl) monitoringIntervalEl.value = settings.logs.monitoringInterval || 5;
            const cpuThresholdEl = document.getElementById('cpuThreshold');
            if (cpuThresholdEl) cpuThresholdEl.value = settings.logs.cpuThreshold || 80;
            const ramThresholdEl = document.getElementById('ramThreshold');
            if (ramThresholdEl) ramThresholdEl.value = settings.logs.ramThreshold || 85;
        }

        // Fill API settings
        if (settings.api) {
            const enableAPIEl = document.getElementById('enableAPI');
            if (enableAPIEl) enableAPIEl.checked = settings.api.enableAPI === true;
            const apiKeyEl = document.getElementById('apiKey');
            if (apiKeyEl) apiKeyEl.value = settings.api.apiKey || '';
            const apiRateLimitEl = document.getElementById('apiRateLimit');
            if (apiRateLimitEl) apiRateLimitEl.value = settings.api.rateLimit || 100;
            const apiTokenExpiryEl = document.getElementById('apiTokenExpiry');
            if (apiTokenExpiryEl) apiTokenExpiryEl.value = settings.api.tokenExpiry || 60;
            const enableGoogleIntegrationEl = document.getElementById('enableGoogleIntegration');
            if (enableGoogleIntegrationEl) enableGoogleIntegrationEl.checked = settings.api.enableGoogleIntegration === true;
            const googleClientIdEl = document.getElementById('googleClientId');
            if (googleClientIdEl) googleClientIdEl.value = settings.api.googleClientId || '';
            const enableFacebookIntegrationEl = document.getElementById('enableFacebookIntegration');
            if (enableFacebookIntegrationEl) enableFacebookIntegrationEl.checked = settings.api.enableFacebookIntegration === true;
            const facebookAppIdEl = document.getElementById('facebookAppId');
            if (facebookAppIdEl) facebookAppIdEl.value = settings.api.facebookAppId || '';
            const webhookUrlEl = document.getElementById('webhookUrl');
            if (webhookUrlEl) webhookUrlEl.value = settings.api.webhookUrl || '';
            const webhookOnExamStartEl = document.getElementById('webhookOnExamStart');
            if (webhookOnExamStartEl) webhookOnExamStartEl.checked = settings.api.webhookOnExamStart === true;
            const webhookOnExamEndEl = document.getElementById('webhookOnExamEnd');
            if (webhookOnExamEndEl) webhookOnExamEndEl.checked = settings.api.webhookOnExamEnd === true;
        }

        // Fill performance settings
        if (settings.performance) {
            const perfEl = document.getElementById('enableCDN');
            if (perfEl) perfEl.checked = settings.performance.enableCDN === true;
            const cdnUrlEl = document.getElementById('cdnUrl');
            if (cdnUrlEl) cdnUrlEl.value = settings.performance.cdnUrl || '';
            const gzipEl = document.getElementById('enableGzip');
            if (gzipEl) gzipEl.checked = settings.performance.enableGzip === true;
            const cacheDurEl = document.getElementById('cacheDuration');
            if (cacheDurEl) cacheDurEl.value = settings.performance.cacheDuration || 3600;
            const poolEl = document.getElementById('dbPoolSize');
            if (poolEl) poolEl.value = settings.performance.dbPoolSize || 10;
            const queryCacheEl = document.getElementById('enableQueryCache');
            if (queryCacheEl) queryCacheEl.checked = settings.performance.enableQueryCache === true;
            const queryDurEl = document.getElementById('queryCacheDuration');
            if (queryDurEl) queryDurEl.value = settings.performance.queryCacheDuration || 300;
            const imgOptEl = document.getElementById('enableImageOptimization');
            if (imgOptEl) imgOptEl.checked = settings.performance.enableImageOptimization === true;
            const maxImgEl = document.getElementById('maxImageSize');
            if (maxImgEl) maxImgEl.value = settings.performance.maxImageSize || 5;
            const imgQualEl = document.getElementById('imageQuality');
            if (imgQualEl) imgQualEl.value = settings.performance.imageQuality || 80;
        }
    } catch (err) {
        console.error('Lỗi tải cài đặt:', err);
        showNotification('Lỗi tải cài đặt: ' + err.message, 'error');
        // Vẫn hiển thị form với giá trị mặc định
    }
}

// Save settings
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
        try {
            const settings = {
                exam: {
                    defaultDuration: parseInt(document.getElementById('defaultDuration').value),
                    defaultPassingScore: parseFloat(document.getElementById('defaultPassingScore').value),
                    enableAutoSubmit: document.getElementById('enableAutoSubmit').checked,
                    enableReviewBeforeSubmit: document.getElementById('enableReviewBeforeSubmit').checked
                },
                antiCheat: {
                    maxWarnings: parseInt(document.getElementById('maxWarnings').value),
                    enableWebcamMonitoring: document.getElementById('enableWebcamMonitoring').checked,
                    enableTabSwitchDetection: document.getElementById('enableTabSwitchDetection').checked,
                    enableCopyPasteDetection: document.getElementById('enableCopyPasteDetection').checked
                },
                notification: {
                    enableEmail: document.getElementById('enableEmail').checked,
                    notifyExamStart: document.getElementById('notifyExamStart').checked,
                    notifyExamEnd: document.getElementById('notifyExamEnd').checked,
                    notifyScoreAvailable: document.getElementById('notifyScoreAvailable').checked
                },
                security: {
                    sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
                    maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts').value),
                    accountLockoutDuration: parseInt(document.getElementById('accountLockoutDuration').value),
                    requireStrongPassword: document.getElementById('requireStrongPassword').checked,
                    enableTwoFactor: document.getElementById('enableTwoFactor').checked,
                    enableIPWhitelist: document.getElementById('enableIPWhitelist').checked
                },
                display: {
                    language: document.getElementById('language').value,
                    primaryColor: document.getElementById('primaryColor').value,
                    tabColor: document.getElementById('tabColor')?.value || '#8ea7e9',
                    fontSize: document.getElementById('fontSize').value,
                    compactMode: document.getElementById('compactMode').checked,
                    showAnimations: document.getElementById('showAnimations').checked,
                    showTooltips: document.getElementById('showTooltips').checked,
                    itemsPerPage: parseInt(document.getElementById('itemsPerPage').value)
                },
                email: {
                    smtpHost: document.getElementById('smtpHost').value,
                    smtpPort: document.getElementById('smtpPort').value ? parseInt(document.getElementById('smtpPort').value) : null,
                    smtpSecure: document.getElementById('smtpSecure').value,
                    smtpEmail: document.getElementById('smtpEmail').value,
                    emailFromName: document.getElementById('emailFromName').value
                },
                user: {
                    minPasswordLength: parseInt(document.getElementById('minPasswordLength').value),
                    passwordExpiryDays: parseInt(document.getElementById('passwordExpiryDays').value),
                    preventPasswordReuse: document.getElementById('preventPasswordReuse').checked,
                    allowStudentRegistration: document.getElementById('allowStudentRegistration').checked,
                    requireEmailVerification: document.getElementById('requireEmailVerification').checked,
                    maxStudentsPerClass: parseInt(document.getElementById('maxStudentsPerClass').value)
                },
                system: {
                    questionsPerPage: parseInt(document.getElementById('questionsPerPage').value),
                    autoSaveInterval: parseInt(document.getElementById('autoSaveInterval').value),
                    logRetentionDays: parseInt(document.getElementById('logRetentionDays').value),
                    backupFrequency: parseInt(document.getElementById('backupFrequency').value),
                    enableMaintenanceMode: document.getElementById('enableMaintenanceMode').checked,
                    enableCaching: document.getElementById('enableCaching').checked
                },
                backup: {
                    schedule: document.getElementById('backupSchedule')?.value || 'weekly',
                    retention: parseInt(document.getElementById('backupRetention')?.value || 7),
                    includeFiles: document.getElementById('backupIncludeFiles')?.checked || false,
                    compress: document.getElementById('backupCompress')?.checked || false
                },
                logs: {
                    level: document.getElementById('logLevel')?.value || 'info',
                    maxFileSize: parseInt(document.getElementById('maxLogFileSize')?.value || 10),
                    logUserActions: document.getElementById('logUserActions')?.checked || false,
                    logAPIRequests: document.getElementById('logAPIRequests')?.checked || false,
                    enableSystemMonitoring: document.getElementById('enableSystemMonitoring')?.checked || false,
                    monitoringInterval: parseInt(document.getElementById('monitoringInterval')?.value || 5),
                    cpuThreshold: parseInt(document.getElementById('cpuThreshold')?.value || 80),
                    ramThreshold: parseInt(document.getElementById('ramThreshold')?.value || 85)
                },
                api: {
                    enableAPI: document.getElementById('enableAPI')?.checked || false,
                    apiKey: document.getElementById('apiKey')?.value || '',
                    rateLimit: parseInt(document.getElementById('apiRateLimit')?.value || 100),
                    tokenExpiry: parseInt(document.getElementById('apiTokenExpiry')?.value || 60),
                    enableGoogleIntegration: document.getElementById('enableGoogleIntegration')?.checked || false,
                    googleClientId: document.getElementById('googleClientId')?.value || '',
                    enableFacebookIntegration: document.getElementById('enableFacebookIntegration')?.checked || false,
                    facebookAppId: document.getElementById('facebookAppId')?.value || '',
                    webhookUrl: document.getElementById('webhookUrl')?.value || '',
                    webhookOnExamStart: document.getElementById('webhookOnExamStart')?.checked || false,
                    webhookOnExamEnd: document.getElementById('webhookOnExamEnd')?.checked || false
                },
                performance: {
                    enableCDN: document.getElementById('enableCDN')?.checked || false,
                    cdnUrl: document.getElementById('cdnUrl')?.value || '',
                    enableGzip: document.getElementById('enableGzip')?.checked || false,
                    cacheDuration: parseInt(document.getElementById('cacheDuration')?.value || 3600),
                    dbPoolSize: parseInt(document.getElementById('dbPoolSize')?.value || 10),
                    enableQueryCache: document.getElementById('enableQueryCache')?.checked || false,
                    queryCacheDuration: parseInt(document.getElementById('queryCacheDuration')?.value || 300),
                    enableImageOptimization: document.getElementById('enableImageOptimization')?.checked || false,
                    maxImageSize: parseInt(document.getElementById('maxImageSize')?.value || 5),
                    imageQuality: parseInt(document.getElementById('imageQuality')?.value || 80)
                }
            };

            // Chỉ thêm password nếu có nhập
            const adminPassword = document.getElementById('defaultAdminPassword').value;
            if (adminPassword && adminPassword.trim() !== '') {
                settings.system.defaultAdminPassword = adminPassword;
            }

            const smtpPassword = document.getElementById('smtpPassword').value;
            if (smtpPassword && smtpPassword.trim() !== '') {
                settings.email.smtpPassword = smtpPassword;
            }

            // Sử dụng apiPost từ api.js
            await apiPost('/api/admin/settings', settings, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            showNotification('Lưu cài đặt thành công!', 'success');
            // Clear password field sau khi lưu
            const adminPasswordField = document.getElementById('defaultAdminPassword');
            if (adminPasswordField) adminPasswordField.value = '';

            // Lưu tất cả settings vào localStorage để áp dụng ngay
            localStorage.setItem('systemSettings', JSON.stringify(settings));

            // Áp dụng display settings ngay sau khi lưu
            if (settings.display) {
                applyDisplaySettings(settings.display);
                localStorage.setItem('displaySettings', JSON.stringify(settings.display));
            }

            // Áp dụng các settings khác
            applySystemSettings(settings);
        } catch (err) {
            console.error('Lỗi lưu cài đặt:', err);
            showNotification('Lỗi: ' + err.message, 'error');
        }
    });
} else {
    console.error('Không tìm thấy nút saveSettingsBtn');
}

// Reset settings
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc muốn đặt lại tất cả cài đặt về mặc định?')) return;

        try {
            // Reset về default values
            document.getElementById('defaultDuration').value = 60;
            document.getElementById('defaultPassingScore').value = 5.0;
            document.getElementById('enableAutoSubmit').checked = true;
            document.getElementById('enableReviewBeforeSubmit').checked = true;

            document.getElementById('maxWarnings').value = 3;
            document.getElementById('enableWebcamMonitoring').checked = true;
            document.getElementById('enableTabSwitchDetection').checked = true;
            document.getElementById('enableCopyPasteDetection').checked = true;

            document.getElementById('enableEmail').checked = false;
            document.getElementById('notifyExamStart').checked = true;
            document.getElementById('notifyExamEnd').checked = true;
            document.getElementById('notifyScoreAvailable').checked = true;

            // Reset security settings
            document.getElementById('sessionTimeout').value = 30;
            document.getElementById('maxLoginAttempts').value = 5;
            document.getElementById('accountLockoutDuration').value = 15;
            document.getElementById('requireStrongPassword').checked = false;
            document.getElementById('enableTwoFactor').checked = false;
            document.getElementById('enableIPWhitelist').checked = false;

            // Reset display settings
            document.getElementById('language').value = 'vi';
            document.getElementById('primaryColor').value = ADMIN_PRIMARY_COLOR;
            const tabColorInput = document.getElementById('tabColor');
            const tabColorHexInput = document.getElementById('tabColorHex');
            if (tabColorInput) tabColorInput.value = '#8ea7e9';
            if (tabColorHexInput) tabColorHexInput.value = '#8ea7e9';
            setTabColor('#8ea7e9');
            document.getElementById('fontSize').value = 'medium';
            document.getElementById('compactMode').checked = false;
            document.getElementById('showAnimations').checked = true;
            document.getElementById('showTooltips').checked = true;
            document.getElementById('itemsPerPage').value = 25;

            // Reset email settings
            document.getElementById('smtpHost').value = '';
            document.getElementById('smtpPort').value = '';
            document.getElementById('smtpSecure').value = 'tls';
            document.getElementById('smtpEmail').value = '';
            document.getElementById('smtpPassword').value = '';
            document.getElementById('emailFromName').value = '';

            // Reset user settings
            document.getElementById('minPasswordLength').value = 8;
            document.getElementById('passwordExpiryDays').value = 90;
            document.getElementById('preventPasswordReuse').checked = false;
            document.getElementById('allowStudentRegistration').checked = true;
            document.getElementById('requireEmailVerification').checked = false;
            document.getElementById('maxStudentsPerClass').value = 50;

            // Reset system settings
            document.getElementById('questionsPerPage').value = 20;
            document.getElementById('autoSaveInterval').value = 60;
            document.getElementById('logRetentionDays').value = 30;
            document.getElementById('backupFrequency').value = 7;
            document.getElementById('enableMaintenanceMode').checked = false;
            document.getElementById('enableCaching').checked = true;
            document.getElementById('defaultAdminPassword').value = '';

            showNotification('Đã đặt lại về mặc định. Nhấn "Lưu cài đặt" để áp dụng.', 'info');
        } catch (err) {
            console.error('Lỗi reset settings:', err);
            showNotification('Lỗi: ' + err.message, 'error');
        }
    });
} else {
    console.error('Không tìm thấy nút resetSettingsBtn');
}

// SYSTEM SETTINGS MANAGER - ÁP DỤNG TẤT CẢ SETTINGS

// Hàm lấy settings từ localStorage hoặc trả về default
function getSystemSettings() {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Lỗi parse system settings:', e);
        }
    }
    return null;
}

// Hàm lấy một setting cụ thể
function getSetting(category, key, defaultValue = null) {
    const settings = getSystemSettings();
    if (settings && settings[category] && settings[category][key] !== undefined) {
        return settings[category][key];
    }
    return defaultValue;
}

// Áp dụng tất cả system settings
function applySystemSettings(settings) {
    if (!settings) return;

    // Áp dụng exam settings
    if (settings.exam) {
        // Có thể thêm logic để áp dụng exam settings vào các form tạo exam
    }

    // Áp dụng security settings
    if (settings.security) {
        // Có thể thêm logic để áp dụng security settings
    }

    // Áp dụng notification settings
    if (settings.notification) {
        // Có thể thêm logic để áp dụng notification settings
    }

    // Áp dụng user settings
    if (settings.user) {
        // Có thể thêm logic để áp dụng user settings
    }

    // Áp dụng system settings
    if (settings.system) {
        // Có thể thêm logic để áp dụng system settings
    }
}

// ÁP DỤNG MÀU TABS
function applyTabColor(color) {
    if (!color) return;

    // Tạo hoặc cập nhật style cho tabs
    let style = document.getElementById('dynamic-tab-color');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-tab-color';
        document.head.appendChild(style);
    }

    style.textContent = `
        .sidebar .nav-link:hover,
        .sidebar .nav-link.active {
            background-color: ${color} !important;
            color: #FFFFFF !important;
        }
        .sidebar .nav-link:hover i,
        .sidebar .nav-link.active i {
            color: #FFFFFF !important;
        }
    `;
}

// DISPLAY SETTINGS - ÁP DỤNG NGAY
function applyDisplaySettings(displaySettings) {
    if (!displaySettings) return;

    // Áp dụng màu tabs
    if (displaySettings.tabColor) {
        applyTabColor(displaySettings.tabColor);
    }

    // Áp dụng màu chủ đạo
    if (displaySettings.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', displaySettings.primaryColor);
        // Áp dụng cho các button primary
        const style = document.createElement('style');
        style.id = 'dynamic-primary-color';
        style.textContent = `
            .btn-primary, .btn-primary:hover, .btn-primary:focus {
                background-color: ${displaySettings.primaryColor} !important;
                border-color: ${displaySettings.primaryColor} !important;
            }
            .btn-outline-primary {
                color: ${displaySettings.primaryColor} !important;
                border-color: ${displaySettings.primaryColor} !important;
            }
            .btn-outline-primary:hover {
                background-color: ${displaySettings.primaryColor} !important;
                color: white !important;
            }
            .nav-link.active {
                color: ${displaySettings.primaryColor} !important;
            }
            .text-primary {
                color: ${displaySettings.primaryColor} !important;
            }
            a {
                color: ${displaySettings.primaryColor} !important;
            }
            a:hover {
                color: ${displaySettings.primaryColor} !important;
                opacity: 0.8;
            }
        `;
        // Xóa style cũ nếu có
        const oldStyle = document.getElementById('dynamic-primary-color');
        if (oldStyle) oldStyle.remove();
        document.head.appendChild(style);
    }

    // Áp dụng font size
    if (displaySettings.fontSize) {
        const fontSizeMap = {
            'small': '14px',
            'medium': '16px',
            'large': '18px'
        };
        const fontSize = fontSizeMap[displaySettings.fontSize] || '16px';
        document.documentElement.style.setProperty('--base-font-size', fontSize);
        document.body.style.fontSize = fontSize;
    }

    // Áp dụng ngôn ngữ
    if (displaySettings.language) {
        document.documentElement.lang = displaySettings.language;
        // Có thể thêm logic để thay đổi text dựa trên ngôn ngữ
        // Hiện tại chỉ set lang attribute
    }

    // Áp dụng compact mode
    if (displaySettings.compactMode) {
        document.body.classList.add('compact-mode');
    } else {
        document.body.classList.remove('compact-mode');
    }

    // Áp dụng animations
    if (!displaySettings.showAnimations) {
        document.body.classList.add('no-animations');
    } else {
        document.body.classList.remove('no-animations');
    }
}

function buildDisplaySettings(overrides = {}) {
    const getValue = (id, fallback, prop = 'value') => {
        const el = document.getElementById(id);
        if (!el) return fallback;
        return prop === 'checked' ? el.checked : (el.value || fallback);
    };

    return {
        primaryColor: getValue('primaryColor', '#7f8ac5'),
        tabColor: getValue('tabColor', '#8ea7e9'),
        language: getValue('language', 'vi'),
        fontSize: getValue('fontSize', 'medium'),
        compactMode: getValue('compactMode', false, 'checked'),
        showAnimations: getValue('showAnimations', true, 'checked'),
        showTooltips: getValue('showTooltips', true, 'checked'),
        itemsPerPage: parseInt(getValue('itemsPerPage', 25), 10) || 25,
        ...overrides
    };
}

function saveDisplaySettings(settings) {
    applyDisplaySettings(settings);
    localStorage.setItem('displaySettings', JSON.stringify(settings));
}

// Sử dụng setTimeout để đảm bảo DOM đã sẵn sàng
setTimeout(function () {
    const primaryColorEl = document.getElementById('primaryColor');
    if (primaryColorEl) {
        primaryColorEl.addEventListener('input', function () {
            const displaySettings = buildDisplaySettings({ primaryColor: this.value });
            saveDisplaySettings(displaySettings);
        });
    }

    const languageEl = document.getElementById('language');
    if (languageEl) {
        languageEl.addEventListener('change', function () {
            const displaySettings = buildDisplaySettings({ language: this.value });
            saveDisplaySettings(displaySettings);
            showNotification('Ngôn ngữ đã thay đổi. Vui lòng làm mới trang để áp dụng đầy đủ.', 'info');
        });
    }

    const fontSizeEl = document.getElementById('fontSize');
    if (fontSizeEl) {
        fontSizeEl.addEventListener('change', function () {
            const displaySettings = buildDisplaySettings({ fontSize: this.value });
            saveDisplaySettings(displaySettings);
        });
    }

    const compactModeEl = document.getElementById('compactMode');
    if (compactModeEl) {
        compactModeEl.addEventListener('change', function () {
            const displaySettings = buildDisplaySettings({ compactMode: this.checked });
            saveDisplaySettings(displaySettings);
        });
    }

    const showAnimationsEl = document.getElementById('showAnimations');
    if (showAnimationsEl) {
        showAnimationsEl.addEventListener('change', function () {
            const displaySettings = buildDisplaySettings({ showAnimations: this.checked });
            saveDisplaySettings(displaySettings);
        });
    }

    // Xử lý màu tabs
    const tabColorEl = document.getElementById('tabColor');
    const tabColorHexEl = document.getElementById('tabColorHex');

    if (tabColorEl) {
        tabColorEl.addEventListener('input', function () {
            const color = this.value;
            if (tabColorHexEl) tabColorHexEl.value = color;
            updateTabColor(color);
        });
    }

    if (tabColorHexEl) {
        tabColorHexEl.addEventListener('input', function () {
            const color = this.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                if (tabColorEl) tabColorEl.value = color;
                updateTabColor(color);
            }
        });
    }

    // Load display settings từ localStorage khi trang load
    const savedDisplaySettings = localStorage.getItem('displaySettings');
    if (savedDisplaySettings) {
        try {
            const settings = JSON.parse(savedDisplaySettings);
            applyDisplaySettings(settings);
            if (settings.tabColor) {
                if (tabColorEl) tabColorEl.value = settings.tabColor;
                if (tabColorHexEl) tabColorHexEl.value = settings.tabColor;
            }
        } catch (e) {
            console.error('Lỗi parse display settings:', e);
        }
    }
}, 500);

// Cập nhật màu tabs và lưu vào settings
function updateTabColor(color) {
    const displaySettings = buildDisplaySettings({ tabColor: color });
    saveDisplaySettings(displaySettings);
    showNotification('Màu tabs đã được cập nhật!', 'success');
}

// Đặt màu tabs từ nút preset
function setTabColor(color) {
    const tabColorEl = document.getElementById('tabColor');
    const tabColorHexEl = document.getElementById('tabColorHex');

    if (tabColorEl) tabColorEl.value = color;
    if (tabColorHexEl) tabColorHexEl.value = color;

    updateTabColor(color);
}

// Reset màu tabs về mặc định
function resetTabColor() {
    const defaultColor = '#8ea7e9';
    setTabColor(defaultColor);
}

// Hàm cập nhật biểu đồ userChart
function updateUserChart(role, data) {
    const userCtx = document.getElementById('userChart');
    if (userCtx.chartInstance) {
        userCtx.chartInstance.destroy();
    }

    const chartData = role === 'Student' ? data.studentData : data.teacherData;
    const label = role === 'Student' ? 'Sinh viên mới' : 'Giáo viên mới';
    const labels = data.months || ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'];

    userCtx.chartInstance = new Chart(userCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: chartData || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                borderColor: role === 'Student' ? ADMIN_PRIMARY_COLOR : '#198754',
                backgroundColor: role === 'Student' ? ADMIN_PRIMARY_BG : 'rgba(25, 135, 84, 0.15)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// Hàm tạo lại biểu đồ với loại mới
function recreateChart(ctx, type, data, options) {
    if (ctx.chartInstance) {
        ctx.chartInstance.destroy();
    }
    ctx.chartInstance = new Chart(ctx.getContext('2d'), {
        type: type,
        data: data,
        options: options
    });
}

// Hàm lấy dữ liệu thống kê
async function loadDashboardData() {
    try {
        // Lấy dữ liệu thống kê tổng quan
        // Sử dụng apiGet từ api.js
        const statsData = await apiGet('/api/admin/stats');

        // Lấy dữ liệu biểu đồ
        const chartsData = await apiGet('/api/admin/dashboard/charts');


        // Cập nhật thống kê
        const statValues = document.querySelectorAll('#dashboard-section .stat-value');
        if (statValues[0]) statValues[0].textContent = statsData.students || 0;
        if (statValues[1]) statValues[1].textContent = statsData.teachers || 0;
        if (statValues[2]) statValues[2].textContent = statsData.activeExams || 0;
        if (statValues[3]) statValues[3].textContent = statsData.questions || 0;

        // Cập nhật phần trăm thay đổi
        const statChanges = document.querySelectorAll('#dashboard-section .stat-change');
        if (statChanges[0]) {
            const studentChange = chartsData.changes?.students || 0;
            const isPositive = studentChange >= 0;
            statChanges[0].innerHTML = `<i class="bi bi-arrow-${isPositive ? 'up' : 'down'}"></i> ${Math.abs(studentChange)}% so với tháng trước`;
            statChanges[0].className = `stat-change ${isPositive ? 'text-success' : 'text-danger'}`;
        }
        if (statChanges[1]) {
            const teacherChange = chartsData.changes?.teachers || 0;
            const isPositive = teacherChange >= 0;
            statChanges[1].innerHTML = `<i class="bi bi-arrow-${isPositive ? 'up' : 'down'}"></i> ${Math.abs(teacherChange)}% so với tháng trước`;
            statChanges[1].className = `stat-change ${isPositive ? 'text-success' : 'text-danger'}`;
        }
        if (statChanges[2]) {
            const examChange = chartsData.changes?.exams || 0;
            const isPositive = examChange >= 0;
            statChanges[2].innerHTML = `<i class="bi bi-arrow-${isPositive ? 'up' : 'down'}"></i> ${Math.abs(examChange)}% so với tháng trước`;
            statChanges[2].className = `stat-change ${isPositive ? 'text-success' : 'text-danger'}`;
        }
        if (statChanges[3]) {
            const newQuestions = chartsData.changes?.newQuestions || 0;
            statChanges[3].innerHTML = `<i class="bi bi-plus"></i> +${newQuestions} câu hỏi mới`;
            statChanges[3].className = 'stat-change text-success';
        }

        // 1. Biểu đồ người dùng mới
        const userChartCtx = document.getElementById('userChart');
        if (userChartCtx) {
            const userChartType = document.getElementById('userChartType')?.value || 'line';
            const isStudent = document.getElementById('studentBtn')?.classList.contains('active') !== false;

            const chartData = {
                student: chartsData.userChart?.students || [],
                teacher: chartsData.userChart?.teachers || []
            };
            const chartLabels = chartsData.userChart?.labels || [];

            userChartCtx.chartData = chartData;
            userChartCtx.chartLabels = chartLabels; // Lưu labels để dùng sau
            userChartCtx.currentType = userChartType;
            userChartCtx.isStudent = isStudent;

            const currentData = isStudent ? chartData.student : chartData.teacher;
            const currentColor = isStudent ? ADMIN_PRIMARY_COLOR : '#198754';
            const areaBackground = isStudent ? ADMIN_PRIMARY_BG : 'rgba(25, 135, 84, 0.15)';
            const currentLabel = isStudent ? 'Sinh viên mới' : 'Giáo viên mới';

            // Chart.js không có type "area", cần dùng "line" với fill: true
            const chartType = userChartType === 'area' ? 'line' : userChartType;

            let chartConfig = {
                labels: chartLabels,
                datasets: [{
                    label: currentLabel,
                    data: currentData,
                    borderColor: currentColor,
                    backgroundColor: userChartType === 'area' ? areaBackground : currentColor,
                    tension: userChartType === 'line' || userChartType === 'area' ? 0.4 : 0,
                    fill: userChartType === 'area'
                }]
            };

            recreateChart(userChartCtx, chartType, chartConfig, {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            });
        }

        // 2. Biểu đồ tỷ lệ hoàn thành
        const completionCtx = document.getElementById('completionChart');
        if (completionCtx) {
            const completionChartType = document.getElementById('completionChartType')?.value || 'doughnut';
            const completionData = chartsData.completionChart || {};

            // Cập nhật phần trăm
            document.getElementById('completedPercent').textContent = completionData.completed?.toFixed(1) + '%' || '0%';
            document.getElementById('inProgressPercent').textContent = completionData.inProgress?.toFixed(1) + '%' || '0%';
            document.getElementById('abandonedPercent').textContent = completionData.abandoned?.toFixed(1) + '%' || '0%';

            const completionChartData = {
                labels: ['Hoàn thành', 'Đang làm', 'Bỏ dở'],
                datasets: [{
                    data: [
                        completionData.completed || 0,
                        completionData.inProgress || 0,
                        completionData.abandoned || 0
                    ],
                    backgroundColor: ['#198754', '#ffc107', '#dc3545']
                }]
            };

            recreateChart(completionCtx, completionChartType, completionChartData, {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: completionChartType === 'bar' ? 'top' : 'bottom',
                        display: completionChartType !== 'bar'
                    }
                },
                scales: completionChartType === 'bar' ? { y: { beginAtZero: true } } : {}
            });
        }

        // 3. Biểu đồ phân bố điểm số
        const scoreCtx = document.getElementById('scoreChart');
        if (scoreCtx) {
            const scoreChartType = document.getElementById('scoreChartType')?.value || 'bar';
            const scoreData = chartsData.scoreChart || {};

            const scoreChartData = {
                labels: scoreData.labels || [],
                datasets: [{
                    label: 'Số sinh viên',
                    data: scoreData.data || [],
                    backgroundColor: scoreChartType === 'pie' || scoreChartType === 'doughnut'
                        ? ['#dc3545', '#fd7e14', '#ffc107', '#198754', ADMIN_PRIMARY_COLOR]
                        : ADMIN_PRIMARY_COLOR
                }]
            };

            recreateChart(scoreCtx, scoreChartType, scoreChartData, {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: scoreChartType === 'pie' || scoreChartType === 'doughnut',
                        position: 'bottom'
                    }
                },
                scales: scoreChartType === 'bar' || scoreChartType === 'line' ? { y: { beginAtZero: true } } : {}
            });
        }

        // 4. Biểu đồ kỳ thi theo tháng
        const examCtx = document.getElementById('examChart');
        if (examCtx) {
            const examChartType = document.getElementById('examChartType')?.value || 'bar';
            const examData = chartsData.examChart || {};

            const examChartData = {
                labels: examData.labels || [],
                datasets: [{
                    label: 'Kỳ thi',
                    data: examData.data || [],
                    backgroundColor: examChartType === 'bar' ? '#198754' : 'rgba(25, 135, 84, 0.25)',
                    borderColor: '#198754',
                    tension: examChartType === 'line' || examChartType === 'area' ? 0.4 : 0,
                    fill: examChartType === 'area' ? 'origin' : false
                }]
            };

            // Chart.js không có type "area", cần dùng "line" với fill: true
            const validExamChartType = examChartType === 'area' ? 'line' : examChartType;

            recreateChart(examCtx, validExamChartType, examChartData, {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            });
        }

        // Thêm event listeners cho các dropdown chọn loại biểu đồ
        setupChartTypeListeners();

        // Thêm event listeners cho nút Sinh viên/Giáo viên
        setupUserRoleButtons();

        // Tải hoạt động gần đây
        loadRecentActivities();

        // Kiểm tra cảnh báo gian lận
        checkCheatingAlerts();

    } catch (err) {
        console.error('Lỗi chi tiết:', err);
        showNotification('Lỗi tải dữ liệu thống kê: ' + err.message, 'error');
    }
}

// Hàm tải hoạt động gần đây
async function loadRecentActivities() {
    const activitiesList = document.getElementById('recentActivitiesList');
    if (!activitiesList) return;

    try {
        // Sử dụng apiGet/apiPost từ api.js
        const activities = await apiGet('/api/admin/recent-activities', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (activities.length === 0) {
            activitiesList.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-inbox"></i>
                    <p class="mb-0 mt-2">Chưa có hoạt động nào gần đây</p>
                </div>
            `;
            return;
        }

        activitiesList.innerHTML = activities.map(activity => {
            let clickHandler = '';
            if (activity.exam_id) {
                clickHandler = `onclick="switchSection('exams'); setTimeout(() => { if (typeof viewExamDetail === 'function') viewExamDetail(${activity.exam_id}); }, 100);"`;
            } else if (activity.user_id) {
                clickHandler = `onclick="switchSection('users');"`;
            }

            const cursorStyle = clickHandler ? 'cursor: pointer;' : '';

            return `
                <div class="border-bottom pb-2 mb-2" style="${cursorStyle}" ${clickHandler}>
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <span style="font-size: 1.2em;">${activity.icon}</span>
                                <strong class="small">${activity.title}</strong>
                            </div>
                            <div class="text-muted small">${activity.content}</div>
                        </div>
                        <span class="text-muted small">${activity.time}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Lỗi tải hoạt động gần đây:', err);
        activitiesList.innerHTML = `
            <div class="text-center text-danger py-3">
                <i class="bi bi-exclamation-triangle"></i>
                <p class="mb-0 mt-2">Không thể tải hoạt động</p>
            </div>
        `;
    }
}

// Hàm kiểm tra cảnh báo gian lận
async function checkCheatingAlerts() {
    try {
        // Sử dụng apiGet/apiPost từ api.js
        const data = await apiGet('/api/admin/monitor/cheating/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const totalViolations = data.totalStats?.total_violations || 0;
        const recentViolations = data.dailyStats?.reduce((sum, day) => sum + (day.count || 0), 0) || 0;

        const cheatingAlert = document.getElementById('cheatingAlert');
        if (cheatingAlert) {
            if (recentViolations > 0) {
                cheatingAlert.style.display = 'block';
                cheatingAlert.innerHTML = `
                    <i class="bi bi-exclamation-triangle"></i> 
                    <small>Có ${recentViolations} cảnh báo gian lận trong 24h qua</small>
                `;
            } else {
                cheatingAlert.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Lỗi kiểm tra cảnh báo:', err);
    }
}

// Hàm thiết lập event listeners cho các dropdown chọn loại biểu đồ
function setupChartTypeListeners() {
    // Biểu đồ người dùng
    const userChartType = document.getElementById('userChartType');
    if (userChartType) {
        userChartType.addEventListener('change', (e) => {
            const userChartCtx = document.getElementById('userChart');
            if (userChartCtx && userChartCtx.chartData) {
                const newType = e.target.value;
                const isStudent = userChartCtx.isStudent !== false;
                const currentData = isStudent ? userChartCtx.chartData.student : userChartCtx.chartData.teacher;
                const currentColor = isStudent ? ADMIN_PRIMARY_COLOR : '#198754';
                const currentLabel = isStudent ? 'Sinh viên mới' : 'Giáo viên mới';
                const areaBackground = isStudent ? ADMIN_PRIMARY_BG : 'rgba(25, 135, 84, 0.15)';

                // Lấy labels từ dữ liệu đã lưu, nếu không có thì dùng mặc định
                const chartLabels = userChartCtx.chartLabels || ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

                // Chart.js không có type "area", cần dùng "line" với fill: true
                const chartType = newType === 'area' ? 'line' : newType;

                const chartConfig = {
                    labels: chartLabels,
                    datasets: [{
                        label: currentLabel,
                        data: currentData,
                        borderColor: currentColor,
                        backgroundColor: newType === 'area' ? areaBackground : currentColor,
                        tension: newType === 'line' || newType === 'area' ? 0.4 : 0,
                        fill: newType === 'area'
                    }]
                };

                recreateChart(userChartCtx, chartType, chartConfig, {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                });
                userChartCtx.currentType = newType;
            }
        });
    }

    // Biểu đồ tỷ lệ hoàn thành
    const completionChartType = document.getElementById('completionChartType');
    if (completionChartType) {
        completionChartType.addEventListener('change', async (e) => {
            const completionCtx = document.getElementById('completionChart');
            if (completionCtx) {
                try {
                    // Sử dụng apiGet/apiPost từ api.js
                    const data = await apiGet('/api/admin/dashboard/charts', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const completionData = data.completionChart || {};

                    const chartData = {
                        labels: ['Hoàn thành', 'Đang làm', 'Bỏ dở'],
                        datasets: [{
                            data: [
                                completionData.completed || 0,
                                completionData.inProgress || 0,
                                completionData.abandoned || 0
                            ],
                            backgroundColor: ['#198754', '#ffc107', '#dc3545']
                        }]
                    };

                    recreateChart(completionCtx, e.target.value, chartData, {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                position: e.target.value === 'bar' ? 'top' : 'bottom',
                                display: e.target.value !== 'bar'
                            }
                        },
                        scales: e.target.value === 'bar' ? { y: { beginAtZero: true } } : {}
                    });
                } catch (err) {
                    console.error('Lỗi cập nhật biểu đồ:', err);
                }
            }
        });
    }

    // Biểu đồ phân bố điểm
    const scoreChartType = document.getElementById('scoreChartType');
    if (scoreChartType) {
        scoreChartType.addEventListener('change', async (e) => {
            const scoreCtx = document.getElementById('scoreChart');
            if (scoreCtx) {
                try {
                    // Sử dụng apiGet/apiPost từ api.js
                    const data = await apiGet('/api/admin/dashboard/charts', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const scoreData = data.scoreChart || {};

                    const chartData = {
                        labels: scoreData.labels || [],
                        datasets: [{
                            label: 'Số sinh viên',
                            data: scoreData.data || [],
                            backgroundColor: e.target.value === 'pie' || e.target.value === 'doughnut'
                                ? ['#dc3545', '#fd7e14', '#ffc107', '#198754', ADMIN_PRIMARY_COLOR]
                                : ADMIN_PRIMARY_COLOR
                        }]
                    };

                    recreateChart(scoreCtx, e.target.value, chartData, {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                display: e.target.value === 'pie' || e.target.value === 'doughnut',
                                position: 'bottom'
                            }
                        },
                        scales: e.target.value === 'bar' || e.target.value === 'line' ? { y: { beginAtZero: true } } : {}
                    });
                } catch (err) {
                    console.error('Lỗi cập nhật biểu đồ:', err);
                }
            }
        });
    }

    // Biểu đồ kỳ thi
    const examChartType = document.getElementById('examChartType');
    if (examChartType) {
        examChartType.addEventListener('change', async (e) => {
            const examCtx = document.getElementById('examChart');
            if (examCtx) {
                try {
                    // Sử dụng apiGet/apiPost từ api.js
                    const data = await apiGet('/api/admin/dashboard/charts', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const examData = data.examChart || {};

                    const chartData = {
                        labels: examData.labels || [],
                        datasets: [{
                            label: 'Kỳ thi',
                            data: examData.data || [],
                            backgroundColor: e.target.value === 'bar' ? '#198754' : 'rgba(25, 135, 84, 0.25)',
                            borderColor: '#198754',
                            tension: e.target.value === 'line' || e.target.value === 'area' ? 0.4 : 0,
                            fill: e.target.value === 'area' ? 'origin' : false
                        }]
                    };

                    // Chart.js không có type "area", cần dùng "line" với fill: true
                    const chartType = e.target.value === 'area' ? 'line' : e.target.value;

                    recreateChart(examCtx, chartType, chartData, {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                    });
                } catch (err) {
                    console.error('Lỗi cập nhật biểu đồ:', err);
                }
            }
        });
    }
}

// Hàm thiết lập event listeners cho nút Sinh viên/Giáo viên
function setupUserRoleButtons() {
    const studentBtn = document.getElementById('studentBtn');
    const teacherBtn = document.getElementById('teacherBtn');
    const userChartCtx = document.getElementById('userChart');

    if (studentBtn && teacherBtn && userChartCtx && userChartCtx.chartData) {
        // Xóa event listeners cũ
        const newStudentBtn = studentBtn.cloneNode(true);
        const newTeacherBtn = teacherBtn.cloneNode(true);
        studentBtn.parentNode.replaceChild(newStudentBtn, studentBtn);
        teacherBtn.parentNode.replaceChild(newTeacherBtn, teacherBtn);

        newStudentBtn.addEventListener('click', () => {
            newStudentBtn.classList.add('active');
            newTeacherBtn.classList.remove('active');
            if (userChartCtx.chartInstance && userChartCtx.chartData) {
                const chartType = userChartCtx.currentType || 'line';
                userChartCtx.isStudent = true;
                userChartCtx.chartInstance.data.datasets[0].label = 'Sinh viên mới';
                userChartCtx.chartInstance.data.datasets[0].data = userChartCtx.chartData.student;
                userChartCtx.chartInstance.data.datasets[0].borderColor = ADMIN_PRIMARY_COLOR;
                userChartCtx.chartInstance.data.datasets[0].backgroundColor = chartType === 'area'
                    ? ADMIN_PRIMARY_BG
                    : ADMIN_PRIMARY_COLOR;
                // Đảm bảo fill được set đúng cho biểu đồ vùng
                if (userChartCtx.chartInstance.data.datasets[0].fill !== undefined) {
                    userChartCtx.chartInstance.data.datasets[0].fill = chartType === 'area';
                }
                userChartCtx.chartInstance.update();
            }
        });

        newTeacherBtn.addEventListener('click', () => {
            newTeacherBtn.classList.add('active');
            newStudentBtn.classList.remove('active');
            if (userChartCtx.chartInstance && userChartCtx.chartData) {
                const chartType = userChartCtx.currentType || 'line';
                userChartCtx.isStudent = false;
                userChartCtx.chartInstance.data.datasets[0].label = 'Giáo viên mới';
                userChartCtx.chartInstance.data.datasets[0].data = userChartCtx.chartData.teacher;
                userChartCtx.chartInstance.data.datasets[0].borderColor = '#198754';
                userChartCtx.chartInstance.data.datasets[0].backgroundColor = chartType === 'area'
                    ? 'rgba(25, 135, 84, 0.15)'
                    : '#198754';
                // Đảm bảo fill được set đúng cho biểu đồ vùng
                if (userChartCtx.chartInstance.data.datasets[0].fill !== undefined) {
                    userChartCtx.chartInstance.data.datasets[0].fill = chartType === 'area';
                }
                userChartCtx.chartInstance.update();
            }
        });
    }
}

// Hàm lọc và render bảng users
function filterUsersData() {
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase().trim() || '';
    const roleFilter = document.getElementById('userRoleFilter')?.value || '';
    const statusFilter = document.getElementById('userStatusFilter')?.value || '';

    let filteredUsers = allUsers;

    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user =>
            user.full_name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        );
    }

    if (roleFilter) {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
    }

    if (statusFilter) {
        filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
    }

    const tbody = document.querySelector('#users-section tbody');
    const cardView = document.getElementById('usersCardView');

    if (!tbody && !cardView) {
        console.error('Không tìm thấy tbody hoặc cardView trong users-section');
        showNotification('Lỗi giao diện: Không tìm thấy bảng người dùng', 'error');
        return;
    }

    if (filteredUsers.length === 0) {
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Không tìm thấy dữ liệu phù hợp</td></tr>';
        }
        if (cardView) {
            cardView.innerHTML = '<div class="col-12 text-center text-muted py-4">Không tìm thấy dữ liệu phù hợp</div>';
        }
        return;
    }

    let tableHTML = '';
    let cardHTML = '';

    filteredUsers.forEach(user => {
        const roleClass = {
            'Student': 'bg-primary',
            'Teacher': 'bg-success',
            'Admin': 'bg-danger'
        }[user.role] || 'bg-secondary';

        const roleText = {
            'Student': 'Sinh viên',
            'Teacher': 'Giáo viên',
            'Admin': 'Quản trị viên'
        }[user.role] || user.role;

        const statusClass = user.status === 'active' ? 'bg-success' : 'bg-danger';
        const statusText = user.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động';
        const createdDate = new Date(user.created_at).toLocaleDateString('vi-VN');

        // Table row for desktop
        tableHTML += `
            <tr>
                <td>#${user.user_id}</td>
                <td><strong>${user.full_name}</strong></td>
                <td>${user.email}</td>
                <td><span class="badge ${roleClass}">${user.role}</span></td>
                <td>${createdDate}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="viewUser(${user.user_id})"><i class="bi bi-eye"></i></button>
                        ${user.role !== 'Admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id})"><i class="bi bi-trash"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;

        // Card for mobile
        cardHTML += `
            <div class="col-12">
                <div class="user-card">
                    <div class="user-card-header">
                        <span class="user-id">#${user.user_id}</span>
                    </div>
                    <div class="user-card-body">
                        <div class="user-name">${user.full_name}</div>
                        <div class="user-email">${user.email}</div>
                        <div class="user-badges">
                            <span class="badge ${roleClass}">${roleText}</span>
                            <span class="badge ${statusClass}">${statusText}</span>
                        </div>
                        <div class="user-date">
                            <i class="bi bi-calendar3"></i> ${createdDate}
                        </div>
                    </div>
                    <div class="user-card-footer">
                        <button class="btn btn-sm btn-info" onclick="viewUser(${user.user_id})" title="Xem chi tiết">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${user.role !== 'Admin' ? `
                            <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id})" title="Xóa">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    if (tbody) {
        tbody.innerHTML = tableHTML;
    }

    if (cardView) {
        cardView.innerHTML = cardHTML;
    }
}

// Hàm lấy danh sách người dùng
async function loadUsersData() {
    try {
        // Sử dụng apiGet/apiPost từ api.js
        const users = await apiGet('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        allUsers = users.map(user => ({
            ...user,
            status: user.status || 'active'
        }));

        filterUsersData();

        const userSearch = document.getElementById('userSearch');
        const userRoleFilter = document.getElementById('userRoleFilter');
        const userStatusFilter = document.getElementById('userStatusFilter');

        if (userSearch) {
            userSearch.addEventListener('input', filterUsersData);
        } else {
        }

        if (userRoleFilter) {
            userRoleFilter.addEventListener('change', filterUsersData);
        } else {
        }

        if (userStatusFilter) {
            userStatusFilter.addEventListener('change', filterUsersData);
        } else {
        }

    } catch (err) {
        console.error('Lỗi tải dữ liệu người dùng:', err);
        showNotification('Lỗi tải dữ liệu người dùng: ' + err.message, 'error');
    }
}

// Trong admin.html, hàm filterStudentsData
function filterStudentsData() {
    const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase().trim() || '';
    const tbody = document.querySelector('#studentListTableBody');
    if (!tbody) return;

    let filteredStudents = allStudents;

    if (searchTerm) {
        filteredStudents = filteredStudents.filter(student =>
            student.full_name.toLowerCase().includes(searchTerm)
        );
    }

    // Sắp xếp theo điểm
    const sortHeader = document.querySelector('#studentListTable .sortable[data-sort="avg_score"]');
    const sortOrder = sortHeader?.dataset.order || 'desc';
    filteredStudents.sort((a, b) => {
        const scoreA = Number(a.avg_score) || 0;
        const scoreB = Number(b.avg_score) || 0;
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });

    tbody.innerHTML = '';

    if (filteredStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Không tìm thấy sinh viên</td></tr>';
        return;
    }

    filteredStudents.forEach(student => {
        const score = Number(student.avg_score) || 0;
        const scoreClass = score >= 8 ? 'bg-success' : score >= 5 ? 'bg-warning' : 'bg-danger';
        // Lấy subjectId từ URL hoặc lưu trong biến toàn cục
        const subjectId = window.currentSubjectId || '';
        tbody.innerHTML += `
      <tr>
        <td>${student.user_id}</td>
        <td><strong>${student.full_name}</strong></td>
        <td>${student.email}</td>
        <td><span class="badge ${scoreClass}">${score.toFixed(1)}</span></td>
        <td>
          <button class="btn btn-sm btn-info" onclick="viewStudentScores(${subjectId}, ${student.user_id})">
            <i class="bi bi-eye"></i> Xem chi tiết
          </button>
        </td>
      </tr>
    `;
    });
}

// Cập nhật hàm viewSubject
async function viewSubject(subjectId) {
    try {
        // Lưu subjectId để dùng trong viewStudentScores
        window.currentSubjectId = subjectId;

        // Sử dụng apiGet từ api.js
        const data = await apiGet(`/api/admin/subjects/${subjectId}/details`);

        // Ẩn danh sách môn học, hiện chi tiết
        const subjectsList = document.getElementById('subjectsList');
        const subjectDetail = document.getElementById('subjectDetail');
        if (subjectsList) subjectsList.style.display = 'none';
        if (subjectDetail) subjectDetail.style.display = 'block';

        // Cập nhật thông tin
        document.getElementById('subjectNameDetail').textContent = data.subject_name || 'Không xác định';
        document.getElementById('studentCount').textContent = data.student_count || 0;
        document.getElementById('teacherName').textContent = data.teacher.full_name || 'Chưa có';
        document.getElementById('avgScore').textContent = Number(data.stats.avg_score || 0).toFixed(1);
        document.getElementById('maxScore').textContent = Number(data.stats.max_score || 0).toFixed(1);
        document.getElementById('minScore').textContent = Number(data.stats.min_score || 0).toFixed(1);

        // Lưu danh sách sinh viên
        allStudents = (data.students || []).map(student => ({
            ...student,
            avg_score: Number(student.avg_score) || 0
        }));

        // Render bảng sinh viên
        filterStudentsData();

        // Gắn sự kiện tìm kiếm sinh viên
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.value = '';
            studentSearch.addEventListener('input', filterStudentsData);
        }

        // Gắn sự kiện sắp xếp theo điểm
        const sortHeader = document.querySelector('#studentListTable .sortable[data-sort="avg_score"]');
        if (sortHeader) {
            sortHeader.addEventListener('click', () => {
                sortHeader.dataset.order = sortHeader.dataset.order === 'desc' ? 'asc' : 'desc';
                const icon = sortHeader.querySelector('i');
                if (icon) {
                    icon.className = sortHeader.dataset.order === 'desc' ? 'bi bi-sort-down' : 'bi bi-sort-up';
                }
                filterStudentsData();
            });
        }

        // Gắn sự kiện xuất CSV
        const exportBtn = document.getElementById('exportScoresBtn');
        if (exportBtn) {
            exportBtn.onclick = () => {
                const csvContent = [
                    ['ID', 'Họ tên', 'Email', 'Điểm trung bình'].join(','),
                    ...allStudents.map(student => [
                        student.user_id,
                        `"${student.full_name}"`,
                        student.email,
                        Number(student.avg_score || 0).toFixed(1)
                    ].join(','))
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${data.subject_name}_diem_sinh_vien.csv`;
                link.click();
                URL.revokeObjectURL(link.href);
                showNotification('Xuất file CSV thành công!', 'success');
            };
        }

        // Gắn sự kiện nút Quay lại
        const backBtn = document.getElementById('backToSubjectsBtn');
        if (backBtn) {
            backBtn.onclick = () => {
                if (subjectDetail) subjectDetail.style.display = 'none';
                if (subjectsList) subjectsList.style.display = 'block';
                loadSubjectsData();
            };
        }
    } catch (err) {
        console.error('Lỗi tải chi tiết môn học:', err);
        showNotification('Lỗi tải chi tiết môn học: ' + err.message, 'error');
    }
}
// Hàm lấy danh sách môn học
async function loadSubjectsData() {
    try {
        // Sử dụng apiGet/apiPost từ api.js
        const subjects = await apiGet('/api/admin/subjects', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const tbody = document.querySelector('#subjectsTableBody');
        tbody.innerHTML = '';

        if (subjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có dữ liệu</td></tr>';
        } else {
            subjects.forEach(subject => {
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${subject.subject_id}</strong></td>
                        <td>${subject.subject_name}</td>
                        <td>${subject.question_count || 0}</td>
                        <td>${subject.exam_count || 0}</td>
                        <td>${subject.class_count || 0}</td>
                        <td><span class="badge bg-success">${subject.status}</span></td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-info" onclick="viewSubject(${subject.subject_id})"><i class="bi bi-eye"></i></button>
                                <button class="btn btn-sm btn-danger" onclick="deleteSubject(${subject.subject_id}, '${subject.subject_name.replace(/'/g, "\\'")}')"><i class="bi bi-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        // Cập nhật thống kê môn học
        const statValue = document.querySelector('#subjects-section .stat-value');
        if (statValue) statValue.textContent = subjects.length;

        // Đảm bảo hiển thị danh sách môn học
        document.getElementById('subjectsList').style.display = 'block';
        document.getElementById('subjectDetail').style.display = 'none';
    } catch (err) {
        showNotification('Lỗi tải dữ liệu môn học: ' + err.message, 'error');
    }
}

// Hàm lấy danh sách kỳ thi
async function loadExamsData() {
    try {
        // Sử dụng apiGet/apiPost từ api.js
        const exams = await apiGet('/api/admin/exams', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const tbody = document.querySelector('#exams-section tbody');
        tbody.innerHTML = '';

        if (exams.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có dữ liệu</td></tr>';
            return;
        }

        exams.forEach(exam => {
            const statusClass = {
                'completed': 'bg-success',
                'active': 'bg-primary',
                'upcoming': 'bg-info'
            }[exam.status] || 'bg-secondary';

            tbody.innerHTML += `
                <tr>
                    <td>#${exam.exam_id}</td>
                    <td><strong>${exam.exam_name}</strong></td>
                    <td>${exam.subject_name || 'Chưa có môn'}</td>
                    <td>${exam.teacher_name || 'Chưa có giáo viên'}</td>
                    <td>${exam.duration} phút</td>
                    <td>${exam.student_count}</td>
                    <td><span class="badge ${statusClass}">${exam.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="viewExam(${exam.exam_id})"><i class="bi bi-eye"></i></button>
                            ${exam.status !== 'active' ? `<button class="btn btn-sm btn-danger" onclick="deleteExam(${exam.exam_id})"><i class="bi bi-trash"></i></button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        showNotification('Lỗi tải dữ liệu kỳ thi: ' + err.message, 'error');
    }
}

// Hàm lấy danh sách câu hỏi
async function loadQuestionsData() {
    try {
        // Sử dụng apiGet/apiPost từ api.js
        const questions = await apiGet('/api/admin/questions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const tbody = document.querySelector('#questions-section tbody');
        tbody.innerHTML = '';

        if (questions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có dữ liệu</td></tr>';
            return;
        }

        questions.forEach(question => {
            const difficultyClass = {
                'Easy': 'bg-success',
                'Medium': 'bg-warning',
                'Hard': 'bg-danger'
            }[question.difficulty] || 'bg-secondary';
            const rateClass = question.correct_rate >= 80 ? 'text-success' : question.correct_rate >= 50 ? 'text-warning' : 'text-danger';

            tbody.innerHTML += `
                <tr>
                    <td>#${question.question_id}</td>
                    <td><strong>${question.question_content}</strong></td>
                    <td>${question.subject_name || 'Chưa có môn'}</td>
                    <td><span class="badge ${difficultyClass}">${question.difficulty}</span></td>
                    <td>${question.type}</td>
                    <td><span class="${rateClass}">${question.correct_rate}%</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="viewQuestion(${question.question_id})"><i class="bi bi-eye"></i></button>
                            <button class="btn btn-sm btn-danger" onclick="deleteQuestion(${question.question_id})"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        showNotification('Lỗi tải dữ liệu câu hỏi: ' + err.message, 'error');
    }
}

// Khai báo biến cho reports section (cần đặt trước các hàm sử dụng nó)
let allReportsData = [];
let currentReportCharts = {};
let currentReportFilters = {
    period: 'month',
    subject_id: '',
    start_date: '',
    end_date: ''
};

// Xử lý thêm người dùng
document.getElementById('addUserBtn')?.addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();
});

document.getElementById('saveUserBtn')?.addEventListener('click', async () => {
    const username = document.getElementById('userUsername').value;
    const full_name = document.getElementById('userFullName').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;

    if (!username || !full_name || !email || !password || !role) {
        showNotification('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }

    try {
        // Sử dụng apiPost từ api.js
        await apiPost('/api/admin/users', { username, full_name, email, password, role }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        showNotification('Thêm người dùng thành công!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
        document.getElementById('addUserForm').reset();
        loadUsersData();
    } catch (err) {
        showNotification('Lỗi: ' + err.message, 'error');
    }
});

// Xử lý thêm môn học
document.getElementById('addSubjectBtn')?.addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('addSubjectModal'));
    modal.show();
});

document.getElementById('saveSubjectBtn')?.addEventListener('click', async () => {
    const subject_name = document.getElementById('subjectName').value;

    if (!subject_name) {
        showNotification('Vui lòng nhập tên môn học!', 'error');
        return;
    }

    try {
        // Sử dụng apiPost từ api.js
        await apiPost('/api/admin/subjects', { subject_name }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        showNotification('Thêm môn học thành công!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addSubjectModal')).hide();
        document.getElementById('addSubjectForm').reset();
        loadSubjectsData();
    } catch (err) {
        showNotification('Lỗi: ' + err.message, 'error');
    }
});

// Xử lý thêm kỳ thi
document.getElementById('addExamBtn')?.addEventListener('click', async () => {
    // Load danh sách môn học và giáo viên
    try {
        // Load subjects
        // Sử dụng apiGet từ api.js
        const subjects = await apiGet('/api/admin/subjects');

        const subjectSelect = document.getElementById('examSubjectId');
        subjectSelect.innerHTML = '<option value="">Chọn môn học</option>';
        subjects.forEach(subject => {
            subjectSelect.innerHTML += `<option value="${subject.subject_id}">${subject.subject_name}</option>`;
        });

        // Load teachers
        const users = await apiGet('/api/admin/users');
        const teachers = users.filter(u => u.role === 'Teacher');

        const teacherSelect = document.getElementById('examTeacherId');
        teacherSelect.innerHTML = '<option value="">Chọn giáo viên</option>';
        teachers.forEach(teacher => {
            teacherSelect.innerHTML += `<option value="${teacher.user_id}">${teacher.full_name} (${teacher.email})</option>`;
        });

        const modal = new bootstrap.Modal(document.getElementById('addExamModal'));
        modal.show();
    } catch (err) {
        showNotification('Lỗi tải dữ liệu: ' + err.message, 'error');
    }
});

document.getElementById('saveExamBtn')?.addEventListener('click', async () => {
    const exam_name = document.getElementById('examName').value;
    const subject_id = document.getElementById('examSubjectId').value;
    const duration = document.getElementById('examDuration').value;

    if (!exam_name || !subject_id || !duration) {
        showNotification('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }

    try {
        // Sử dụng apiPost từ api.js
        await apiPost('/api/admin/exams', {
            exam_name,
            subject_id: parseInt(subject_id),
            duration: parseInt(duration),
            teacher_id: document.getElementById('examTeacherId').value ? parseInt(document.getElementById('examTeacherId').value) : null
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        showNotification('Tạo kỳ thi thành công!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addExamModal')).hide();
        document.getElementById('addExamForm').reset();
        loadExamsData();
    } catch (err) {
        showNotification('Lỗi: ' + err.message, 'error');
    }
});

// Các hàm xóa
async function deleteUser(userId) {
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;

    try {
        // Sử dụng apiDelete từ api.js
        await apiDelete(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        showNotification('Xóa người dùng thành công!', 'success');
        loadUsersData();
    } catch (err) {
        showNotification('Lỗi: ' + err.message, 'error');
    }
}

async function deleteExam(examId) {
    if (!confirm('Bạn có chắc muốn xóa kỳ thi này?')) return;

    try {
        // Sử dụng apiDelete từ api.js
        await apiDelete(`/api/admin/exams/${examId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        showNotification('Xóa kỳ thi thành công!', 'success');
        loadExamsData();
    } catch (err) {
        showNotification('Lỗi: ' + err.message, 'error');
    }
}

// Xóa các câu hỏi trùng nhau trong ngân hàng câu hỏi (Admin)
async function removeDuplicateQuestions() {
    if (!confirm('⚠️ Bạn có chắc chắn muốn xóa tất cả các câu hỏi trùng nhau trong toàn bộ hệ thống?\n\nHệ thống sẽ giữ lại câu hỏi được tạo sớm nhất trong mỗi nhóm trùng và xóa các câu hỏi còn lại.\n\nHành động này không thể hoàn tác!')) {
        return;
    }

    const token = localStorage.getItem('token');
    const tbody = document.querySelector('#questionsTableBody') || document.querySelector('#questions-section tbody');

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center"><p>⏳ Đang xóa câu hỏi trùng nhau...</p></td></tr>';
    }

    try {
        // Sử dụng apiDelete từ api.js
        const result = await apiDelete('/api/admin/questions/duplicates', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (result.deleted_count > 0) {
            showNotification(
                `✅ Đã xóa ${result.deleted_count} câu hỏi trùng nhau!\nTìm thấy ${result.duplicates_found} nhóm câu hỏi trùng.`,
                'success'
            );

            // Reload danh sách câu hỏi
            await loadQuestionsData(1);
        } else {
            showNotification('ℹ️ Không có câu hỏi trùng nhau nào để xóa.', 'info');
            if (tbody) {
                await loadQuestionsData(1);
            }
        }

    } catch (error) {
        console.error('❌ Error removing duplicate questions:', error);
        showNotification(`❌ ${error.message}`, 'error');

        if (tbody) {
            await loadQuestionsData(1);
        }
    }
}

async function deleteQuestion(questionId) {
    if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;

    try {
        // Sử dụng apiGet/apiPost từ api.js
        // Sử dụng apiDelete từ api.js
        await apiDelete(`/api/admin/questions/${questionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        showNotification('Xóa câu hỏi thành công!', 'success');
        loadQuestionsData();
    } catch (err) {
        showNotification('Lỗi: ' + err.message, 'error');
    }
}

async function deleteSubject(subjectId, subjectName = '') {
    const confirmMsg = subjectName
        ? `Bạn có chắc muốn xóa môn học "${subjectName}"?`
        : 'Bạn có chắc muốn xóa môn học này?';

    if (!confirm(confirmMsg)) return;

    try {
        // Sử dụng apiDelete từ api.js
        await apiDelete(`/api/admin/subjects/${subjectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        showNotification('Xóa môn học thành công!', 'success');
        loadSubjectsData();
    } catch (err) {
        // Hiển thị thông báo lỗi chi tiết từ server
        const errorMsg = err.error?.error || err.message || 'Không thể xóa môn học';
        showNotification('Lỗi: ' + errorMsg, 'error');
    }
}

// Hàm lọc và render bảng log gian lận
let allCheatingLogs = [];
let cheatingLogsCurrentPage = 1;
const cheatingLogsPerPage = 15; // 15 logs per page

function filterCheatingLogs() {
    const examFilter = document.getElementById('examFilter')?.value || '';
    const studentFilter = document.getElementById('studentFilter')?.value || '';
    const eventTypeFilter = document.getElementById('eventTypeFilter')?.value || '';

    let filteredLogs = allCheatingLogs;

    if (examFilter) {
        filteredLogs = filteredLogs.filter(log => log.exam_id == examFilter);
    }
    if (studentFilter) {
        filteredLogs = filteredLogs.filter(log => log.student_id == studentFilter);
    }
    if (eventTypeFilter) {
        filteredLogs = filteredLogs.filter(log => log.event_type === eventTypeFilter);
    }

    const tbody = document.getElementById('cheatingTableBody');
    tbody.innerHTML = '';

    if (filteredLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Không tìm thấy dữ liệu</td></tr>';
        renderCheatingLogsPagination({ page: 1, totalPages: 0, total: 0 });
        return;
    }

    // Pagination logic
    const totalLogs = filteredLogs.length;
    const totalPages = Math.ceil(totalLogs / cheatingLogsPerPage);
    const startIndex = (cheatingLogsCurrentPage - 1) * cheatingLogsPerPage;
    const endIndex = Math.min(startIndex + cheatingLogsPerPage, totalLogs);
    const logsToDisplay = filteredLogs.slice(startIndex, endIndex);

    logsToDisplay.forEach(log => {
        const eventClass = {
            'TabSwitch': 'bg-warning',
            'CopyPaste': 'bg-danger',
            'WebcamSuspicious': 'bg-info'
        }[log.event_type] || 'bg-secondary';

        const eventLabels = {
            'TabSwitch': '🚫 Chuyển tab',
            'CopyPaste': '📋 Copy/Paste',
            'WebcamSuspicious': '📷 Webcam đáng ngờ'
        };

        const statusBadge = log.is_banned
            ? '<span class="badge bg-danger">Đã cấm</span>'
            : log.cheating_detected
                ? '<span class="badge bg-warning">Đã phát hiện</span>'
                : '<span class="badge bg-secondary">Đang theo dõi</span>';

        tbody.innerHTML += `
            <tr>
                <td><strong>${log.student_name || 'N/A'}</strong><br><small class="text-muted">ID: ${log.student_id}</small></td>
                <td>${log.exam_name || 'N/A'}</td>
                <td>${log.teacher_name || 'N/A'}</td>
                <td>${log.class_name || 'Chưa có lớp'}</td>
                <td><span class="badge ${eventClass}">${eventLabels[log.event_type] || log.event_type}</span></td>
                <td><small>${log.event_description || 'Không có mô tả'}</small></td>
                <td><small>${new Date(log.event_time).toLocaleString('vi-VN')}</small></td>
                <td>
                    ${log.video_path ? `
                        <button class="btn btn-sm btn-success" onclick="viewViolationVideo(${log.log_id}, 'admin')" title="Xem video vi phạm">
                            <i class="bi bi-play-circle"></i> Video
                        </button>
                    ` : '<span class="text-muted">-</span>'}
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        ${!log.is_banned ? `
                            <button class="btn btn-danger" onclick="penalize(${log.attempt_id}, 'ban', '${log.exam_name}', ${log.student_id})" title="Cấm thi">
                                <i class="bi bi-ban"></i>
                            </button>
                            <button class="btn btn-warning" onclick="penalize(${log.attempt_id}, 'deduct_points', '${log.exam_name}', ${log.student_id})" title="Trừ điểm">
                                <i class="bi bi-dash-circle"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-info" onclick="viewCheatingDetail(${log.attempt_id})" title="Xem chi tiết">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    // Render pagination
    renderCheatingLogsPagination({
        page: cheatingLogsCurrentPage,
        totalPages: Math.ceil(filteredLogs.length / cheatingLogsPerPage),
        total: filteredLogs.length
    });
}

// Render pagination cho cheating logs
function renderCheatingLogsPagination(pagination) {
    const paginationContainer = document.getElementById('cheatingLogsPagination');
    if (!paginationContainer) return;

    if (pagination.totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '<ul class="pagination justify-content-center">';

    // Nút Previous
    html += `<li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadCheatingLogsPage(${pagination.page - 1}); return false;">Trước</a>
    </li>`;

    // Các số trang
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadCheatingLogsPage(1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === pagination.page ? 'active' : ''}">
            <a class="page-link" href="#" onclick="loadCheatingLogsPage(${i}); return false;">${i}</a>
        </li>`;
    }

    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadCheatingLogsPage(${pagination.totalPages}); return false;">${pagination.totalPages}</a></li>`;
    }

    // Nút Next
    html += `<li class="page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadCheatingLogsPage(${pagination.page + 1}); return false;">Sau</a>
    </li>`;

    html += '</ul>';
    html += `<div class="text-center mt-2"><small class="text-muted">Trang ${pagination.page} / ${pagination.totalPages} (Tổng: ${pagination.total} log)</small></div>`;

    paginationContainer.innerHTML = html;
}

// Function to change cheating logs page
function loadCheatingLogsPage(page) {
    cheatingLogsCurrentPage = page;
    filterCheatingLogs();
}

// Hàm lấy dữ liệu giám sát gian lận (cải thiện)
async function loadCheatingData() {
    try {
        // Lấy filter params
        const examId = document.getElementById('examFilter')?.value || '';
        const studentId = document.getElementById('studentFilter')?.value || '';
        const eventType = document.getElementById('eventTypeFilter')?.value || '';
        const startDate = document.getElementById('startDateFilter')?.value || '';
        const endDate = document.getElementById('endDateFilter')?.value || '';

        let url = '/api/admin/monitor/cheating?';
        const params = [];
        if (examId) params.push(`exam_id=${examId}`);
        if (studentId) params.push(`student_id=${studentId}`);
        if (eventType) params.push(`event_type=${eventType}`);
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        url += params.join('&');

        // Sử dụng apiGet từ api.js
        const data = await apiGet(url);

        allCheatingLogs = data.logs;
        filterCheatingLogs();

        // Lấy danh sách bài thi để filter
        // Sử dụng apiGet từ api.js
        const exams = await apiGet('/api/admin/exams');
        const examFilter = document.getElementById('examFilter');
        examFilter.innerHTML = '<option value="">Tất cả kỳ thi</option>';
        exams.forEach(exam => {
            examFilter.innerHTML += `<option value="${exam.exam_id}">${exam.exam_name}</option>`;
        });

        // Lấy danh sách học sinh để filter - sử dụng apiGet
        const students = await apiGet('/api/admin/users');
        const studentFilter = document.getElementById('studentFilter');
        studentFilter.innerHTML = '<option value="">Tất cả học sinh</option>';
        students.filter(s => s.role === 'Student').forEach(student => {
            studentFilter.innerHTML += `<option value="${student.user_id}">${student.full_name}</option>`;
        });

        // Cập nhật thống kê - sử dụng apiGet
        const statsData = await apiGet('/api/admin/monitor/cheating/stats');

        // Cập nhật thống kê tổng quan
        const totalStats = statsData.totalStats || {};
        document.getElementById('totalViolations').textContent = totalStats.total_violations || 0;
        document.getElementById('violatingStudents').textContent = totalStats.total_violating_students || 0;
        document.getElementById('affectedExams').textContent = totalStats.affected_exams || 0;
        document.getElementById('bannedStudents').textContent = totalStats.banned_students || 0;

        // Cập nhật biểu đồ gian lận
        const cheatingCtx = document.getElementById('cheatingChart');
        if (cheatingCtx) {
            if (cheatingCtx.chartInstance) {
                cheatingCtx.chartInstance.destroy();
            }

            const eventLabels = {
                'TabSwitch': '🚫 Chuyển tab',
                'CopyPaste': '📋 Copy/Paste',
                'WebcamSuspicious': '📷 Webcam đáng ngờ'
            };

            cheatingCtx.chartInstance = new Chart(cheatingCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: statsData.stats.map(s => eventLabels[s.event_type] || s.event_type),
                    datasets: [{
                        label: 'Số lần vi phạm',
                        data: statsData.stats.map(s => s.count),
                        backgroundColor: ['#ffc107', '#dc3545', '#17a2b8'],
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        // Cập nhật top vi phạm
        const topViolators = document.getElementById('topViolators');
        topViolators.innerHTML = '';
        if (statsData.topViolators && statsData.topViolators.length > 0) {
            statsData.topViolators.forEach((v, index) => {
                topViolators.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-bold">#${index + 1} ${v.full_name}</div>
                            <small class="text-muted">${v.email || ''}</small>
                        </div>
                        <div class="text-end">
                            <span class="badge bg-danger rounded-pill">${v.violation_count}</span>
                            <div class="small text-muted">${v.affected_exams} bài thi</div>
                        </div>
                    </li>
                `;
            });
        } else {
            topViolators.innerHTML = '<li class="list-group-item text-center text-muted">Chưa có dữ liệu</li>';
        }

        // Cập nhật top bài thi vi phạm
        const topExamsBody = document.getElementById('topExamsBody');
        if (topExamsBody) {
            topExamsBody.innerHTML = '';
            if (statsData.topExams && statsData.topExams.length > 0) {
                statsData.topExams.forEach((exam, index) => {
                    topExamsBody.innerHTML += `
                        <tr>
                            <td><strong>#${index + 1} ${exam.exam_name}</strong></td>
                            <td>${exam.class_name || 'Chưa có lớp'}</td>
                            <td><span class="badge bg-danger">${exam.violation_count}</span></td>
                            <td><span class="badge bg-warning">${exam.violating_students}</span></td>
                        </tr>
                    `;
                });
            } else {
                topExamsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Chưa có dữ liệu</td></tr>';
            }
        }

        // Gắn sự kiện cho bộ lọc - reset về trang 1 khi filter thay đổi
        document.getElementById('examFilter')?.addEventListener('change', () => {
            cheatingLogsCurrentPage = 1;
            loadCheatingData();
        });
        document.getElementById('studentFilter')?.addEventListener('change', () => {
            cheatingLogsCurrentPage = 1;
            loadCheatingData();
        });
        document.getElementById('eventTypeFilter')?.addEventListener('change', () => {
            cheatingLogsCurrentPage = 1;
            loadCheatingData();
        });
        document.getElementById('startDateFilter')?.addEventListener('change', () => {
            cheatingLogsCurrentPage = 1;
            loadCheatingData();
        });
        document.getElementById('endDateFilter')?.addEventListener('change', () => {
            cheatingLogsCurrentPage = 1;
            loadCheatingData();
        });
        document.getElementById('refreshCheatingBtn')?.addEventListener('click', () => {
            document.getElementById('examFilter').value = '';
            document.getElementById('studentFilter').value = '';
            document.getElementById('eventTypeFilter').value = '';
            document.getElementById('startDateFilter').value = '';
            document.getElementById('endDateFilter').value = '';
            cheatingLogsCurrentPage = 1;
            loadCheatingData();
        });

        // Gắn sự kiện xuất CSV với filter hiện tại
        const exportBtn = document.getElementById('exportCheatingCsv');
        if (exportBtn) {
            // Xóa event listener cũ nếu có
            const newExportBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);

            newExportBtn.addEventListener('click', () => {
                // Lấy các filter hiện tại
                const examId = document.getElementById('examFilter')?.value || '';
                const studentId = document.getElementById('studentFilter')?.value || '';
                const eventType = document.getElementById('eventTypeFilter')?.value || '';
                const startDate = document.getElementById('startDateFilter')?.value || '';
                const endDate = document.getElementById('endDateFilter')?.value || '';

                // Build URL với query params
                let url = (window.CONFIG?.API_BASE_URL || '') + '/api/admin/monitor/cheating/export?';
                const params = [];
                if (examId) params.push(`exam_id=${encodeURIComponent(examId)}`);
                if (studentId) params.push(`student_id=${encodeURIComponent(studentId)}`);
                if (eventType) params.push(`event_type=${encodeURIComponent(eventType)}`);
                if (startDate) params.push(`start_date=${encodeURIComponent(startDate)}`);
                if (endDate) params.push(`end_date=${encodeURIComponent(endDate)}`);
                url += params.join('&');

                // Tạo form ẩn để submit với token
                const form = document.createElement('form');
                form.method = 'GET';
                form.action = url;
                form.style.display = 'none';

                // Thêm token vào header thông qua fetch thay vì form submit
                const token = localStorage.getItem('token');
                if (token) {
                    fetch(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Lỗi khi xuất CSV');
                            }
                            return response.blob();
                        })
                        .then(blob => {
                            // Tạo link download
                            const downloadUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.download = `log_gian_lan_${new Date().toISOString().split('T')[0]}.csv`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(downloadUrl);
                            showNotification('Xuất CSV thành công!', 'success');
                        })
                        .catch(err => {
                            console.error('Lỗi xuất CSV:', err);
                            showNotification('Lỗi khi xuất CSV: ' + err.message, 'error');
                        });
                } else {
                    // Nếu không có token, dùng window.location (sẽ redirect đến login nếu cần)
                    window.location.href = url;
                }
            });
        }
    } catch (err) {
        console.error('Lỗi tải dữ liệu gian lận:', err);
        showNotification('Lỗi tải dữ liệu gian lận: ' + err.message, 'error');
    }
}

// Hàm xử lý hành động cấm/trừ điểm (cải thiện)
async function penalize(attemptId, action, examName = '', studentId = null) {
    if (!confirm(`Bạn có chắc muốn ${action === 'ban' ? 'CẤM THI' : 'TRỪ ĐIỂM'} cho học sinh này?`)) {
        return;
    }

    try {
        let body = { attempt_id: attemptId, action };
        if (action === 'deduct_points') {
            const points = prompt(`Nhập số điểm trừ (0-10):`);
            if (!points || isNaN(points) || points < 0 || points > 10) {
                showNotification('Số điểm trừ không hợp lệ! Vui lòng nhập từ 0 đến 10', 'error');
                return;
            }
            body.points_deducted = parseFloat(points);
            body.reason = prompt('Nhập lý do trừ điểm:') || 'Vi phạm quy định thi';
        } else {
            body.reason = prompt('Nhập lý do cấm thi:') || 'Vi phạm quy định thi nghiêm trọng';
        }

        // Sử dụng apiPost từ api.js
        const data = await apiPost('/api/admin/penalize', body, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        showNotification(data.message || 'Thao tác thành công!', 'success');
        setTimeout(() => loadCheatingData(), 500);
    } catch (err) {
        console.error('Lỗi penalize:', err);
        showNotification('Lỗi: ' + (err.message || 'Không thể thực hiện thao tác'), 'error');
    }
}

// Hàm xem chi tiết vi phạm
// Hàm xem video vi phạm
function viewViolationVideo(logId, userRole = 'admin') {
    // Sử dụng API base URL từ config
    const apiBaseUrl = window.CONFIG?.API_BASE_URL || '';
    const basePath = userRole === 'admin'
        ? '/api/admin/monitor/cheating/video'
        : '/api/teacher/cheating/violation-video';

    // Build full URL
    let videoUrl = `${basePath}/${logId}`;
    if (apiBaseUrl) {
        const base = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
        videoUrl = `${base}${videoUrl}`;
    }

    const token = localStorage.getItem('token');

    // Thêm token vào query string (video element không thể set Authorization header)
    // Tuy không an toàn lắm nhưng đơn giản và hoạt động với video element
    const separator = videoUrl.includes('?') ? '&' : '?';
    videoUrl = `${videoUrl}${separator}token=${encodeURIComponent(token)}`;

    // Tạo modal để xem video
    const modal = document.createElement('div');
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">🎥 Video Vi Phạm</h5>
                    <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                </div>
                <div class="modal-body">
                    <video controls autoplay style="width: 100%; max-height: 70vh;" id="violationVideoPlayer">
                        <source src="${videoUrl}" type="video/mp4">
                        Trình duyệt của bạn không hỗ trợ video.
                    </video>
                    <div id="videoError" style="display: none; color: red; margin-top: 10px;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Đóng</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Xử lý lỗi video
    const videoPlayer = modal.querySelector('#violationVideoPlayer');
    const videoError = modal.querySelector('#videoError');

    videoPlayer.addEventListener('error', (e) => {
        console.error('❌ [Video] Error loading video:', e);
        videoError.style.display = 'block';
        videoError.textContent = 'Không thể tải video. Vui lòng kiểm tra lại.';
    });

    // Đóng khi click bên ngoài
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function viewCheatingDetail(attemptId) {
    try {
        const log = allCheatingLogs.find(l => l.attempt_id === attemptId);
        if (!log) {
            showNotification('Không tìm thấy thông tin vi phạm', 'error');
            return;
        }

        // Tìm tất cả vi phạm của attempt này
        const violations = allCheatingLogs.filter(l => l.attempt_id === attemptId);

        let message = `📋 Chi tiết vi phạm:\n\n`;
        message += `Học sinh: ${log.student_name}\n`;
        message += `Bài thi: ${log.exam_name}\n`;
        message += `Lớp: ${log.class_name || 'N/A'}\n`;
        message += `Giáo viên: ${log.teacher_name || 'N/A'}\n`;
        message += `Điểm: ${log.score || 'Chưa có'}\n`;
        message += `Trạng thái: ${log.is_banned ? 'Đã bị cấm' : 'Đang theo dõi'}\n\n`;
        message += `Tổng số vi phạm: ${violations.length}\n\n`;
        message += `Danh sách vi phạm:\n`;
        violations.forEach((v, i) => {
            message += `${i + 1}. ${v.event_type}: ${v.event_description} - ${new Date(v.event_time).toLocaleString('vi-VN')}\n`;
        });

        alert(message);
    } catch (err) {
        showNotification('Lỗi xem chi tiết: ' + err.message, 'error');
    }
}

// Hàm xem webcam
function viewWebcam(studentId) {
    let socket;
    if (typeof io !== 'undefined') {
        // Sử dụng CONFIG cho Socket.IO
        socket = io(window.CONFIG?.SOCKET_URL || window.location.origin, {
            auth: {
                token: localStorage.getItem('token')
            }
        });
    }
    socket.emit('request_webcam', { student_id: studentId });
    const modal = new bootstrap.Modal(document.getElementById('webcamModal'));
    modal.show();
}

// Hàm import câu hỏi
document.getElementById('importQuestionBtn')?.addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('importQuestionModal'));
    // Sử dụng apiGet từ api.js
    apiGet('/api/admin/exams').then(data => {
        const examSelect = document.getElementById('importExamId');
        examSelect.innerHTML = '<option value="">Không chọn kỳ thi</option>';
        data.forEach(exam => {
            examSelect.innerHTML += `<option value="${exam.exam_id}">${exam.exam_name}</option>`;
        });
    });
    modal.show();
});

document.getElementById('saveImportBtn')?.addEventListener('click', async () => {
    const examId = document.getElementById('importExamId').value;
    const file = document.getElementById('importFile').files[0];
    if (!file) {
        showNotification('Vui lòng chọn file!', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('exam_id', examId);
    formData.append('file', file);

    try {
        // Sử dụng fetch trực tiếp vì cần FormData
        const baseUrl = window.CONFIG?.API_BASE_URL || '';
        const response = await fetch(baseUrl + '/api/admin/questions/import', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Lỗi import câu hỏi');
        }
        const data = await response.json();

        showNotification(data.message, 'success');
        if (data.errors) {
            showNotification('Lỗi: ' + data.errors.join('\n'), 'error');
        }
        bootstrap.Modal.getInstance(document.getElementById('importQuestionModal')).hide();
        loadQuestionsData();
    } catch (err) {
        showNotification('Lỗi: ' + err.message, 'error');
    }
});

document.getElementById('previewImportBtn')?.addEventListener('click', async () => {
    const file = document.getElementById('importFile').files[0];
    if (!file) {
        showNotification('Vui lòng chọn file!', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        let questions = [];
        if (file.name.endsWith('.csv')) {
            questions = await new Promise((resolve, reject) => {
                parse(e.target.result, { columns: true, trim: true }, (err, output) => {
                    if (err) reject(err);
                    resolve(output);
                });
            });
        } else {
            const workbook = xlsx.read(e.target.result, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            questions = xlsx.utils.sheet_to_json(sheet);
        }

        const preview = document.getElementById('previewQuestions');
        preview.innerHTML = '';
        questions.forEach((q, i) => {
            preview.innerHTML += `
                <div class="mb-3">
                    <p><strong>Câu ${i + 1}: ${q['question_content'] || q['Câu hỏi']}</strong> (${q['question_type'] || q['Loại câu hỏi']}, ${q['difficulty'] || q['Độ khó']})</p>
                    ${q['option_1'] ? `
                        <p>Đáp án 1: ${q['option_1']}</p>
                        <p>Đáp án 2: ${q['option_2']}</p>
                        ${q['option_3'] ? `<p>Đáp án 3: ${q['option_3']}</p>` : ''}
                        ${q['option_4'] ? `<p>Đáp án 4: ${q['option_4']}</p>` : ''}
                    ` : ''}
                    <p>Đáp án đúng: ${q['correct_answer_text'] || q['Đáp án đúng']}</p>
                </div>
            `;
        });
    };
    reader.readAsArrayBuffer(file);
});

// Socket.IO cho thông báo gian lận
let socket;
if (typeof io !== 'undefined') {
    // Sử dụng CONFIG cho Socket.IO
    socket = io(window.CONFIG?.SOCKET_URL || window.location.origin, {
        auth: {
            token: localStorage.getItem('token')
        }
    });
    socket.on('connect', () => {
        socket.emit('join', 'admin');
    });
    socket.on('cheating_alert', (data) => {
        showNotification(`Vi phạm: ${data.event_type} từ học sinh ${data.student_id}`, 'warning');
        loadCheatingData();
    });
}

// Cập nhật loadQuestionsData để render bảng câu hỏi
// Biến cho pagination và filter câu hỏi
let questionsCurrentPage = 1;
let questionsTotalPages = 1;
let questionsFilters = {
    search: '',
    subject_id: '',
    difficulty: '',
    question_type: ''
};

async function loadQuestionsData(page = 1) {
    try {
        questionsCurrentPage = page;

        // Lấy filters từ UI nếu có
        const searchInput = document.getElementById('questionSearchInput');
        const subjectSelect = document.getElementById('questionSubjectFilter');
        const difficultySelect = document.getElementById('questionDifficultyFilter');
        const typeSelect = document.getElementById('questionTypeFilter');

        if (searchInput) questionsFilters.search = searchInput.value.trim();
        if (subjectSelect) questionsFilters.subject_id = subjectSelect.value;
        if (difficultySelect) questionsFilters.difficulty = difficultySelect.value;
        if (typeSelect) questionsFilters.question_type = typeSelect.value;

        // Tạo params
        const params = new URLSearchParams({
            page: page,
            limit: 20
        });

        if (questionsFilters.search) params.append('search', questionsFilters.search);
        if (questionsFilters.subject_id && questionsFilters.subject_id !== 'all') {
            params.append('subject_id', questionsFilters.subject_id);
        }
        if (questionsFilters.difficulty && questionsFilters.difficulty !== 'all') {
            params.append('difficulty', questionsFilters.difficulty);
        }
        if (questionsFilters.question_type && questionsFilters.question_type !== 'all') {
            params.append('question_type', questionsFilters.question_type);
        }

        // Sử dụng apiGet/apiPost từ api.js
        const data = await apiGet(`/api/admin/questions?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Xử lý cả format cũ (array) và format mới (object với pagination)
        const questions = Array.isArray(data) ? data : (data.questions || []);
        const pagination = data.pagination || { page: 1, totalPages: 1, total: questions.length };

        questionsCurrentPage = pagination.page;
        questionsTotalPages = pagination.totalPages;

        const tbody = document.querySelector('#questionsTableBody') || document.querySelector('#questions-section tbody');
        if (!tbody) {
            console.error('Không tìm thấy tbody cho câu hỏi');
            return;
        }

        tbody.innerHTML = '';

        if (questions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có dữ liệu</td></tr>';
            renderQuestionsPagination(pagination);
            return;
        }

        questions.forEach(question => {
            const difficultyClass = {
                'Easy': 'bg-success',
                'Medium': 'bg-warning',
                'Hard': 'bg-danger'
            }[question.difficulty] || 'bg-secondary';
            const rateClass = question.correct_rate >= 80 ? 'text-success' : question.correct_rate >= 50 ? 'text-warning' : 'text-danger';

            // Giới hạn độ dài nội dung câu hỏi để hiển thị
            const content = question.question_content || '';
            const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content;

            tbody.innerHTML += `
                <tr>
                    <td>#${question.question_id}</td>
                    <td><strong title="${content.replace(/"/g, '&quot;')}">${shortContent}</strong></td>
                    <td>${question.subject_name || 'Chưa có môn'}</td>
                    <td><span class="badge ${difficultyClass}">${question.difficulty}</span></td>
                    <td>${question.type}</td>
                    <td><span class="${rateClass}">${question.correct_rate}%</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="viewQuestion(${question.question_id})"><i class="bi bi-eye"></i></button>
                            <button class="btn btn-sm btn-danger" onclick="deleteQuestion(${question.question_id})"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });

        renderQuestionsPagination(pagination);
    } catch (err) {
        console.error('Lỗi tải câu hỏi:', err);
        showNotification('Lỗi tải dữ liệu câu hỏi: ' + err.message, 'error');
    }
}

// Render pagination cho câu hỏi
function renderQuestionsPagination(pagination) {
    const paginationContainer = document.getElementById('questionsPagination');
    if (!paginationContainer) return;

    if (pagination.totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '<ul class="pagination justify-content-center">';

    // Nút Previous
    html += `<li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadQuestionsData(${pagination.page - 1}); return false;">Trước</a>
    </li>`;

    // Các số trang
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadQuestionsData(1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === pagination.page ? 'active' : ''}">
            <a class="page-link" href="#" onclick="loadQuestionsData(${i}); return false;">${i}</a>
        </li>`;
    }

    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadQuestionsData(${pagination.totalPages}); return false;">${pagination.totalPages}</a></li>`;
    }

    // Nút Next
    html += `<li class="page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadQuestionsData(${pagination.page + 1}); return false;">Sau</a>
    </li>`;

    html += '</ul>';
    html += `<div class="text-center mt-2"><small class="text-muted">Trang ${pagination.page} / ${pagination.totalPages} (Tổng: ${pagination.total} câu hỏi)</small></div>`;

    paginationContainer.innerHTML = html;
}

// Load danh sách môn học cho filter
async function loadSubjectsForQuestionFilter() {
    try {
        // Sử dụng apiGet/apiPost từ api.js
        const subjects = await apiGet('/api/admin/subjects', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const select = document.getElementById('questionSubjectFilter');
        if (select) {
            select.innerHTML = '<option value="all">Tất cả</option>';
            subjects.forEach(subject => {
                select.innerHTML += `<option value="${subject.subject_id}">${subject.subject_name}</option>`;
            });
        }
    } catch (err) {
        console.error('Lỗi tải môn học cho filter:', err);
    }
}

// Event listeners cho filter
document.getElementById('questionSearchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loadQuestionsData(1);
    }
});

document.getElementById('questionSubjectFilter')?.addEventListener('change', () => {
    loadQuestionsData(1);
});

document.getElementById('questionDifficultyFilter')?.addEventListener('change', () => {
    loadQuestionsData(1);
});

document.getElementById('questionTypeFilter')?.addEventListener('change', () => {
    loadQuestionsData(1);
});

// Khởi tạo dữ liệu giám sát gian lận (đã được xử lý trong navigation handler ở trên)

// Các hàm view (placeholder cho users, exams, questions)
// Hàm xem chi tiết người dùng
async function viewUser(userId) {
    try {
        const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
        const contentDiv = document.getElementById('userDetailContent');

        // Hiển thị loading
        contentDiv.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
            </div>
        `;

        modal.show();

        // Lấy dữ liệu chi tiết
        // Sử dụng apiGet từ api.js
        const data = await apiGet(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const { user, stats = {}, recentActivity = [] } = data;

        // Xử lý an toàn cho full_name
        const fullName = user.full_name || user.username || 'N/A';
        const avatarInitial = fullName && fullName !== 'N/A' ? fullName.charAt(0).toUpperCase() : '?';

        // Định dạng giới tính
        const genderText = {
            'male': 'Nam',
            'female': 'Nữ',
            'other': 'Khác',
            'Chưa cập nhật': 'Chưa cập nhật'
        }[user.gender] || (user.gender || 'Chưa cập nhật');

        // Định dạng vai trò
        const roleText = {
            'Student': 'Sinh viên',
            'Teacher': 'Giáo viên',
            'Admin': 'Quản trị viên'
        }[user.role] || user.role;

        const roleClass = {
            'Student': 'bg-primary',
            'Teacher': 'bg-success',
            'Admin': 'bg-danger'
        }[user.role] || 'bg-secondary';

        // Render nội dung
        let html = `
            <div class="row">
                <!-- Thông tin cơ bản -->
                <div class="col-md-4">
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0"><i class="bi bi-person-circle"></i> Thông Tin Cơ Bản</h6>
                        </div>
                        <div class="card-body">
                            <div class="text-center mb-3">
                                <div class="avatar-lg mx-auto mb-2" style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold;">
                                    ${avatarInitial}
                                </div>
                                <h5 class="mb-1">${fullName}</h5>
                                <span class="badge ${roleClass}">${roleText}</span>
                            </div>
                            <hr>
                            <div class="mb-2">
                                <small class="text-muted">ID:</small>
                                <div><strong>#${user.user_id}</strong></div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Username:</small>
                                <div><strong>${user.username || 'N/A'}</strong></div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Email:</small>
                                <div>${user.email}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Giới tính:</small>
                                <div>${genderText}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Số điện thoại:</small>
                                <div>${user.phone || 'Chưa cập nhật'}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Ngày sinh:</small>
                                <div>${user.dob && user.dob !== 'Chưa cập nhật' ? new Date(user.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</div>
                            </div>
                            <hr>
                            <div class="mb-2">
                                <small class="text-muted">Ngày đăng ký:</small>
                                <div>${new Date(user.created_at).toLocaleDateString('vi-VN')}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Cập nhật lần cuối:</small>
                                <div>${user.updated_at ? new Date(user.updated_at).toLocaleDateString('vi-VN') : 'Chưa có'}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Đăng nhập:</small>
                                <div>
                                    ${user.has_password ? '<span class="badge bg-info">Email/Password</span>' : ''}
                                    ${user.google_id ? '<span class="badge bg-danger ms-1">Google</span>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Thống kê -->
                <div class="col-md-8">
        `;

        if (user.role === 'Student') {
            html += `
                    <div class="card mb-4">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class="bi bi-graph-up"></i> Thống Kê Học Tập</h6>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-primary mb-1">${stats.total_exams || 0}</div>
                                        <small class="text-muted">Tổng số bài thi</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-success mb-1">${stats.completed_exams || 0}</div>
                                        <small class="text-muted">Đã hoàn thành</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-info mb-1">${stats.total_attempts || 0}</div>
                                        <small class="text-muted">Tổng lượt thi</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-warning mb-1">${parseFloat(stats.avg_score || 0).toFixed(2)}</div>
                                        <small class="text-muted">Điểm trung bình</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-success mb-1">${parseFloat(stats.highest_score || 0).toFixed(2)}</div>
                                        <small class="text-muted">Điểm cao nhất</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-danger mb-1">${parseFloat(stats.lowest_score || 0).toFixed(2)}</div>
                                        <small class="text-muted">Điểm thấp nhất</small>
                                    </div>
                                </div>
                                ${stats.cheating_warnings > 0 ? `
                                <div class="col-md-12">
                                    <div class="alert alert-warning mb-0">
                                        <i class="bi bi-exclamation-triangle"></i> 
                                        <strong>Cảnh báo:</strong> Có ${stats.cheating_warnings} cảnh báo gian lận
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Lịch sử thi gần đây -->
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-clock-history"></i> Lịch Sử Thi Gần Đây</h6>
                        </div>
                        <div class="card-body">
            `;

            if (recentActivity && recentActivity.length > 0) {
                html += `
                            <div class="table-responsive">
                                <table class="table table-sm table-hover">
                                    <thead>
                                        <tr>
                                            <th>Bài thi</th>
                                            <th>Môn học</th>
                                            <th>Điểm</th>
                                            <th>Trạng thái</th>
                                            <th>Thời gian</th>
                                            <th>Cảnh báo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                `;

                recentActivity.forEach(attempt => {
                    const statusClass = attempt.status === 'Submitted' ? 'bg-success' :
                        attempt.status === 'In Progress' ? 'bg-warning' : 'bg-secondary';
                    const statusText = attempt.status === 'Submitted' ? 'Đã nộp' :
                        attempt.status === 'In Progress' ? 'Đang làm' : attempt.status;
                    const scoreDisplay = attempt.score !== null ? parseFloat(attempt.score).toFixed(2) : 'Chưa chấm';
                    const warningsBadge = attempt.warnings > 0 ?
                        `<span class="badge bg-danger">${attempt.warnings}</span>` :
                        '<span class="badge bg-success">0</span>';

                    html += `
                                        <tr>
                                            <td>${attempt.exam_name || 'N/A'}</td>
                                            <td>${attempt.subject_name || 'N/A'}</td>
                                            <td><strong>${scoreDisplay}</strong></td>
                                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                                            <td>${attempt.start_time ? new Date(attempt.start_time).toLocaleString('vi-VN') : 'N/A'}</td>
                                            <td>${warningsBadge}</td>
                                        </tr>
                    `;
                });

                html += `
                                    </tbody>
                                </table>
                            </div>
                `;
            } else {
                html += '<p class="text-muted text-center">Chưa có lịch sử thi</p>';
            }

            html += `
                        </div>
                    </div>
            `;

        } else if (user.role === 'Teacher') {
            html += `
                    <div class="card mb-4">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0"><i class="bi bi-graph-up"></i> Thống Kê Giảng Dạy</h6>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-primary mb-1">${stats.total_exams || 0}</div>
                                        <small class="text-muted">Tổng số kỳ thi</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-success mb-1">${stats.total_subjects || 0}</div>
                                        <small class="text-muted">Số môn học</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-info mb-1">${stats.total_students || 0}</div>
                                        <small class="text-muted">Số học sinh</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-warning mb-1">${stats.total_attempts || 0}</div>
                                        <small class="text-muted">Tổng lượt thi</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-success mb-1">${stats.graded_attempts || 0}</div>
                                        <small class="text-muted">Đã chấm</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 border rounded">
                                        <div class="h4 text-primary mb-1">${stats.total_questions || 0}</div>
                                        <small class="text-muted">Câu hỏi đã tạo</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Kỳ thi gần đây -->
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-file-text"></i> Kỳ Thi Gần Đây</h6>
                        </div>
                        <div class="card-body">
            `;

            if (recentActivity && recentActivity.length > 0) {
                html += `
                            <div class="table-responsive">
                                <table class="table table-sm table-hover">
                                    <thead>
                                        <tr>
                                            <th>Tên kỳ thi</th>
                                            <th>Môn học</th>
                                            <th>Thời gian</th>
                                            <th>Số SV</th>
                                            <th>Điểm TB</th>
                                            <th>Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                `;

                recentActivity.forEach(exam => {
                    const statusClass = exam.status === 'active' ? 'bg-success' :
                        exam.status === 'upcoming' ? 'bg-info' :
                            exam.status === 'completed' ? 'bg-secondary' : 'bg-warning';
                    const statusText = exam.status === 'active' ? 'Đang diễn ra' :
                        exam.status === 'upcoming' ? 'Sắp tới' :
                            exam.status === 'completed' ? 'Đã kết thúc' : exam.status;

                    html += `
                                        <tr>
                                            <td><strong>${exam.exam_name || 'N/A'}</strong></td>
                                            <td>${exam.subject_name || 'N/A'}</td>
                                            <td>${exam.start_time ? new Date(exam.start_time).toLocaleString('vi-VN') : 'N/A'}</td>
                                            <td>${exam.student_count || 0}</td>
                                            <td><strong>${exam.avg_score || '0.00'}</strong></td>
                                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                                        </tr>
                    `;
                });

                html += `
                                    </tbody>
                                </table>
                            </div>
                `;
            } else {
                html += '<p class="text-muted text-center">Chưa có kỳ thi nào</p>';
            }

            html += `
                        </div>
                    </div>
            `;
        } else {
            // Admin
            html += `
                    <div class="card">
                        <div class="card-header bg-danger text-white">
                            <h6 class="mb-0"><i class="bi bi-shield-check"></i> Quản Trị Viên</h6>
                        </div>
                        <div class="card-body">
                            <p class="text-muted">Thông tin quản trị viên</p>
                        </div>
                    </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

    } catch (err) {
        console.error('Lỗi xem chi tiết người dùng:', err);
        const contentDiv = document.getElementById('userDetailContent');
        contentDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> 
                Lỗi tải thông tin: ${err.message}
            </div>
        `;
    }
}

// Hàm xem chi tiết kỳ thi
async function viewExam(examId) {
    try {
        const modal = new bootstrap.Modal(document.getElementById('viewExamModal'));
        const contentDiv = document.getElementById('examDetailContent');

        // Hiển thị loading
        contentDiv.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
            </div>
        `;

        modal.show();

        // Lấy dữ liệu chi tiết
        // Sử dụng apiGet từ api.js
        const data = await apiGet(`/api/admin/exams/${examId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const { exam, attempts, stats } = data;

        // Hiển thị chi tiết
        contentDiv.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h5 class="mb-3">Thông tin kỳ thi</h5>
                    <table class="table table-bordered">
                        <tr>
                            <th style="width: 40%;">Tên kỳ thi:</th>
                            <td><strong>${exam.exam_name}</strong></td>
                        </tr>
                        <tr>
                            <th>Môn học:</th>
                            <td>${exam.subject_name || 'Chưa có'}</td>
                        </tr>
                        <tr>
                            <th>Giáo viên:</th>
                            <td>${exam.teacher_name || 'Chưa có'}</td>
                        </tr>
                        <tr>
                            <th>Thời gian làm bài:</th>
                            <td>${exam.duration} phút</td>
                        </tr>
                        <tr>
                            <th>Trạng thái:</th>
                            <td>
                                <span class="badge ${exam.status === 'completed' ? 'bg-success' :
                exam.status === 'active' ? 'bg-primary' :
                    exam.status === 'upcoming' ? 'bg-info' : 'bg-secondary'
            }">${exam.status}</span>
                            </td>
                        </tr>
                        <tr>
                            <th>Tổng số học sinh:</th>
                            <td>${stats.total_students || 0}</td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h5 class="mb-3">Thống kê</h5>
                    <div class="row g-3">
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Tổng lượt thi</div>
                                <div class="stat-value">${stats.total_attempts || 0}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Đã nộp bài</div>
                                <div class="stat-value">${stats.submitted_count || 0}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Điểm trung bình</div>
                                <div class="stat-value">${parseFloat(stats.avg_score || 0).toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Tỷ lệ hoàn thành</div>
                                <div class="stat-value">${parseFloat(stats.completion_rate || 0).toFixed(1)}%</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Điểm cao nhất</div>
                                <div class="stat-value">${parseFloat(stats.highest_score || 0).toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Điểm thấp nhất</div>
                                <div class="stat-value">${parseFloat(stats.lowest_score || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <h5 class="mb-3">Danh sách học sinh tham gia</h5>
            <div class="table-responsive">
                <table class="table table-hover table-sm">
                    <thead>
                        <tr>
                            <th>Họ tên</th>
                            <th>Email</th>
                            <th>Điểm số</th>
                            <th>Trạng thái</th>
                            <th>Thời gian làm</th>
                            <th>Cảnh báo gian lận</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${attempts.length === 0 ?
                '<tr><td colspan="6" class="text-center">Chưa có học sinh nào tham gia</td></tr>' :
                attempts.map(attempt => `
                                <tr>
                                    <td>${attempt.full_name}</td>
                                    <td>${attempt.email}</td>
                                    <td>
                                        ${attempt.score !== null ?
                        `<span class="badge ${parseFloat(attempt.score) >= 8 ? 'bg-success' :
                            parseFloat(attempt.score) >= 6.5 ? 'bg-primary' :
                                parseFloat(attempt.score) >= 5 ? 'bg-warning' : 'bg-danger'
                        }">${parseFloat(attempt.score).toFixed(2)}</span>` :
                        '<span class="text-muted">Chưa có</span>'
                    }
                                    </td>
                                    <td>
                                        <span class="badge ${attempt.status === 'Submitted' ? 'bg-success' :
                        attempt.status === 'InProgress' ? 'bg-primary' :
                            attempt.status === 'AutoSubmitted' ? 'bg-warning' : 'bg-secondary'
                    }">${attempt.status}</span>
                                    </td>
                                    <td>
                                        ${attempt.start_time ?
                        `${attempt.duration_minutes || 0} phút` :
                        'Chưa bắt đầu'
                    }
                                    </td>
                                    <td>
                                        ${attempt.cheating_warnings > 0 ?
                        `<span class="badge bg-danger">${attempt.cheating_warnings}</span>` :
                        '<span class="text-muted">0</span>'
                    }
                                    </td>
                                </tr>
                            `).join('')
            }
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        document.getElementById('examDetailContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Lỗi tải dữ liệu: ${err.message}
            </div>
        `;
    }
}

async function viewQuestion(questionId) {
    try {
        const modal = new bootstrap.Modal(document.getElementById('viewQuestionModal'));
        const contentDiv = document.getElementById('questionDetailContent');

        // Hiển thị loading
        contentDiv.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
            </div>
        `;

        modal.show();

        // Lấy dữ liệu câu hỏi từ API
        const question = await apiGet(`/api/admin/questions/${questionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        displayQuestionDetail(question, contentDiv);

    } catch (err) {
        console.error('Lỗi xem chi tiết câu hỏi:', err);
        const contentDiv = document.getElementById('questionDetailContent');
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> Lỗi: ${err.message}
                </div>
            `;
        }
        showNotification('Lỗi tải chi tiết câu hỏi: ' + err.message, 'error');
    }
}

function displayQuestionDetail(question, contentDiv) {
    const difficultyClass = {
        'Easy': 'bg-success',
        'Medium': 'bg-warning',
        'Hard': 'bg-danger'
    }[question.difficulty] || 'bg-secondary';

    const difficultyText = {
        'Easy': 'Dễ',
        'Medium': 'Trung bình',
        'Hard': 'Khó'
    }[question.difficulty] || question.difficulty;

    const typeText = {
        'SingleChoice': 'Trắc nghiệm 1 đáp án',
        'MultipleChoice': 'Trắc nghiệm nhiều đáp án',
        'True/False': 'Đúng/Sai',
        'FillInBlank': 'Điền khuyết',
        'Short Answer': 'Tự luận ngắn',
        'Essay': 'Tự luận'
    }[question.type || question.question_type] || question.type || question.question_type;

    contentDiv.innerHTML = `
        <div class="mb-4">
            <h6 class="mb-3">Thông tin câu hỏi</h6>
            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>ID:</strong> #${question.question_id}
                </div>
                <div class="col-md-6">
                    <strong>Môn học:</strong> ${question.subject_name || 'Chưa có môn'}
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>Loại:</strong> ${typeText}
                </div>
                <div class="col-md-6">
                    <strong>Mức độ:</strong> 
                    <span class="badge ${difficultyClass}">${difficultyText}</span>
                </div>
            </div>
            ${question.correct_rate !== undefined ? `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Tỷ lệ đúng:</strong> 
                        <span class="${question.correct_rate >= 80 ? 'text-success' : question.correct_rate >= 50 ? 'text-warning' : 'text-danger'}">
                            ${question.correct_rate}%
                        </span>
                    </div>
                </div>
            ` : ''}
        </div>
        
        <div class="mb-4">
            <h6 class="mb-3">Nội dung câu hỏi</h6>
            <div class="p-3 bg-light rounded">
                ${question.question_content || 'Không có nội dung'}
            </div>
        </div>
        
        ${question.options && question.options.length > 0 ? `
            <div class="mb-4">
                <h6 class="mb-3">Các đáp án</h6>
                ${question.options.map((opt, index) => `
                    <div class="p-3 mb-2 rounded ${opt.is_correct ? 'bg-success bg-opacity-10 border border-success' : 'bg-light'}">
                        <strong>${String.fromCharCode(65 + index)}.</strong> ${opt.option_content}
                        ${opt.is_correct ? ' <span class="badge bg-success">Đúng</span>' : ''}
                    </div>
                `).join('')}
            </div>
        ` : `
            <div class="mb-4">
                <h6 class="mb-3">Đáp án đúng</h6>
                <div class="p-3 bg-light rounded">
                    ${question.correct_answer_text || 'Tự luận - Giáo viên chấm thủ công'}
                </div>
            </div>
        `}
        
        ${question.teacher_name ? `
            <div class="mb-3">
                <strong>Giáo viên tạo:</strong> ${question.teacher_name}
            </div>
        ` : ''}
        
        <div class="text-muted small">
            <i class="bi bi-calendar"></i> Tạo lúc: ${question.created_at ? new Date(question.created_at).toLocaleString('vi-VN') : 'N/A'}
        </div>
    `;
}

// Hàm xem chi tiết điểm số của học sinh
async function viewStudentScores(subjectId, studentId) {
    try {
        const modal = new bootstrap.Modal(document.getElementById('viewStudentScoresModal'));
        const contentDiv = document.getElementById('studentScoresContent');

        // Hiển thị loading
        contentDiv.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
            </div>
        `;

        modal.show();

        // Lấy dữ liệu chi tiết điểm số
        // Sử dụng apiGet từ api.js
        const data = await apiGet(`/api/admin/subjects/${subjectId}/students/${studentId}/scores`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const { student, subject, scores, stats } = data;

        // Hiển thị chi tiết điểm số
        contentDiv.innerHTML = `
            <div class="mb-4">
                <h5 class="mb-3">Thông tin học sinh</h5>
                <div class="row">
                    <div class="col-md-4">
                        <p><strong>Họ tên:</strong> ${student.full_name}</p>
                    </div>
                    <div class="col-md-4">
                        <p><strong>Email:</strong> ${student.email}</p>
                    </div>
                    <div class="col-md-4">
                        <p><strong>Môn học:</strong> ${subject.subject_name}</p>
                    </div>
                </div>
            </div>
            
            <div class="mb-4">
                <h5 class="mb-3">Thống kê tổng quan</h5>
                <div class="row g-3">
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Tổng số bài thi</div>
                            <div class="stat-value">${stats.total_exams || 0}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Đã làm bài</div>
                            <div class="stat-value">${stats.attempted_exams || 0}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Đã nộp bài</div>
                            <div class="stat-value">${stats.submitted_exams || 0}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Điểm trung bình</div>
                            <div class="stat-value ${parseFloat(stats.avg_score || 0) >= 5 ? 'text-success' : 'text-danger'}">
                                ${parseFloat(stats.avg_score || 0).toFixed(2)}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Điểm cao nhất</div>
                            <div class="stat-value text-success">${parseFloat(stats.highest_score || 0).toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Điểm thấp nhất</div>
                            <div class="stat-value text-danger">${parseFloat(stats.lowest_score || 0).toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <h5 class="mb-3">Chi tiết điểm số từng bài thi</h5>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên bài thi</th>
                            <th>Tổng điểm</th>
                            <th>Điểm đạt được</th>
                            <th>Tỷ lệ</th>
                            <th>Trạng thái</th>
                            <th>Thời gian làm bài</th>
                            <th>Thời gian nộp</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${scores.length === 0 ?
                '<tr><td colspan="8" class="text-center">Chưa có dữ liệu điểm số</td></tr>' :
                scores.map((score, index) => {
                    const examScore = parseFloat(score.score) || 0;
                    const totalPoints = parseFloat(score.total_points) || 1;
                    const percentage = totalPoints > 0 ? (examScore / totalPoints * 100).toFixed(1) : 0;

                    const scoreClass = examScore >= totalPoints * 0.8 ? 'bg-success' :
                        examScore >= totalPoints * 0.65 ? 'bg-primary' :
                            examScore >= totalPoints * 0.5 ? 'bg-warning' : 'bg-danger';

                    const statusClass = score.status === 'Submitted' ? 'bg-success' :
                        score.status === 'InProgress' ? 'bg-primary' :
                            score.status === 'AutoSubmitted' ? 'bg-warning' : 'bg-secondary';

                    const statusText = score.status_text || score.status || 'Chưa làm';

                    const startTime = score.start_time ? new Date(score.start_time).toLocaleString('vi-VN') : 'Chưa bắt đầu';
                    const endTime = score.end_time ? new Date(score.end_time).toLocaleString('vi-VN') : 'Chưa nộp';

                    return `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td><strong>${score.exam_name}</strong></td>
                                        <td>${totalPoints.toFixed(2)}</td>
                                        <td>
                                            ${score.score !== null ?
                            `<span class="badge ${scoreClass}">${examScore.toFixed(2)}</span>` :
                            '<span class="text-muted">Chưa có</span>'
                        }
                                        </td>
                                        <td>
                                            ${score.score !== null ?
                            `<span class="${parseFloat(percentage) >= 50 ? 'text-success' : 'text-danger'}">${percentage}%</span>` :
                            '<span class="text-muted">-</span>'
                        }
                                        </td>
                                        <td>
                                            <span class="badge ${statusClass}">${statusText}</span>
                                        </td>
                                        <td>
                                            ${score.duration_minutes !== null ?
                            `${score.duration_minutes} phút` :
                            '<span class="text-muted">-</span>'
                        }
                                        </td>
                                        <td><small>${endTime}</small></td>
                                    </tr>
                                `;
                }).join('')
            }
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        document.getElementById('studentScoresContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Lỗi tải dữ liệu: ${err.message}
            </div>
        `;
    }
}
// ==========================================
// THÊM CODE NÀY VÀO CUỐI PHẦN <script> TRONG admin.html
// (Sau dòng: setTimeout(loadDashboardData, 100);)
// ==========================================

// Hàm tải dữ liệu báo cáo (CẢI TIẾN)
async function loadReportsData() {
    try {
        showLoading('reportTotalExams');

        const params = new URLSearchParams(currentReportFilters);
        // Sử dụng apiGet/apiPost từ api.js
        const data = await apiGet(`/api/admin/reports?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Cập nhật thống kê tổng quan
        updateReportStats(data.stats || {});

        // Cập nhật biểu đồ
        updateScoreTrendChart(data.trend || []);
        updateGradeDistributionChart(data.gradeDistribution || []);
        updateSubjectComparisonChart(data.subjectComparison || []);

        // Cập nhật bảng top students
        updateTopStudentsTable(data.topStudents || []);
        updateWarningStudentsTable(data.warningStudents || []);

        // Cập nhật bảng chi tiết
        allReportsData = data.details || [];
        renderReportTable(allReportsData);

    } catch (err) {
        console.error('Lỗi tải báo cáo:', err);
        showNotification('Lỗi tải dữ liệu báo cáo: ' + err.message, 'error');
        document.getElementById('reportTotalExams').textContent = '0';
    }
}

// Cập nhật thống kê tổng quan
function updateReportStats(stats) {
    document.getElementById('reportTotalExams').textContent = stats.total_exams || 0;
    document.getElementById('reportCompletionRate').textContent =
        (parseFloat(stats.completion_rate) || 0).toFixed(1) + '%';
    document.getElementById('reportAvgScore').textContent =
        (parseFloat(stats.average_score) || 0).toFixed(2);
    document.getElementById('reportCheatingWarnings').textContent =
        stats.cheating_warnings || 0;

    // Cập nhật xu hướng
    const completionTrend = stats.completion_trend || 0;
    const scoreTrend = stats.score_trend || 0;

    updateTrendIndicator('reportCompletionTrend', completionTrend, '%');
    updateTrendIndicator('reportScoreTrend', scoreTrend, '');

    document.getElementById('reportCheatingDetail').textContent =
        `${stats.violating_students || 0} học sinh vi phạm`;
}

function updateTrendIndicator(elementId, value, suffix) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const isPositive = value >= 0;
    element.className = `stat-change ${isPositive ? 'text-success' : 'text-danger'}`;
    element.innerHTML = `
        <i class="bi bi-arrow-${isPositive ? 'up' : 'down'}"></i> 
        ${isPositive ? '+' : ''}${value.toFixed(1)}${suffix}
    `;
}

// Cập nhật biểu đồ xu hướng điểm
function updateScoreTrendChart(trendData) {
    const ctx = document.getElementById('scoreTrendChart');
    if (!ctx) return;

    if (currentReportCharts.scoreTrend) {
        currentReportCharts.scoreTrend.destroy();
    }

    const chartType = document.querySelector('[data-chart-type].active')?.dataset.chartType || 'line';

    currentReportCharts.scoreTrend = new Chart(ctx.getContext('2d'), {
        type: chartType,
        data: {
            labels: trendData.map(d => d.label || d.date),
            datasets: [{
                label: 'Điểm trung bình',
                data: trendData.map(d => d.avg_score),
                borderColor: ADMIN_PRIMARY_COLOR,
                backgroundColor: chartType === 'line' ? ADMIN_PRIMARY_BG : ADMIN_PRIMARY_COLOR,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Điểm TB: ${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// Cập nhật biểu đồ phân bố xếp loại
function updateGradeDistributionChart(gradeData) {
    const ctx = document.getElementById('gradeDistributionChart');
    if (!ctx) return;

    if (currentReportCharts.gradeDistribution) {
        currentReportCharts.gradeDistribution.destroy();
    }

    const excellent = gradeData.find(g => g.grade === 'Xuất sắc')?.count || 0;
    const good = gradeData.find(g => g.grade === 'Khá')?.count || 0;
    const average = gradeData.find(g => g.grade === 'Trung bình')?.count || 0;
    const weak = gradeData.find(g => g.grade === 'Yếu')?.count || 0;
    const total = excellent + good + average + weak;

    // Cập nhật phần trăm
    document.getElementById('excellentPercent').textContent =
        total > 0 ? ((excellent / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('goodPercent').textContent =
        total > 0 ? ((good / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('averagePercent').textContent =
        total > 0 ? ((average / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('weakPercent').textContent =
        total > 0 ? ((weak / total) * 100).toFixed(1) + '%' : '0%';

    currentReportCharts.gradeDistribution = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Xuất sắc', 'Khá', 'Trung bình', 'Yếu'],
            datasets: [{
                data: [excellent, good, average, weak],
                backgroundColor: ['#198754', ADMIN_PRIMARY_COLOR, '#ffc107', '#dc3545']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Cập nhật biểu đồ so sánh môn học
function updateSubjectComparisonChart(subjectData) {
    const ctx = document.getElementById('subjectComparisonChart');
    if (!ctx) return;

    if (currentReportCharts.subjectComparison) {
        currentReportCharts.subjectComparison.destroy();
    }

    currentReportCharts.subjectComparison = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: subjectData.map(s => s.subject_name),
            datasets: [{
                label: 'Điểm trung bình',
                data: subjectData.map(s => s.avg_score),
                backgroundColor: ADMIN_PRIMARY_COLOR
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// Cập nhật bảng top students
function updateTopStudentsTable(students) {
    const tbody = document.getElementById('topStudentsTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Chưa có dữ liệu</td></tr>';
        return;
    }

    students.forEach((student, index) => {
        tbody.innerHTML += `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${student.full_name}</td>
                <td><span class="badge bg-success">${(parseFloat(student.avg_score) || 0).toFixed(2)}</span></td>
                <td>${student.exam_count}</td>
            </tr>
        `;
    });
}

// Cập nhật bảng students cần hỗ trợ
function updateWarningStudentsTable(students) {
    const tbody = document.getElementById('warningStudentsTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Không có học sinh cần hỗ trợ</td></tr>';
        return;
    }

    students.forEach((student, index) => {
        tbody.innerHTML += `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${student.full_name}</td>
                <td><span class="badge bg-danger">${(parseFloat(student.avg_score) || 0).toFixed(2)}</span></td>
                <td><span class="badge bg-warning">${student.warning_count || 0}</span></td>
            </tr>
        `;
    });
}

// Render bảng báo cáo chi tiết
function renderReportTable(data, page = 1, pageSize = 10) {
    const tbody = document.getElementById('examReportTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Không có dữ liệu</td></tr>';
        return;
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = data.slice(start, end);

    pageData.forEach(exam => {
        const completionClass = exam.completion_rate >= 80 ? 'bg-success' :
            exam.completion_rate >= 50 ? 'bg-warning' : 'bg-danger';
        const scoreClass = exam.average_score >= 8 ? 'bg-success' :
            exam.average_score >= 6.5 ? 'bg-primary' :
                exam.average_score >= 5 ? 'bg-warning' : 'bg-danger';
        const cheatingClass = exam.cheating_warnings > 5 ? 'bg-danger' :
            exam.cheating_warnings > 0 ? 'bg-warning' : 'bg-success';

        tbody.innerHTML += `
            <tr>
                <td><strong>${exam.exam_name}</strong></td>
                <td>${exam.subject_name || 'N/A'}</td>
                <td>${exam.student_count}</td>
                <td><span class="badge ${completionClass}">${(parseFloat(exam.completion_rate) || 0).toFixed(1)}%</span></td>
                <td><span class="badge ${scoreClass}">${(parseFloat(exam.average_score) || 0).toFixed(2)}</span></td>
                <td>${exam.highest_score ? (parseFloat(exam.highest_score) || 0).toFixed(2) : 'N/A'}</td>
                <td>${exam.lowest_score ? (parseFloat(exam.lowest_score) || 0).toFixed(2) : 'N/A'}</td>
                <td><span class="badge ${cheatingClass}">${exam.cheating_warnings}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewExamReport(${exam.exam_id})">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    // Cập nhật pagination
    updateReportPagination(data.length, page, pageSize);
}

// Cập nhật pagination
function updateReportPagination(total, currentPage, pageSize) {
    const pagination = document.getElementById('reportPagination');
    if (!pagination) return;

    const totalPages = Math.ceil(total / pageSize);

    pagination.innerHTML = '';

    // Nút Previous
    pagination.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">Trước</a>
        </li>
    `;

    // Các trang
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pagination.innerHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            pagination.innerHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    // Nút Next
    pagination.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">Sau</a>
        </li>
    `;

    // Gắn sự kiện click
    pagination.querySelectorAll('a.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (page) renderReportTable(allReportsData, page, pageSize);
        });
    });
}

// Xem chi tiết báo cáo kỳ thi
function viewExamReport(examId) {
    // Chuyển sang tab exams và load chi tiết
    document.querySelector('[data-section="exams"]').click();
    setTimeout(() => viewExam(examId), 100);
}

// Xuất Excel
document.getElementById('exportExcel')?.addEventListener('click', async () => {
    try {
        showNotification('Đang tạo file Excel...', 'info');

        const params = new URLSearchParams(currentReportFilters);
        const token = localStorage.getItem('token');

        // Excel export cần authorization header và blob
        // Sử dụng fetch trực tiếp vì cần blob
        const baseUrl = window.CONFIG?.API_BASE_URL || '';
        const response = await fetch(baseUrl + `/api/admin/reports/export/excel?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Lỗi xuất Excel');
        }

        // Lấy tên file từ header hoặc tạo tên mặc định
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = `bao_cao_${new Date().toISOString().split('T')[0]}.xlsx`;

        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1].replace(/['"]/g, '');
                // Decode URI nếu cần
                try {
                    fileName = decodeURIComponent(fileName);
                } catch (e) {
                    // Giữ nguyên nếu không decode được
                }
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showNotification('Đã xuất Excel thành công!', 'success');
    } catch (err) {
        console.error('Lỗi xuất Excel:', err);
        showNotification('Lỗi xuất Excel: ' + err.message, 'error');
    }
});

// Áp dụng bộ lọc
document.getElementById('applyReportFilter')?.addEventListener('click', () => {
    currentReportFilters.period = document.getElementById('reportPeriod').value;
    currentReportFilters.subject_id = document.getElementById('reportSubjectFilter').value;

    if (currentReportFilters.period === 'custom') {
        currentReportFilters.start_date = document.getElementById('startDate').value;
        currentReportFilters.end_date = document.getElementById('endDate').value;
    }

    loadReportsData();
});

// Reset bộ lọc
document.getElementById('resetReportFilter')?.addEventListener('click', () => {
    document.getElementById('reportPeriod').value = 'month';
    document.getElementById('reportSubjectFilter').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('customDateRange').style.display = 'none';
    document.getElementById('customDateRangeTo').style.display = 'none';

    currentReportFilters = {
        period: 'month',
        subject_id: '',
        start_date: '',
        end_date: ''
    };

    loadReportsData();
});

// Hiển thị custom date range khi chọn "Tùy chỉnh"
document.getElementById('reportPeriod')?.addEventListener('change', (e) => {
    const customDateRange = document.getElementById('customDateRange');
    const customDateRangeTo = document.getElementById('customDateRangeTo');

    if (e.target.value === 'custom') {
        customDateRange.style.display = 'block';
        customDateRangeTo.style.display = 'block';
    } else {
        customDateRange.style.display = 'none';
        customDateRangeTo.style.display = 'none';
    }
});

// Chuyển đổi kiểu biểu đồ xu hướng
document.querySelectorAll('[data-chart-type]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-chart-type]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Reload chart với type mới
        const trendData = currentReportCharts.scoreTrend?.data.labels.map((label, i) => ({
            label,
            avg_score: currentReportCharts.scoreTrend.data.datasets[0].data[i]
        })) || [];
        updateScoreTrendChart(trendData);
    });
});

// Tìm kiếm trong bảng báo cáo
document.getElementById('searchExamReport')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredData = allReportsData.filter(exam =>
        exam.exam_name.toLowerCase().includes(searchTerm) ||
        (exam.subject_name && exam.subject_name.toLowerCase().includes(searchTerm))
    );
    renderReportTable(filteredData);
});

// Sắp xếp bảng báo cáo
document.querySelectorAll('#examReportTableBody').forEach(table => {
    table.closest('table')?.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            const currentOrder = th.dataset.order || 'asc';
            const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';

            // Reset tất cả các icon
            document.querySelectorAll('.sortable i').forEach(icon => {
                icon.className = 'bi bi-arrow-down-up';
            });

            // Cập nhật icon hiện tại
            const icon = th.querySelector('i');
            if (icon) {
                icon.className = newOrder === 'asc' ? 'bi bi-sort-up' : 'bi bi-sort-down';
            }
            th.dataset.order = newOrder;

            // Sắp xếp dữ liệu
            allReportsData.sort((a, b) => {
                let aVal = a[sortKey];
                let bVal = b[sortKey];

                // Xử lý các trường hợp đặc biệt
                if (sortKey === 'exam_name' || sortKey === 'subject') {
                    aVal = (aVal || '').toString().toLowerCase();
                    bVal = (bVal || '').toString().toLowerCase();
                } else {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                }

                if (newOrder === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });

            renderReportTable(allReportsData);
        });
    });
});

// Xuất PDF
document.getElementById('exportPDF')?.addEventListener('click', async () => {
    try {
        showNotification('Đang tạo file PDF...', 'info');

        const params = new URLSearchParams(currentReportFilters);
        const token = localStorage.getItem('token');

        // PDF export cần authorization header và blob
        // Sử dụng fetch trực tiếp vì cần blob
        const baseUrl = window.CONFIG?.API_BASE_URL || '';
        const response = await fetch(baseUrl + `/api/admin/reports/export/pdf?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Lỗi xuất PDF');
        }

        // Lấy tên file từ header hoặc tạo tên mặc định
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = `bao_cao_${new Date().toISOString().split('T')[0]}.pdf`;

        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1].replace(/['"]/g, '');
                // Decode URI nếu cần
                try {
                    fileName = decodeURIComponent(fileName);
                } catch (e) {
                    // Giữ nguyên nếu không decode được
                }
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showNotification('Đã xuất PDF thành công!', 'success');
    } catch (err) {
        console.error('Lỗi xuất PDF:', err);
        showNotification('Lỗi xuất PDF: ' + err.message, 'error');
    }
});

// ============================================
// XUẤT BÁO CÁO TỪ HEADER
// ============================================

// Hàm helper để lấy bộ lọc hiện tại (mặc định là 30 ngày qua)
function getCurrentReportFilters() {
    const reportsSection = document.getElementById('reports-section');
    if (reportsSection && reportsSection.classList.contains('active')) {
        // Đang ở phần reports, sử dụng bộ lọc hiện tại
        return currentReportFilters;
    } else {
        // Đang ở dashboard, sử dụng bộ lọc mặc định (30 ngày qua)
        return {
            period: 'month',
            subject_id: ''
        };
    }
}

// Hàm xuất Excel từ header
async function exportExcelFromHeader() {
    try {
        showNotification('Đang tạo file Excel...', 'info');

        const filters = getCurrentReportFilters();
        const params = new URLSearchParams(filters);
        const token = localStorage.getItem('token');

        // Sử dụng fetch trực tiếp vì cần blob
        const baseUrl = window.CONFIG?.API_BASE_URL || '';
        const response = await fetch(baseUrl + `/api/admin/reports/export/excel?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Lỗi xuất Excel');
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = `bao_cao_${new Date().toISOString().split('T')[0]}.xlsx`;

        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1].replace(/['"]/g, '');
                try {
                    fileName = decodeURIComponent(fileName);
                } catch (e) { }
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showNotification('Đã xuất Excel thành công!', 'success');
    } catch (err) {
        console.error('Lỗi xuất Excel:', err);
        showNotification('Lỗi xuất Excel: ' + err.message, 'error');
    }
}

// Hàm xuất PDF từ header
async function exportPDFFromHeader() {
    try {
        showNotification('Đang tạo file PDF...', 'info');

        const filters = getCurrentReportFilters();
        const params = new URLSearchParams(filters);
        const token = localStorage.getItem('token');

        // Sử dụng fetch trực tiếp vì cần blob
        const baseUrl = window.CONFIG?.API_BASE_URL || '';
        const response = await fetch(baseUrl + `/api/admin/reports/export/pdf?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Lỗi xuất PDF');
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = `bao_cao_${new Date().toISOString().split('T')[0]}.pdf`;

        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1].replace(/['"]/g, '');
                try {
                    fileName = decodeURIComponent(fileName);
                } catch (e) { }
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showNotification('Đã xuất PDF thành công!', 'success');
    } catch (err) {
        console.error('Lỗi xuất PDF:', err);
        showNotification('Lỗi xuất PDF: ' + err.message, 'error');
    }
}

// Xuất Excel từ header
document.getElementById('headerExportExcel')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await exportExcelFromHeader();
});

// Xuất PDF từ header
document.getElementById('headerExportPDF')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await exportPDFFromHeader();
});

// In báo cáo từ header
document.getElementById('headerPrintReport')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        const reportsSection = document.getElementById('reports-section');
        if (!reportsSection || !reportsSection.classList.contains('active')) {
            // Chuyển đến phần reports trước
            switchSection('reports');
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Sử dụng lại logic từ nút printReport
        const printReportBtn = document.getElementById('printReport');
        if (printReportBtn) {
            printReportBtn.click();
        } else {
            showNotification('Vui lòng đợi phần báo cáo được tải xong', 'warning');
        }
    } catch (err) {
        console.error('Lỗi in báo cáo từ header:', err);
        showNotification('Lỗi in báo cáo: ' + err.message, 'error');
    }
});

// Chuyển đến phần báo cáo chi tiết
document.getElementById('goToReportsSection')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection('reports');
});

// In báo cáo
document.getElementById('printReport')?.addEventListener('click', () => {
    // Thêm header in báo cáo
    const reportsSection = document.getElementById('reports-section');
    if (reportsSection) {
        // Tạo header in nếu chưa có
        let printHeader = document.getElementById('printReportHeader');
        if (!printHeader) {
            printHeader = document.createElement('div');
            printHeader.id = 'printReportHeader';
            printHeader.className = 'print-header';

            const period = document.getElementById('reportPeriod')?.value || 'month';
            const periodNames = {
                'week': '7 ngày qua',
                'month': '30 ngày qua',
                'quarter': '3 tháng qua',
                'year': '1 năm qua',
                'custom': 'Tùy chỉnh'
            };

            const startDate = document.getElementById('startDate')?.value;
            const endDate = document.getElementById('endDate')?.value;
            let periodText = periodNames[period] || 'N/A';
            if (period === 'custom' && startDate && endDate) {
                periodText = `Từ ${new Date(startDate).toLocaleDateString('vi-VN')} đến ${new Date(endDate).toLocaleDateString('vi-VN')}`;
            }

            printHeader.innerHTML = `
                <h1>BÁO CÁO THỐNG KÊ HỆ THỐNG THI TRỰC TUYẾN</h1>
                <div class="print-date">
                    Khoảng thời gian: ${periodText} | 
                    Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}
                </div>
            `;
            reportsSection.insertBefore(printHeader, reportsSection.firstChild);
        }

        // In
        window.print();
    } else {
        showNotification('Không tìm thấy phần báo cáo để in', 'error');
    }
});

// Tải danh sách môn học cho bộ lọc
async function loadSubjectsForReportFilter() {
    try {
        // Sử dụng apiGet/apiPost từ api.js
        const subjects = await apiGet('/api/admin/subjects', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const select = document.getElementById('reportSubjectFilter');
        if (select) {
            select.innerHTML = '<option value="">Tất cả môn học</option>';
            subjects.forEach(subject => {
                select.innerHTML += `<option value="${subject.subject_id}">${subject.subject_name}</option>`;
            });
        }
    } catch (err) {
        console.error('Lỗi tải môn học:', err);
    }
}

// Helper function: Show loading
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    }
}

// Khởi tạo khi vào reports section
const reportsNavLink = document.querySelector('[data-section="reports"]');
if (reportsNavLink) {
    const originalClickHandler = reportsNavLink.onclick;
    reportsNavLink.onclick = function (e) {
        if (originalClickHandler) originalClickHandler.call(this, e);
        setTimeout(() => {
            loadSubjectsForReportFilter();
            loadReportsData();
            loadScoreHistory();
            loadComplaintsHistory();
            // loadAIUsageReport() chỉ được gọi trong switchSection khi sectionName === 'reports'
        }, 100);
    };
}

// ============================================
// 📋 LỊCH SỬ SỬA ĐIỂM CỦA GIÁO VIÊN
// ============================================
let currentScoreHistoryPage = 1;
const scoreHistoryLimit = 50;

async function loadScoreHistory(page = 1) {
    try {
        const tbody = document.getElementById('scoreHistoryTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="11" class="text-center">Đang tải dữ liệu...</td></tr>';

        const params = new URLSearchParams({
            page: page,
            limit: scoreHistoryLimit
        });

        const startDate = document.getElementById('scoreHistoryStartDate')?.value;
        const endDate = document.getElementById('scoreHistoryEndDate')?.value;

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        // Sử dụng apiGet/apiPost từ api.js
        const data = await apiGet(`/api/admin/reports/score-history?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        currentScoreHistoryPage = page;

        if (!data.logs || data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">Không có dữ liệu</td></tr>';
            renderScoreHistoryPagination(data.pagination);
            return;
        }

        tbody.innerHTML = data.logs.map(log => {
            const editedAt = new Date(log.edited_at).toLocaleString('vi-VN');
            const questionInfo = log.question_content
                ? `${log.question_content.substring(0, 50)}${log.question_content.length > 50 ? '...' : ''} (${log.question_type || 'N/A'})`
                : 'Tổng điểm';

            return `
                <tr>
                    <td data-label="Thời gian">${editedAt}</td>
                    <td data-label="Giáo viên">
                        <div>${log.teacher_name || 'N/A'}</div>
                        <small class="text-muted">${log.teacher_email || ''}</small>
                    </td>
                    <td data-label="Học sinh">
                        <div>${log.student_name || 'N/A'}</div>
                        <small class="text-muted">MSSV: ${log.student_id || 'N/A'}</small>
                    </td>
                    <td data-label="Bài thi">${log.exam_name || 'N/A'}</td>
                    <td data-label="Môn học">${log.subject_name || 'N/A'}</td>
                    <td data-label="Câu hỏi" style="max-width: 200px;" title="${log.question_content || ''}">${questionInfo}</td>
                    <td data-label="Điểm cũ">
                        ${log.old_score !== null ? `<span class="badge bg-secondary">${log.old_score}</span>` : '-'}
                    </td>
                    <td data-label="Điểm mới">
                        ${log.new_score !== null ? `<span class="badge bg-primary">${log.new_score}</span>` : '-'}
                    </td>
                    <td data-label="Tổng điểm cũ">
                        ${log.old_total_score !== null ? `<span class="badge bg-secondary">${log.old_total_score}</span>` : '-'}
                    </td>
                    <td data-label="Tổng điểm mới">
                        ${log.new_total_score !== null ? `<span class="badge bg-success">${log.new_total_score}</span>` : '-'}
                    </td>
                    <td data-label="Lý do" style="max-width: 250px;" title="${log.reason || ''}">
                        ${log.reason ? log.reason.substring(0, 50) + (log.reason.length > 50 ? '...' : '') : '-'}
                    </td>
                </tr>
            `;
        }).join('');

        renderScoreHistoryPagination(data.pagination);

    } catch (err) {
        console.error('Lỗi tải lịch sử sửa điểm:', err);
        const tbody = document.getElementById('scoreHistoryTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger">Lỗi: ${err.message}</td></tr>`;
        }
        showNotification('Lỗi tải lịch sử sửa điểm: ' + err.message, 'error');
    }
}

function renderScoreHistoryPagination(pagination) {
    const paginationEl = document.getElementById('scoreHistoryPagination');
    if (!paginationEl || !pagination) return;

    if (pagination.totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let html = '';
    const currentPage = pagination.page;
    const totalPages = pagination.totalPages;

    // Nút Trước
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadScoreHistory(${currentPage - 1}); return false;">Trước</a>
    </li>`;

    // Số trang
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadScoreHistory(${i}); return false;">${i}</a>
            </li>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Nút Sau
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadScoreHistory(${currentPage + 1}); return false;">Sau</a>
    </li>`;

    paginationEl.innerHTML = html;
}

function resetScoreHistoryFilter() {
    document.getElementById('scoreHistoryStartDate').value = '';
    document.getElementById('scoreHistoryEndDate').value = '';
    loadScoreHistory(1);
}

// ============================================
// 📋 LỊCH SỬ KHIẾU NẠI CỦA HỌC SINH
// ============================================
let currentComplaintsHistoryPage = 1;
const complaintsHistoryLimit = 50;

async function loadComplaintsHistory(page = 1) {
    try {
        const tbody = document.getElementById('complaintsHistoryTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Đang tải dữ liệu...</td></tr>';

        const params = new URLSearchParams({
            page: page,
            limit: complaintsHistoryLimit
        });

        const startDate = document.getElementById('complaintHistoryStartDate')?.value;
        const endDate = document.getElementById('complaintHistoryEndDate')?.value;
        const status = document.getElementById('complaintStatusFilter')?.value;

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (status) params.append('status', status);

        // Sử dụng apiGet/apiPost từ api.js
        const data = await apiGet(`/api/admin/reports/complaints-history?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        currentComplaintsHistoryPage = page;

        if (!data.complaints || data.complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Không có dữ liệu</td></tr>';
            renderComplaintsHistoryPagination(data.pagination);
            return;
        }

        const statusColors = {
            'Pending': { bg: 'warning', text: 'Đang chờ', icon: '⏳' },
            'Resolved': { bg: 'success', text: 'Đã xử lý', icon: '✅' },
            'Rejected': { bg: 'danger', text: 'Từ chối', icon: '❌' }
        };

        tbody.innerHTML = data.complaints.map(complaint => {
            const createdAt = new Date(complaint.created_at).toLocaleString('vi-VN');
            const updatedAt = complaint.updated_at ? new Date(complaint.updated_at).toLocaleString('vi-VN') : null;
            const statusInfo = statusColors[complaint.status] || { bg: 'secondary', text: complaint.status, icon: '📋' };
            const scoreText = `${complaint.exam_score}/${complaint.total_points}`;

            return `
                <tr>
                    <td data-label="Thời gian">
                        <div>${createdAt}</div>
                        ${updatedAt ? `<small class="text-muted">Cập nhật: ${updatedAt}</small>` : ''}
                    </td>
                    <td data-label="Học sinh">
                        <div>${complaint.student_name || 'N/A'}</div>
                        <small class="text-muted">MSSV: ${complaint.student_code || 'N/A'}</small>
                    </td>
                    <td data-label="Bài thi">${complaint.exam_name || 'N/A'}</td>
                    <td data-label="Môn học">${complaint.subject_name || 'N/A'}</td>
                    <td data-label="Điểm"><strong>${scoreText}</strong></td>
                    <td data-label="Nội dung khiếu nại" style="max-width: 300px;" title="${complaint.content || ''}">
                        ${complaint.content ? complaint.content.substring(0, 80) + (complaint.content.length > 80 ? '...' : '') : '-'}
                    </td>
                    <td data-label="Trạng thái">
                        <span class="badge bg-${statusInfo.bg}">${statusInfo.icon} ${statusInfo.text}</span>
                    </td>
                    <td data-label="Phản hồi giáo viên" style="max-width: 250px;" title="${complaint.teacher_response || ''}">
                        ${complaint.teacher_response ? complaint.teacher_response.substring(0, 60) + (complaint.teacher_response.length > 60 ? '...' : '') : '<em class="text-muted">Chưa phản hồi</em>'}
                    </td>
                    <td data-label="Giáo viên">
                        ${complaint.teacher_name ? `
                            <div>${complaint.teacher_name}</div>
                            <small class="text-muted">${complaint.teacher_email || ''}</small>
                        ` : 'N/A'}
                    </td>
                </tr>
            `;
        }).join('');

        renderComplaintsHistoryPagination(data.pagination);

    } catch (err) {
        console.error('Lỗi tải lịch sử khiếu nại:', err);
        const tbody = document.getElementById('complaintsHistoryTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Lỗi: ${err.message}</td></tr>`;
        }
        showNotification('Lỗi tải lịch sử khiếu nại: ' + err.message, 'error');
    }
}

function renderComplaintsHistoryPagination(pagination) {
    const paginationEl = document.getElementById('complaintsHistoryPagination');
    if (!paginationEl || !pagination) return;

    if (pagination.totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let html = '';
    const currentPage = pagination.page;
    const totalPages = pagination.totalPages;

    // Nút Trước
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadComplaintsHistory(${currentPage - 1}); return false;">Trước</a>
    </li>`;

    // Số trang
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadComplaintsHistory(${i}); return false;">${i}</a>
            </li>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Nút Sau
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadComplaintsHistory(${currentPage + 1}); return false;">Sau</a>
    </li>`;

    paginationEl.innerHTML = html;
}

function resetComplaintHistoryFilter() {
    document.getElementById('complaintStatusFilter').value = '';
    document.getElementById('complaintHistoryStartDate').value = '';
    document.getElementById('complaintHistoryEndDate').value = '';
    loadComplaintsHistory(1);
}

// ============================================
// 🤖 BÁO CÁO SỬ DỤNG AI
// ============================================
let aiProviderChart = null;
let aiActionChart = null;
let aiDailyUsageChart = null;

async function loadAIUsageReport() {
    try {
        // Chỉ load khi đang ở reports section
        const reportsSection = document.getElementById('reports-section');
        if (!reportsSection || !reportsSection.classList.contains('active')) {
            return; // Không load nếu không ở reports section
        }

        // Sử dụng bộ lọc từ reports section
        const params = new URLSearchParams(currentReportFilters);
        const data = await apiGet(`/api/admin/reports/ai-usage?${params}`);

        // Cập nhật thống kê tổng quan
        document.getElementById('aiTotalRequests').textContent = data.overview.total_requests.toLocaleString('vi-VN');
        document.getElementById('aiTotalUsers').textContent = data.overview.total_users.toLocaleString('vi-VN');
        document.getElementById('aiTotalTokens').textContent = data.overview.total_tokens.toLocaleString('vi-VN');

        // Xu hướng
        const requestTrendEl = document.getElementById('aiRequestTrend');
        const requestTrend = data.overview.request_trend || 0;
        requestTrendEl.innerHTML = requestTrend >= 0
            ? `<i class="bi bi-arrow-up text-success"></i> +${Math.abs(requestTrend).toFixed(1)}%`
            : `<i class="bi bi-arrow-down text-danger"></i> -${Math.abs(requestTrend).toFixed(1)}%`;

        const tokenTrendEl = document.getElementById('aiTokenTrend');
        const tokenTrend = data.overview.token_trend || 0;
        tokenTrendEl.innerHTML = tokenTrend >= 0
            ? `<i class="bi bi-arrow-up text-success"></i> +${Math.abs(tokenTrend).toFixed(1)}%`
            : `<i class="bi bi-arrow-down text-danger"></i> -${Math.abs(tokenTrend).toFixed(1)}%`;

        // Provider chính
        const groqReq = data.overview.groq_requests || 0;
        const geminiReq = data.overview.gemini_requests || 0;
        const openaiReq = data.overview.openai_requests || 0;
        let mainProvider = '-';
        if (groqReq >= geminiReq && groqReq >= openaiReq) mainProvider = 'Groq';
        else if (geminiReq >= openaiReq) mainProvider = 'Gemini';
        else mainProvider = 'OpenAI';

        document.getElementById('aiMainProvider').textContent = mainProvider;
        document.getElementById('aiProviderDetail').textContent = `Groq: ${groqReq} | Gemini: ${geminiReq} | OpenAI: ${openaiReq}`;

        // Vẽ biểu đồ Provider
        renderAIProviderChart(data.providerStats);

        // Vẽ biểu đồ Action
        renderAIActionChart(data.actionStats);

        // Vẽ biểu đồ daily usage
        renderAIDailyUsageChart(data.dailyUsage);

        // Cập nhật bảng top users
        renderAITopUsers(data.topUsers);

        // Cập nhật bảng role stats
        renderAIRoleStats(data.roleStats);

        // Cập nhật bảng provider stats
        renderAIProviderStats(data.providerStats);

    } catch (err) {
        console.error('Lỗi tải báo cáo AI usage:', err);
        showNotification('Lỗi tải báo cáo AI usage: ' + err.message, 'error');
    }
}

function renderAIProviderChart(providerStats) {
    const ctx = document.getElementById('aiProviderChart');
    if (!ctx) return;

    if (aiProviderChart) {
        aiProviderChart.destroy();
    }

    const labels = providerStats.map(s => s.provider.toUpperCase());
    const data = providerStats.map(s => parseInt(s.total_requests));
    const colors = ['#7f8ac5', '#4299e1', '#48bb78', '#ed8936'];

    aiProviderChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderAIActionChart(actionStats) {
    const ctx = document.getElementById('aiActionChart');
    if (!ctx) return;

    if (aiActionChart) {
        aiActionChart.destroy();
    }

    const labels = actionStats.map(s => {
        const actionNames = {
            'create_practice_exam': 'Tạo đề luyện tập',
            'create_exam': 'Tạo đề thi',
            'grade_essay': 'Chấm tự luận',
            'extract_content': 'Trích xuất nội dung'
        };
        return actionNames[s.action_type] || s.action_type;
    });
    const data = actionStats.map(s => parseInt(s.total_requests));

    aiActionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Số yêu cầu',
                data: data,
                backgroundColor: '#7f8ac5',
                borderColor: '#667eea',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderAIDailyUsageChart(dailyUsage) {
    const ctx = document.getElementById('aiDailyUsageChart');
    if (!ctx) return;

    // Kiểm tra xem canvas có trong DOM và visible không
    if (!ctx.offsetParent && ctx.offsetWidth === 0 && ctx.offsetHeight === 0) {
        return;
    }

    if (aiDailyUsageChart) {
        aiDailyUsageChart.destroy();
        aiDailyUsageChart = null;
    }

    // Kiểm tra dữ liệu hợp lệ
    if (!dailyUsage || !Array.isArray(dailyUsage) || dailyUsage.length === 0) {
        return;
    }

    const labels = dailyUsage.map(d => d.label || '');
    const requestsData = dailyUsage.map(d => parseInt(d.requests) || 0);
    const tokensData = dailyUsage.map(d => parseInt(d.tokens) || 0);

    try {
        aiDailyUsageChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Yêu cầu',
                        data: requestsData,
                        borderColor: '#7f8ac5',
                        backgroundColor: 'rgba(127, 138, 197, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y',
                        fill: false
                    },
                    {
                        label: 'Tokens',
                        data: tokensData,
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1',
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2.5,
                animation: {
                    duration: 0
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                resizeDelay: 0,
                onResize: null
            }
        });
    } catch (error) {
        console.error('Lỗi render biểu đồ AI daily usage:', error);
        aiDailyUsageChart = null;
    }
}

function renderAITopUsers(topUsers) {
    const tbody = document.getElementById('aiTopUsersTable');
    if (!tbody) return;

    if (!topUsers || topUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có dữ liệu</td></tr>';
        return;
    }

    tbody.innerHTML = topUsers.map((user, index) => {
        const roleNames = {
            'Student': 'Học sinh',
            'Teacher': 'Giáo viên',
            'Admin': 'Admin'
        };
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${user.full_name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="badge bg-secondary">${roleNames[user.role] || user.role}</span></td>
                <td>${parseInt(user.total_requests).toLocaleString('vi-VN')}</td>
                <td>${parseInt(user.total_tokens).toLocaleString('vi-VN')}</td>
                <td>${parseInt(user.active_days)} ngày</td>
                <td>${parseInt(user.providers_used)} provider(s)</td>
            </tr>
        `;
    }).join('');
}

function renderAIRoleStats(roleStats) {
    const tbody = document.getElementById('aiRoleStatsTable');
    if (!tbody) return;

    if (!roleStats || roleStats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Không có dữ liệu</td></tr>';
        return;
    }

    const roleNames = {
        'Student': 'Học sinh',
        'Teacher': 'Giáo viên',
        'Admin': 'Admin'
    };

    tbody.innerHTML = roleStats.map(stat => `
        <tr>
            <td><strong>${roleNames[stat.role] || stat.role}</strong></td>
            <td>${parseInt(stat.total_requests).toLocaleString('vi-VN')}</td>
            <td>${parseInt(stat.total_tokens).toLocaleString('vi-VN')}</td>
            <td>${parseInt(stat.unique_users)} người</td>
        </tr>
    `).join('');
}

function renderAIProviderStats(providerStats) {
    const tbody = document.getElementById('aiProviderStatsTable');
    if (!tbody) return;

    if (!providerStats || providerStats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Không có dữ liệu</td></tr>';
        return;
    }

    tbody.innerHTML = providerStats.map(stat => `
        <tr>
            <td><strong>${stat.provider.toUpperCase()}</strong></td>
            <td>${parseInt(stat.total_requests).toLocaleString('vi-VN')}</td>
            <td>${parseInt(stat.total_tokens).toLocaleString('vi-VN')}</td>
            <td>${parseInt(stat.unique_users)} người</td>
        </tr>
    `).join('');
}

// Khởi tạo dữ liệu ban đầu
setTimeout(loadDashboardData, 100);