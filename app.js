// ==============================================
// SPIMF SYSTEM - FRONTEND JAVASCRIPT
// ==============================================

// CONFIGURATION
const CONFIG = {
    // GANTI INI DENGAN URL APPS SCRIPT ANDA
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxmgDU2cIPgjRvpX4pyVZIBQKH9KYuqKYXeU1x1jCkgdFszXirSoOeHn9NzUsYw0D-B/exec',
    VERSION: '3.0.3'
};

// Global State
let currentMember = null;
let currentMethod = 'phone';
let isGuest = false;

// DOM Elements
const elements = {
    loginScreen: document.getElementById('loginScreen'),
    dashboard: document.getElementById('dashboard'),
    loginAlert: document.getElementById('loginAlert'),
    guestAlert: document.getElementById('guestAlert'),
    systemAlert: document.getElementById('systemAlert'),
    identifier: document.getElementById('identifier'),
    password: document.getElementById('password'),
    passwordGroup: document.getElementById('passwordGroup'),
    methodLabel: document.getElementById('methodLabel'),
    loginBtn: document.getElementById('loginBtn'),
    guestBtn: document.getElementById('guestBtn'),
    checkSystemBtn: document.getElementById('checkSystemBtn'),
    systemPassword: document.getElementById('systemPassword'),
    systemCountdown: document.getElementById('systemCountdown')
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('SPIMF System v' + CONFIG.VERSION + ' initialized');
    
    // Setup event listeners
    setupEventListeners();
    
    // Start system countdown
    updateSystemCountdown();
    setInterval(updateSystemCountdown, 1000);
    
    // Test API connection
    testAPIConnection();
});

// Test API Connection
async function testAPIConnection() {
    try {
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'systemCheck'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API Connection Successful:', data);
        } else {
            console.warn('⚠️ API Connection Issue');
        }
    } catch (error) {
        console.error('❌ API Connection Failed:', error);
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
    elements.loginBtn.addEventListener('click', handleMemberLogin);
    
    // Guest button
    elements.guestBtn.addEventListener('click', handleGuestLogin);
    
    // System check button
    elements.checkSystemBtn.addEventListener('click', checkSystemHealth);
    
    // Enter key support
    elements.identifier.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleMemberLogin();
    });
    
    elements.password.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleMemberLogin();
    });
    
    elements.systemPassword.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') checkSystemHealth();
    });
}

// Tab switching function
function switchTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Show correct form
    document.getElementById('memberLogin').style.display = tab === 'member' ? 'block' : 'none';
    document.getElementById('guestLogin').style.display = tab === 'guest' ? 'block' : 'none';
    document.getElementById('systemCheck').style.display = tab === 'system' ? 'block' : 'none';
    
    clearAlerts();
}

// Update method fields based on selection
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
    
    elements.methodLabel.textContent = labels[currentMethod];
    elements.identifier.placeholder = placeholders[currentMethod];
    
    // Show password only for membership method
    elements.passwordGroup.style.display = currentMethod === 'membership' ? 'block' : 'none';
}

// Handle member login
async function handleMemberLogin() {
    const identifier = elements.identifier.value.trim();
    
    if (!identifier) {
        showAlert(elements.loginAlert, 'Please enter your credentials', 'error');
        return;
    }
    
    if (currentMethod === 'membership' && !elements.password.value) {
        showAlert(elements.loginAlert, 'Please enter your password', 'error');
        return;
    }
    
    showAlert(elements.loginAlert, 'Logging in...', 'info');
    
    try {
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'login',
                data: {
                    method: currentMethod,
                    identifier: identifier,
                    password: elements.password.value
                }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success) {
                currentMember = result.member;
                isGuest = false;
                showDashboard();
            } else {
                showAlert(elements.loginAlert, result.message, 'error');
            }
        } else {
            showAlert(elements.loginAlert, 'Connection failed', 'error');
        }
    } catch (error) {
        showAlert(elements.loginAlert, 'Network error: ' + error.message, 'error');
    }
}

// Handle guest login
async function handleGuestLogin() {
    showAlert(elements.guestAlert, 'Entering guest mode...', 'info');
    
    try {
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'guestLogin',
                data: {}
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success) {
                currentMember = result.member;
                isGuest = true;
                showDashboard();
            } else {
                showAlert(elements.guestAlert, result.message, 'error');
            }
        } else {
            showAlert(elements.guestAlert, 'Connection failed', 'error');
        }
    } catch (error) {
        showAlert(elements.guestAlert, 'Network error', 'error');
    }
}

