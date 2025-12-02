// ==============================================
// SPIMF SYSTEM - FRONTEND JAVASCRIPT (OPTIMIZED)
// ==============================================

// CONFIGURATION
const CONFIG = {
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxmgDU2cIPgjRvpX4pyVZIBQKH9KYuqKYXeU1x1jCkgdFszXirSoOeHn9NzUsYw0D-B/exec',
    VERSION: '3.0.4',
    CACHE_KEY: 'spimf_cache'
};

// Global State
let currentMember = null;
let currentMethod = 'phone';
let isGuest = false;
let editState = {};

// DOM Elements Cache
const elements = {};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log(`SPIMF System v${CONFIG.VERSION} initialized`);
    
    // Cache DOM elements
    cacheDOMElements();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start system countdown
    updateSystemCountdown();
    setInterval(updateSystemCountdown, 60000); // Update every minute
    
    // Check if already logged in
    checkExistingSession();
});

// Cache DOM Elements for better performance
function cacheDOMElements() {
    const ids = [
        'loginScreen', 'dashboard', 'loginAlert', 'guestAlert', 'systemAlert',
        'identifier', 'password', 'passwordGroup', 'methodLabel', 'loginBtn',
        'guestBtn', 'checkSystemBtn', 'systemPassword', 'systemCountdown',
        'editModal', 'modalTitle', 'modalLabel', 'modalInput', 'saveEditBtn', 'cancelEditBtn'
    ];
    
    ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });
}

// Check existing session from localStorage
function checkExistingSession() {
    const savedMember = localStorage.getItem('spimf_member');
    const savedTime = localStorage.getItem('spimf_session_time');
    
    if (savedMember && savedTime) {
        const sessionAge = Date.now() - parseInt(savedTime);
        const maxAge = 2 * 60 * 60 * 1000; // 2 hours
        
        if (sessionAge < maxAge) {
            currentMember = JSON.parse(savedMember);
            isGuest = currentMember.isGuest || false;
            showDashboard();
        } else {
            localStorage.removeItem('spimf_member');
            localStorage.removeItem('spimf_session_time');
        }
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Login tabs
    document.querySelectorAll('.login-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Method buttons
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentMethod = this.dataset.method;
            updateMethodFields();
        });
    });
    
    // Login button
    if (elements.loginBtn) {
        elements.loginBtn.addEventListener('click', handleMemberLogin);
    }
    
    // Guest button
    if (elements.guestBtn) {
        elements.guestBtn.addEventListener('click', handleGuestLogin);
    }
    
    // System check button
    if (elements.checkSystemBtn) {
        elements.checkSystemBtn.addEventListener('click', checkSystemHealth);
    }
    
    // Enter key support
    if (elements.identifier) {
        elements.identifier.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleMemberLogin();
        });
    }
    
    if (elements.password) {
        elements.password.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleMemberLogin();
        });
    }
    
    if (elements.systemPassword) {
        elements.systemPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') checkSystemHealth();
        });
    }
    
    // Modal buttons
    if (elements.saveEditBtn) {
        elements.saveEditBtn.addEventListener('click', saveEdit);
    }
    
    if (elements.cancelEditBtn) {
        elements.cancelEditBtn.addEventListener('click', function() {
            elements.editModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    if (elements.editModal) {
        elements.editModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
}

// Tab switching function
function switchTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
    
    // Show correct form
    ['memberLogin', 'guestLogin', 'systemCheck'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = id === `${tab}Login` || id === `${tab}Check` ? 'block' : 'none';
        }
    });
    
    clearAlerts();
}

