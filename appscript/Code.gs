// Konfigurasi Spreadsheet
const SPREADSHEET_ID = '1F2IBoLky1g_ZGDMRdt5dA7NwwFQOy-RL0GLuia0sFcg';
const SHEET_NAME = 'MEMBERSHIP FORM 2025 N';

// Inisialisasi
let ss, sheet;

function initialize() {
  ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  sheet = ss.getSheetByName(SHEET_NAME);
  return sheet;
}

// Fungsi utama untuk menampilkan halaman
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('SPIMF - Sistem Pengurusan Identiti Membership FareezOnzz')
    .setFaviconUrl('https://www.gstatic.com/images/branding/product/1x/docs_2020q4_32dp.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Login dengan berbagai metode
function loginUser(method, identifier, password = null) {
  try {
    initialize();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Mapping kolom berdasarkan metode
    const columnMap = {
      'phone': 'PHONE NUMBER / Nombor telefon',
      'idcard': 'ID CARD REGISTRATION',
      'kode': 'KODE USER',
      'account': 'MEMBERSHIP ACCOUNT'
    };
    
    const columnName = columnMap[method];
    if (!columnName) {
      return { success: false, message: 'Metode login tidak valid' };
    }
    
    const columnIndex = headers.indexOf(columnName);
    if (columnIndex === -1) {
      return { success: false, message: 'Kolom tidak ditemukan di spreadsheet' };
    }
    
    // Cari baris yang sesuai
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      if (row[columnIndex] && row[columnIndex].toString().trim() === identifier.trim()) {
        // Jika metode account, verifikasi password
        if (method === 'account') {
          const passwordIndex = headers.indexOf('MEMBERSHIP PASSWORD ACCOUNT');
          if (passwordIndex === -1 || row[passwordIndex] !== password) {
            return { success: false, message: 'Password tidak sesuai' };
          }
        }
        
        // Cek status akun
        const statusIndex = headers.indexOf('STATUS ACCOUNT');
        const status = row[statusIndex];
        
        if (status && status.includes('❌TIDAK AKTIF')) {
          return { 
            success: false, 
            message: 'Akun tidak aktif. Hubungi admin untuk mengaktifkan kembali.' 
          };
        }
        
        // Siapkan data user
        const userData = {};
        headers.forEach((header, index) => {
          userData[header] = row[index];
        });
        
        // Tambah informasi tambahan
        userData.rowNumber = i + 1;
        userData.loginTime = new Date().toISOString();
        
        // Buat session token
        const sessionToken = Utilities.getUuid();
        const cache = CacheService.getScriptCache();
        cache.put(sessionToken, JSON.stringify({
          userId: identifier,
          rowNumber: i + 1,
          timestamp: new Date().getTime()
        }), 21600); // 6 jam
        
        return {
          success: true,
          message: 'Login berhasil',
          userData: userData,
          sessionToken: sessionToken
        };
      }
    }
    
    return { success: false, message: 'Identitas tidak ditemukan' };
    
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      message: 'Terjadi kesalahan sistem: ' + error.message 
    };
  }
}

