// ==============================================
// SPIMF SYSTEM - BACKEND PROFESSIONAL VERSION
// ==============================================
// Created: 22 November 2025
// Version: 3.0.2 (Fixed Header Method - FINAL)
// Last Updated: 27 November 2025
// ==============================================

// GLOBAL CONFIGURATION
const CONFIG = {
  spreadsheetId: '1F2IBoLky1g_ZGDMRdt5dA7NwwFQOy-RL0GLuia0sFcg',
  sheetName: 'MEMBERSHIP FORM 2025 N',
  cacheDuration: 300,
  maxRequestsPerMinute: 30,
  systemPassword: 'SPIMFONWER',
  operationalHours: { start: 6, end: 1 },
  timezone: 'Asia/Kuala_Lumpur'
};

// ==================== CORE FUNCTIONS ====================

/**
 * Main GET handler
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: 'SPIMF System API v3.0.2',
      timestamp: getTimestamp(),
      operational: checkOperationalHours()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main POST handler
 */
function doPost(e) {
  try {
    // Parse and validate request
    const request = parseRequest(e);
    if (!request.valid) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: request.error
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Rate limiting
    if (!checkRateLimit(request.ip)) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Rate limit exceeded. Please try again later.'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check system operational hours
    if (!checkOperationalHours() && request.action !== 'systemCheck') {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'System is currently in maintenance mode (6:00 AM - 1:00 AM).'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Route to appropriate handler
    const result = routeRequest(request);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Global error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: `System error: ${error.message}`,
        timestamp: getTimestamp()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle OPTIONS for CORS - FIXED VERSION
 */
function doOptions() {
  const response = ContentService.createTextOutput();
  response.setMimeType(ContentService.MimeType.JSON);
  return response;
}

// ==================== REQUEST HANDLERS ====================

function routeRequest(request) {
  const { action, data } = request;
  
  switch (action) {
    // Authentication
    case 'login': return handleLogin(data);
    case 'guestLogin': return handleGuestLogin();
    case 'validateSystemPassword': return validateSystemPassword(data.password);
    
    // Data retrieval
    case 'getMemberData': return getMemberData(data.identifier, data.method);
    case 'getAdminMessages': return getAdminMessages(data.memberId);
    case 'getSystemStats': return getSystemStats();
    
    // Data updates
    case 'updateMemberField': return updateMemberField(data.memberId, data.field, data.value);
    case 'updateMultipleFields': return updateMultipleFields(data.memberId, data.updates);
    
    // System operations
    case 'copyToClipboard': return { success: true, message: 'Copied to clipboard' };
    case 'logout': return { success: true, message: 'Logged out successfully' };
    case 'systemCheck': return systemHealthCheck();
    
    default: 
      return { success: false, message: 'Invalid action' };
  }
}

// ==================== AUTHENTICATION ====================

function handleLogin(data) {
  const { method, identifier, password } = data;
  
  if (!method || !identifier) {
    return { success: false, message: 'Missing required fields' };
  }
  
  const member = findMember(method, identifier);
  
  if (!member) {
    return { 
      success: false, 
      message: 'Member not found. Please check your credentials.' 
    };
  }
  
  // Validate password for membership account method
  if (method === 'membership' && member.password !== password) {
    return { success: false, message: 'Invalid password' };
  }
  
  // Check account status
  if (member.status && member.status !== '✅AKTIF') {
    return { 
      success: false, 
      message: `Account is ${member.status}. Please contact support.` 
    };
  }
  
  return {
    success: true,
    message: 'Login successful',
    member: sanitizeMemberData(member)
  };
}

function handleGuestLogin() {
  return {
    success: true,
    message: 'Guest login successful',
    member: {
      isGuest: true,
      name: 'Guest User',
      accessLevel: 'guest'
    }
  };
}

function validateSystemPassword(password) {
  if (password === CONFIG.systemPassword) {
    return { success: true, message: 'System password correct' };
  }
  return { success: false, message: 'Invalid system password' };
}

// ==================== DATA OPERATIONS ====================

function getMemberData(identifier, method) {
  try {
    const member = findMember(method, identifier);
    
    if (!member) {
      return { success: false, message: 'Member data not found' };
    }
    
    return {
      success: true,
      data: sanitizeMemberData(member)
    };
  } catch (error) {
    console.error('Get member data error:', error);
    return { success: false, message: 'Error retrieving member data' };
  }
}

function getAdminMessages(memberId) {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column index for admin messages
    const messageCol = headers.findIndex(h => 
      h && h.toString().toLowerCase().includes('message admin')
    );
    
    if (messageCol === -1) {
      return { success: true, messages: [] };
    }
    
    // Find member row
    const nameCol = 3; // Column D (0-based index 3)
    let memberMessage = '';
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][nameCol] && data[i][nameCol].toString().trim() === memberId.trim()) {
        memberMessage = data[i][messageCol] || '';
        break;
      }
    }
    
    const messages = memberMessage ? [{
      message: memberMessage,
      timestamp: getTimestamp()
    }] : [];
    
    return { success: true, messages: messages };
  } catch (error) {
    console.error('Get admin messages error:', error);
    return { success: false, message: 'Error retrieving messages' };
  }
}