// Update method fields
function updateMethodFields() {
    const labels = {
        phone: 'Phone Number',
        idCard: 'ID Card Registration',
        kodeUser: 'Kode User',
        membership: 'Membership Account'
    };
    
    const placeholders = {
        phone: 'Enter your phone number',
        idCard: 'Enter your ID Card number',
        kodeUser: 'Enter your Kode User',
        membership: 'Enter your membership account'
    };
    
    if (elements.methodLabel) {
        elements.methodLabel.textContent = labels[currentMethod] || 'Identifier';
    }
    
    if (elements.identifier) {
        elements.identifier.placeholder = placeholders[currentMethod] || 'Enter your identifier';
    }
    
    // Show password only for membership method
    if (elements.passwordGroup) {
        elements.passwordGroup.style.display = currentMethod === 'membership' ? 'block' : 'none';
    }
}

// Handle member login
async function handleMemberLogin() {
    const identifier = elements.identifier?.value?.trim() || '';
    
    if (!identifier) {
        showAlert('loginAlert', 'Please enter your credentials', 'error');
        return;
    }
    
    if (currentMethod === 'membership' && !(elements.password?.value || '')) {
        showAlert('loginAlert', 'Please enter your password', 'error');
        return;
    }
    
    showAlert('loginAlert', 'Logging in...', 'info');
    
    try {
        const response = await callAPI('login', {
            method: currentMethod,
            identifier: identifier,
            password: elements.password?.value || ''
        });
        
        if (response.success) {
            currentMember = response.member;
            isGuest = false;
            
            // Save session
            localStorage.setItem('spimf_member', JSON.stringify(currentMember));
            localStorage.setItem('spimf_session_time', Date.now().toString());
            
            showDashboard();
        } else {
            showAlert('loginAlert', response.message, 'error');
        }
    } catch (error) {
        showAlert('loginAlert', 'Login failed. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

// Handle guest login
async function handleGuestLogin() {
    showAlert('guestAlert', 'Entering guest mode...', 'info');
    
    try {
        const response = await callAPI('guestLogin', {});
        
        if (response.success) {
            currentMember = response.member;
            isGuest = true;
            showDashboard();
        } else {
            showAlert('guestAlert', response.message, 'error');
        }
    } catch (error) {
        showAlert('guestAlert', 'Guest login failed', 'error');
    }
}

// API Call wrapper
async function callAPI(action, data) {
    try {
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, data })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Check system health
async function checkSystemHealth() {
    const password = elements.systemPassword?.value?.trim() || '';
    
    if (password !== 'SPIMFONWER') {
        showAlert('systemAlert', 'Invalid system password', 'error');
        return;
    }
    
    showAlert('systemAlert', 'Checking system health...', 'info');
    
    try {
        const response = await callAPI('systemCheck', {});
        
        if (response.success) {
            const health = response.health;
            let message = `✅ System is ${health.spreadsheet}<br>`;
            message += `📊 ${health.rows} rows, ${health.columns} columns<br>`;
            message += `⏰ Operational: ${health.operationalHours ? 'Yes' : 'No'}<br>`;
            message += `🕒 ${health.timestamp}`;
            
            showAlert('systemAlert', message, 'success');
        } else {
            showAlert('systemAlert', response.message, 'error');
        }
    } catch (error) {
        showAlert('systemAlert', 'System check failed', 'error');
    }
}

// Show dashboard
function showDashboard() {
    if (elements.loginScreen) elements.loginScreen.style.display = 'none';
    if (elements.dashboard) {
        elements.dashboard.style.display = 'block';
        loadDashboardContent();
    }
}

// Load dashboard content
function loadDashboardContent() {
    const dashboard = elements.dashboard;
    if (!dashboard) return;
    
    dashboard.innerHTML = isGuest ? getGuestDashboard() : getMemberDashboard();
    
    // Re-attach dynamic event listeners
    setTimeout(() => {
        attachDashboardListeners();
        if (!isGuest) {
            loadMemberDetails();
            loadAdminMessages();
        }
    }, 100);
}

// Attach dynamic dashboard listeners
function attachDashboardListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const field = this.dataset.field;
            const value = this.dataset.value || '';
            openEditModal(field, value);
        });
    });
    
    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.dataset.value || '';
            copyToClipboard(text);
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            if (!isGuest) {
                loadMemberDetails();
                loadAdminMessages();
            }
        });
    }
}