// Ambil data user berdasarkan session
function getUserData(sessionToken, rowNumber) {
  try {
    const cache = CacheService.getScriptCache();
    const sessionData = cache.get(sessionToken);
    
    if (!sessionData) {
      return { success: false, message: 'Session expired, silakan login kembali' };
    }
    
    initialize();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    if (rowNumber - 1 >= data.length) {
      return { success: false, message: 'Data user tidak ditemukan' };
    }
    
    const row = data[rowNumber - 1];
    const userData = {};
    headers.forEach((header, index) => {
      userData[header] = row[index];
    });
    
    return { success: true, userData: userData };
    
  } catch (error) {
    console.error('Get user data error:', error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

// Update data user
function updateUserData(sessionToken, updates, rowNumber) {
  try {
    const cache = CacheService.getScriptCache();
    const sessionData = cache.get(sessionToken);
    
    if (!sessionData) {
      return { success: false, message: 'Session expired, silakan login kembali' };
    }
    
    initialize();
    
    // Cek status akun terlebih dahulu
    const statusCell = sheet.getRange(rowNumber, 33); // Kolom AG
    const status = statusCell.getValue();
    
    if (status && status.includes('❌TIDAK AKTIF')) {
      return { 
        success: false, 
        message: 'Tidak dapat mengupdate. Status akun tidak aktif.' 
      };
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const updateData = {};
    
    // Validasi dan mapping kolom
    Object.keys(updates).forEach(field => {
      const columnIndex = headers.indexOf(field);
      if (columnIndex !== -1) {
        const cell = sheet.getRange(rowNumber, columnIndex + 1);
        const oldValue = cell.getValue();
        
        // Update nilai
        cell.setValue(updates[field]);
        updateData[field] = {
          old: oldValue,
          new: updates[field]
        };
      }
    });
    
    // Log perubahan
    logUpdate(rowNumber, updateData, sessionToken);
    
    // Update cache timestamp
    const sessionObj = JSON.parse(sessionData);
    sessionObj.lastUpdate = new Date().getTime();
    cache.put(sessionToken, JSON.stringify(sessionObj), 21600);
    
    return { 
      success: true, 
      message: 'Data berhasil diupdate',
      updateData: updateData
    };
    
  } catch (error) {
    console.error('Update error:', error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

// Log system
function logUpdate(rowNumber, changes, sessionToken) {
  try {
    let logSheet = ss.getSheetByName('SystemLogs');
    if (!logSheet) {
      logSheet = ss.insertSheet('SystemLogs');
      logSheet.getRange(1, 1, 1, 6).setValues([
        ['Timestamp', 'Row Number', 'Field', 'Old Value', 'New Value', 'Session Token']
      ]);
    }
    
    const timestamp = new Date();
    Object.keys(changes).forEach(field => {
      logSheet.appendRow([
        timestamp,
        rowNumber,
        field,
        changes[field].old,
        changes[field].new,
        sessionToken.substring(0, 8)
      ]);
    });
    
  } catch (error) {
    console.error('Log error:', error);
  }
}

// Get update history
function getUpdateHistory(rowNumber) {
  try {
    const logSheet = ss.getSheetByName('SystemLogs');
    if (!logSheet) return [];
    
    const data = logSheet.getDataRange().getValues();
    const history = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == rowNumber) {
        history.push({
          timestamp: data[i][0],
          field: data[i][2],
          oldValue: data[i][3],
          newValue: data[i][4]
        });
      }
    }
    
    return history.reverse(); // Return terbaru pertama
    
  } catch (error) {
    console.error('Get history error:', error);
    return [];
  }
}

// Revert changes
function revertChanges(rowNumber, logIndex) {
  try {
    const logSheet = ss.getSheetByName('SystemLogs');
    if (!logSheet) {
      return { success: false, message: 'Tidak ada history untuk direvert' };
    }
    
    const logData = logSheet.getDataRange().getValues();
    const logEntry = logData[logIndex + 1]; // +1 untuk header
    
    if (!logEntry || logEntry[1] != rowNumber) {
      return { success: false, message: 'Log entry tidak ditemukan' };
    }
    
    initialize();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const fieldIndex = headers.indexOf(logEntry[2]);
    
    if (fieldIndex !== -1) {
      sheet.getRange(rowNumber, fieldIndex + 1).setValue(logEntry[3]); // Set ke old value
    }
    
    // Hapus log entry setelah revert
    logSheet.deleteRow(logIndex + 2);
    
    return { success: true, message: 'Data berhasil dikembalikan' };
    
  } catch (error) {
    console.error('Revert error:', error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

// Check system operational hours
function checkSystemHours() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Konversi ke waktu Malaysia (UTC+8)
  const malaysiaHour = (currentHour + 8) % 24;
  
  const isOperational = (malaysiaHour >= 6 && malaysiaHour < 25) || 
                       (malaysiaHour >= 0 && malaysiaHour < 1);
  
  return {
    isOperational: isOperational,
    currentTime: `${malaysiaHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
    nextStart: isOperational ? null : '06:00',
    message: isOperational ? 
      'Sistem beroperasi normal' : 
      'Sistem tidak beroperasi. Waktu operasi: 6:00 Pagi - 1:00 Pagi'
  };
}

// Get operational countdown
function getCountdown() {
  const now = new Date();
  const malaysiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // UTC+8
  
  let targetTime;
  
  if (malaysiaTime.getHours() < 1) {
    // Jika sebelum 1 pagi, hitung sampai 1 pagi
    targetTime = new Date(malaysiaTime);
    targetTime.setHours(1, 0, 0, 0);
  } else if (malaysiaTime.getHours() < 6) {
    // Jika antara 1-6 pagi, hitung sampai 6 pagi
    targetTime = new Date(malaysiaTime);
    targetTime.setHours(6, 0, 0, 0);
  } else {
    // Jika setelah 6 pagi, hitung sampai 1 pagi esok
    targetTime = new Date(malaysiaTime);
    targetTime.setDate(targetTime.getDate() + 1);
    targetTime.setHours(1, 0, 0, 0);
  }
  
  const diff = targetTime - malaysiaTime;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return {
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
    isOperational: malaysiaTime.getHours() >= 6 || malaysiaTime.getHours() < 1
  };
}

// Copy to clipboard utility
function copyToClipboard(text) {
  return { success: true, text: text };
}

// Logout
function logoutUser(sessionToken) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(sessionToken);
    return { success: true, message: 'Logout berhasil' };
  } catch (error) {
    return { success: false, message: 'Logout error: ' + error.message };
  }
}