function updateMemberField(memberId, field, value) {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column index for the field
    const columnIndex = headers.findIndex(h => 
      h.trim().toLowerCase() === field.trim().toLowerCase()
    );
    
    if (columnIndex === -1) {
      return { success: false, message: `Field "${field}" not found in sheet` };
    }
    
    // Find row index for the member
    const rowIndex = findMemberRow(data, memberId);
    
    if (rowIndex === -1) {
      return { success: false, message: 'Member not found' };
    }
    
    // Update the cell
    sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(value);
    
    // Log the update
    logUpdate(memberId, field, value);
    
    return {
      success: true,
      message: 'Field updated successfully',
      updatedField: field,
      newValue: value
    };
  } catch (error) {
    console.error('Update error:', error);
    return { success: false, message: `Update failed: ${error.message}` };
  }
}

function updateMultipleFields(memberId, updates) {
  const results = [];
  
  for (const [field, value] of Object.entries(updates)) {
    const result = updateMemberField(memberId, field, value);
    results.push({
      field: field,
      success: result.success,
      message: result.message
    });
  }
  
  return {
    success: results.every(r => r.success),
    results: results
  };
}

function getSystemStats() {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    return {
      success: true,
      stats: {
        totalMembers: lastRow - 1, // Exclude header
        totalColumns: lastCol,
        lastUpdated: getTimestamp(),
        operational: checkOperationalHours()
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error getting stats: ${error.message}`
    };
  }
}

// ==================== UTILITY FUNCTIONS ====================

function findMember(method, identifier) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let columnIndex = -1;
  
  // Map method to column
  switch (method) {
    case 'phone':
      columnIndex = getColumnIndex(headers, 'PHONE NUMBER');
      break;
    case 'idCard':
      columnIndex = getColumnIndex(headers, 'ID CARD REGISTRATION');
      break;
    case 'kodeUser':
      columnIndex = getColumnIndex(headers, 'KODE USER');
      break;
    case 'membership':
      columnIndex = getColumnIndex(headers, 'MEMBERSHIP ACCOUNT');
      break;
    default:
      return null;
  }
  
  if (columnIndex === -1) return null;
  
  // Search for member (case insensitive and trim)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const cellValue = row[columnIndex];
    
    if (cellValue && cellValue.toString().trim().toLowerCase() === identifier.trim().toLowerCase()) {
      return mapRowToMember(headers, row);
    }
  }
  
  return null;
}

function mapRowToMember(headers, row) {
  const member = {};
  
  // Map all columns
  headers.forEach((header, index) => {
    if (header && row[index] !== undefined) {
      const key = header.trim().toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      member[key] = row[index];
    }
  });
  
  // Add special fields with proper names
  if (row[3]) member.your_name_nama_anda = row[3]; // Column D
  if (row[2]) member.phone_number_nombor_telefon = row[2]; // Column C
  if (row[27]) member.id_card_registration = row[27]; // Column AB (0-based index 27)
  if (row[28]) member.kode_user = row[28]; // Column AC
  if (row[29]) member.membership_account = row[29]; // Column AD
  if (row[30]) member.profile_picture = row[30]; // Column AF
  if (row[32]) member.message_admin = row[32]; // Column AH
  if (row[31]) member.status_account = row[31]; // Column AG
  
  return member;
}

function sanitizeMemberData(member) {
  const sanitized = {};
  
  for (const key in member) {
    if (member[key] !== undefined && member[key] !== null) {
      sanitized[key] = member[key];
    }
  }
  
  return sanitized;
}

function checkOperationalHours() {
  const now = new Date();
  const hour = now.getHours();
  const { start, end } = CONFIG.operationalHours;
  
  // Handle overnight schedule (6 AM to 1 AM next day)
  if (end < start) {
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}

function checkRateLimit(ip) {
  const cache = CacheService.getScriptCache();
  const key = `rate_${ip}`;
  const count = parseInt(cache.get(key) || '0');
  
  if (count >= CONFIG.maxRequestsPerMinute) {
    return false;
  }
  
  cache.put(key, (count + 1).toString(), 60);
  return true;
}

// ==================== HELPER FUNCTIONS ====================

function parseRequest(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return { valid: false, error: 'No data provided' };
    }
    
    const data = JSON.parse(e.postData.contents);
    const ip = e.parameter && e.parameter.ip ? e.parameter.ip : 'unknown';
    
    return {
      valid: true,
      action: data.action,
      data: data.data || {},
      ip: ip
    };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON format' };
  }
}

function getSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = ss.getSheetByName(CONFIG.sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet "${CONFIG.sheetName}" not found`);
  }
  
  return sheet;
}