// Open edit modal
function openEditModal(field, currentValue) {
    if (!elements.editModal) return;
    
    const fieldLabels = {
        'phone_number_nombor_telefon': 'Phone Number',
        'your_name_nama_anda': 'Full Name',
        'id_card_registration': 'ID Card',
        'kode_user': 'Kode User',
        'membership_account': 'Membership Account'
    };
    
    editState = { field, currentValue };
    
    elements.modalTitle.textContent = `Edit ${fieldLabels[field] || field}`;
    elements.modalLabel.textContent = fieldLabels[field] || field;
    elements.modalInput.value = currentValue;
    elements.modalInput.focus();
    
    elements.editModal.style.display = 'flex';
}

// Save edit
async function saveEdit() {
    if (!currentMember || !editState.field) return;
    
    const newValue = elements.modalInput.value.trim();
    if (!newValue) return;
    
    try {
        const response = await callAPI('updateMemberField', {
            memberId: currentMember.your_name_nama_anda,
            field: editState.field,
            value: newValue
        });
        
        if (response.success) {
            // Update local state
            currentMember[editState.field] = newValue;
            localStorage.setItem('spimf_member', JSON.stringify(currentMember));
            
            // Refresh display
            loadDashboardContent();
            
            elements.editModal.style.display = 'none';
            showAlert('dashboard', 'Field updated successfully!', 'success');
        } else {
            showAlert('dashboard', response.message, 'error');
        }
    } catch (error) {
        showAlert('dashboard', 'Update failed', 'error');
    }
}

// Load member details
async function loadMemberDetails() {
    if (!currentMember || isGuest) return;
    
    try {
        const response = await callAPI('getMemberData', {
            identifier: currentMember.your_name_nama_anda,
            method: 'name'
        });
        
        if (response.success && response.data) {
            currentMember = { ...currentMember, ...response.data };
            localStorage.setItem('spimf_member', JSON.stringify(currentMember));
            
            // Update dashboard
            const memberSection = document.querySelector('.profile-section');
            if (memberSection) {
                memberSection.innerHTML = getProfileSection(currentMember);
                attachDashboardListeners();
            }
        }
    } catch (error) {
        console.error('Load member details error:', error);
    }
}