// Check system health
async function checkSystemHealth() {
    const password = elements.systemPassword.value.trim();
    
    if (password !== 'SPIMFONWER') {
        showAlert(elements.systemAlert, 'Invalid system password', 'error');
        return;
    }
    
    showAlert(elements.systemAlert, 'Checking system health...', 'info');
    
    try {
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'systemCheck',
                data: {}
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success) {
                const health = result.health;
                let message = `✅ System is ${health.spreadsheet}<br>`;
                message += `📊 ${health.rows} rows, ${health.columns} columns<br>`;
                message += `⏰ Operational: ${health.operationalHours ? 'Yes' : 'No'}`;
                
                showAlert(elements.systemAlert, message, 'success');
            } else {
                showAlert(elements.systemAlert, result.message, 'error');
            }
        } else {
            showAlert(elements.systemAlert, 'Connection failed', 'error');
        }
    } catch (error) {
        showAlert(elements.systemAlert, 'Network error', 'error');
    }
}

// Show dashboard after login
function showDashboard() {
    elements.loginScreen.style.display = 'none';
    elements.dashboard.style.display = 'block';
    
    loadDashboardContent();
}

// Load dashboard content
function loadDashboardContent() {
    const dashboard = elements.dashboard;
    
    if (isGuest) {
        dashboard.innerHTML = getGuestDashboard();
        return;
    }
    
    dashboard.innerHTML = getMemberDashboard(currentMember);
}

// Dashboard templates (simplified for now)
function getGuestDashboard() {
    return `
        <div class="dashboard-header">
            <div class="welcome-message">
                <h2>Welcome, Guest!</h2>
                <p>You are in limited access mode</p>
            </div>
            <button class="btn btn-secondary" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Exit Guest Mode
            </button>
        </div>
        
        <div class="info-section">
            <h3 class="section-title">About SPIMF</h3>
            <p>Sistem Pengurusan Identiti Membership FareezOnzz (SPIMF) adalah platform pengurusan keahlian profesional.</p>
        </div>
    `;
}

function getMemberDashboard(member) {
    return `
        <div class="dashboard-header">
            <div class="welcome-message">
                <h2>Welcome back, ${member.name || 'Member'}!</h2>
                <p>Selamat kembali di Sistem Pengurusan Identiti Membership FareezOnzz (SPIMF)</p>
            </div>
            <button class="btn btn-secondary" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
        
        <div class="info-section">
            <h3 class="section-title">Member Information</h3>
            <p>Member data will be loaded here from Google Sheets.</p>
        </div>
    `;
}

// Alert helper
function showAlert(element, message, type) {
    element.innerHTML = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
    
    if (type !== 'info') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function clearAlerts() {
    [elements.loginAlert, elements.guestAlert, elements.systemAlert].forEach(alert => {
        alert.style.display = 'none';
    });
}

// System countdown
function updateSystemCountdown() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();
    
    let remaining = '';
    
    if (hour >= 1 && hour < 6) {
        const target = new Date();
        target.setHours(6, 0, 0, 0);
        const diff = target - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        remaining = `Maintenance: ${hours}h ${minutes}m ${seconds}s`;
        elements.systemCountdown.style.color = 'var(--warning)';
    } else if (hour >= 6 || hour < 1) {
        const target = new Date();
        if (hour >= 6) {
            target.setDate(target.getDate() + 1);
        }
        target.setHours(1, 0, 0, 0);
        const diff = target - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        remaining = `Operational: ${hours}h ${minutes}m ${seconds}s`;
        elements.systemCountdown.style.color = 'var(--success)';
    }
    
    elements.systemCountdown.textContent = remaining;
}

// Logout function
function logout() {
    currentMember = null;
    isGuest = false;
    elements.dashboard.style.display = 'none';
    elements.loginScreen.style.display = 'flex';
    switchTab('member');
    clearForm();
}

function clearForm() {
    elements.identifier.value = '';
    elements.password.value = '';
    elements.systemPassword.value = '';
}

// Make functions available globally
window.logout = logout;