function getColumnIndex(headers, columnName) {
  return headers.findIndex(h => 
    h && h.toString().trim().toLowerCase() === columnName.toLowerCase()
  );
}

function findMemberRow(data, memberId) {
  // Search by name (column D, index 3)
  const nameColumn = 3;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][nameColumn] && 
        data[i][nameColumn].toString().trim().toLowerCase() === memberId.trim().toLowerCase()) {
      return i;
    }
  }
  
  return -1;
}

function getTimestamp() {
  return Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss');
}

function logUpdate(memberId, field, value) {
  try {
    const logSheetName = 'SYSTEM_LOGS';
    const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    let logSheet = ss.getSheetByName(logSheetName);
    
    if (!logSheet) {
      logSheet = ss.insertSheet(logSheetName);
      logSheet.getRange('A1:E1').setValues([
        ['Timestamp', 'Member ID', 'Field', 'Value', 'Action']
      ]);
    }
    
    logSheet.appendRow([
      getTimestamp(),
      memberId,
      field,
      value,
      'UPDATE'
    ]);
  } catch (error) {
    console.error('Log update error:', error);
  }
}

function systemHealthCheck() {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    
    return {
      success: true,
      health: {
        spreadsheet: 'Connected',
        rows: lastRow,
        columns: lastColumn,
        operationalHours: checkOperationalHours(),
        timestamp: getTimestamp(),
        quota: {
          dailyLimit: '90 minutes',
          remaining: 'Check script.google.com for quota'
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      health: {
        spreadsheet: 'Disconnected',
        error: error.message
      }
    };
  }
}

// ==================== INITIALIZATION ====================

function initializeSystem() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    
    // Create logs sheet if not exists
    if (!ss.getSheetByName('SYSTEM_LOGS')) {
      const logSheet = ss.insertSheet('SYSTEM_LOGS');
      logSheet.getRange('A1:E1').setValues([
        ['Timestamp', 'User', 'Action', 'Details', 'IP Address']
      ]);
    }
    
    console.log('SPIMF System initialized successfully');
    return { success: true, message: 'System ready' };
  } catch (error) {
    console.error('Initialize system error:', error);
    return { success: false, message: error.message };
  }
}