// Load admin messages
async function loadAdminMessages() {
    if (!currentMember || isGuest) return;
    
    try {
        const response = await callAPI('getAdminMessages', {
            memberId: currentMember.your_name_nama_anda
        });
        
        if (response.success && response.messages && response.messages.length > 0) {
            const messagesContainer = document.getElementById('adminMessages');
            if (messagesContainer) {
                messagesContainer.innerHTML = response.messages.map(msg => `
                    <div class="message-item">
                        <p>${msg.message || ''}</p>
                        <small>${msg.timestamp || ''}</small>
                    </div>
                `).join('');
                messagesContainer.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Load messages error:', error);
    }
}

// Dashboard templates
function getGuestDashboard() {
    return `
        <div class="dashboard-header">
            <div class="welcome-message">
                <h2><i class="fas fa-user-secret"></i> Welcome, Guest!</h2>
                <p>You are in limited access mode</p>
            </div>
            <button class="btn btn-secondary" id="logoutBtn">
                <i class="fas fa-sign-out-alt"></i> Exit Guest Mode
            </button>
        </div>
        
        <div class="info-section">
            <h3 class="section-title"><i class="fas fa-info-circle"></i> About SPIMF</h3>
            <p>Sistem Pengurusan Identiti Membership FareezOnzz (SPIMF) adalah platform pengurusan keahlian profesional yang selamat dan efisien.</p>
            
            <div class="info-grid" style="margin-top: 20px;">
                <div class="info-item">
                    <div class="info-label">Total Members</div>
                    <div class="info-value">500+</div>
                </div>
                <div class="info-item">
                    <div class="info-label">System Version</div>
                    <div class="info-value">v${CONFIG.VERSION}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Security Level</div>
                    <div class="info-value"><i class="fas fa-shield-alt"></i> High</div>
                </div>
            </div>
        </div>
        
        <div class="info-section">
            <h3 class="section-title"><i class="fas fa-lock"></i> Login Methods Available</h3>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label"><i class="fas fa-phone"></i> Phone Number</div>
                    <div class="info-value">For registered members</div>
                </div>
                <div class="info-item">
                    <div class="info-label"><i class="fas fa-id-card"></i> ID Card</div>
                    <div class="info-value">Official identification</div>
                </div>
                <div class="info-item">
                    <div class="info-label"><i class="fas fa-key"></i> Kode User</div>
                    <div class="info-value">Unique user code</div>
                </div>
                <div class="info-item">
                    <div class="info-label"><i class="fas fa-user-circle"></i> Membership</div>
                    <div class="info-value">Full account access</div>
                </div>
            </div>
        </div>
    `;
}

function getMemberDashboard() {
    return `
        <div class="dashboard-header">
            <div class="welcome-message">
                <h2><i class="fas fa-user-circle"></i> Welcome back, ${currentMember?.your_name_nama_anda || 'Member'}!</h2>
                <p>Selamat kembali ke Sistem Pengurusan Identiti Membership FareezOnzz</p>
            </div>
            <div>
                <button class="btn btn-secondary" id="refreshBtn" style="margin-right: 10px;">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                <button class="btn btn-warning" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        </div>
        
        <div class="admin-messages" id="adminMessages" style="display: none;">
            <h3><i class="fas fa-bullhorn"></i> Messages from Admin</h3>
            <div id="messagesContainer"></div>
        </div>
        
        <div class="profile-section" id="profileSection">
            ${getProfileSection(currentMember)}
        </div>
        
        <div class="info-section">
            <h3 class="section-title"><i class="fas fa-tachometer-alt"></i> Quick Actions</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-primary copy-btn" data-value="${currentMember?.id_card_registration || ''}">
                    <i class="fas fa-copy"></i> Copy ID Card
                </button>
                <button class="btn btn-secondary" onclick="window.print()">
                    <i class="fas fa-print"></i> Print Profile
                </button>
                <button class="btn btn-warning" id="systemCheckBtn">
                    <i class="fas fa-heartbeat"></i> System Status
                </button>
            </div>
        </div>
    `;
}

function getProfileSection(member) {
    if (!member) return '<p>Loading member data...</p>';
    
    const status = member.status_account || 'N/A';
    const statusClass = status.includes('✅AKTIF') ? 'success' : 'warning';
    
    return `
        <div class="profile-card">
            <img src="${member.profile_picture || 'https://via.placeholder.com/150x150/27ae60/ffffff?text=SPIMF'}" 
                 alt="Profile" class="profile-img" 
                 onerror="this.src='https://via.placeholder.com/150x150/27ae60/ffffff?text=SPIMF'">
            <h3 class="profile-name">${member.your_name_nama_anda || 'N/A'}</h3>
            <span class="profile-status" style="background: var(--${statusClass})">
                ${status}
            </span>
            <p><i class="fas fa-phone"></i> ${member.phone_number_nombor_telefon || 'N/A'}</p>
            <p><i class="fas fa-id-card"></i> ${member.id_card_registration || 'N/A'}</p>
            <p><i class="fas fa-user-tag"></i> ${member.membership_account || 'N/A'}</p>
        </div>
        
        <div>
            <div class="info-section">
                <h3 class="section-title"><i class="fas fa-user"></i> Personal Information</h3>
                <div class="info-grid">
                    ${getInfoItem('Full Name', member.your_name_nama_anda, 'your_name_nama_anda')}
                    ${getInfoItem('Phone Number', member.phone_number_nombor_telefon, 'phone_number_nombor_telefon')}
                    ${getInfoItem('ID Card', member.id_card_registration, 'id_card_registration')}
                    ${getInfoItem('Kode User', member.kode_user, 'kode_user')}
                    ${getInfoItem('Membership Account', member.membership_account, 'membership_account')}
                    ${getInfoItem('Account Status', member.status_account, 'status_account', false)}
                </div>
            </div>
            
            <div class="info-section">
                <h3 class="section-title"><i class="fas fa-cogs"></i> Account Settings</h3>
                <p>Last updated: ${new Date().toLocaleDateString('ms-MY')}</p>
            </div>
        </div>
    `;
}

function getInfoItem(label, value, field, editable = true) {
    return `
        <div class="info-item">
            <div class="info-label">${label}</div>
            <div class="info-value">
                ${editable ? `
                    <div class="editable-value">
                        <span>${value || 'N/A'}</span>
                        <button class="edit-btn" data-field="${field}" data-value="${value || ''}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                ` : `<span>${value || 'N/A'}</span>`}
            </div>
        </div>
    `;
}

// Copy to clipboard
function copyToClipboard(text) {
    if (!text) {
        showAlert('dashboard', 'No text to copy', 'error');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showAlert('dashboard', 'Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showAlert('dashboard', 'Failed to copy', 'error');
    });
}

// Alert helper
function showAlert(elementId, message, type) {
    let alertElement = document.getElementById(elementId);
    
    if (!alertElement) {
        // Create temporary alert
        alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type}`;
        alertElement.innerHTML = message;
        alertElement.style.position = 'fixed';
        alertElement.style.top = '20px';
        alertElement.style.right = '20px';
        alertElement.style.zIndex = '10000';
        alertElement.id = 'tempAlert';
        document.body.appendChild(alertElement);
        
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.parentNode.removeChild(alertElement);
            }
        }, 3000);
        return;
    }
    
    alertElement.innerHTML = message;
    alertElement.className = `alert alert-${type}`;
    alertElement.style.display = 'block';
    
    if (type !== 'info') {
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 3000);
    }
}

function clearAlerts() {
    ['loginAlert', 'guestAlert', 'systemAlert'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
}

// System countdown
function updateSystemCountdown() {
    if (!elements.systemCountdown) return;
    
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    let remaining = '';
    let color = 'var(--success)';
    
    if (hour >= 1 && hour < 6) {
        const hoursLeft = 6 - hour;
        const minutesLeft = 60 - minute;
        remaining = `Maintenance ends in: ${hoursLeft}h ${minutesLeft}m`;
        color = 'var(--warning)';
    } else {
        const targetHour = hour < 1 ? 1 : 25 - hour;
        const hoursLeft = targetHour - 1;
        const minutesLeft = 60 - minute;
        remaining = `Operational: ${hoursLeft}h ${minutesLeft}m`;
        color = 'var(--success)';
    }
    
    elements.systemCountdown.textContent = remaining;
    elements.systemCountdown.style.color = color;
}

// Logout function
function logout() {
    currentMember = null;
    isGuest = false;
    editState = {};
    
    // Clear localStorage
    localStorage.removeItem('spimf_member');
    localStorage.removeItem('spimf_session_time');
    
    // Reset UI
    if (elements.dashboard) elements.dashboard.style.display = 'none';
    if (elements.loginScreen) elements.loginScreen.style.display = 'flex';
    
    switchTab('member');
    clearForm();
    
    showAlert('loginAlert', 'Logged out successfully', 'success');
}

function clearForm() {
    if (elements.identifier) elements.identifier.value = '';
    if (elements.password) elements.password.value = '';
    if (elements.systemPassword) elements.systemPassword.value = '';
}

// Make functions available globally
window.logout = logout;
window.copyToClipboard = copyToClipboard;
