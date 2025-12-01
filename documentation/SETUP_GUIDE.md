# 📘 Panduan Penyediaan SPIMF

## Prasyarat
1. Akaun Google (untuk Apps Script dan Sheets)
2. Google Sheet yang mengandungi data ahli (ikut format yang ditetapkan)

## Langkah-langkah Penyediaan
1. **Sediakan Google Sheet**
   - Buat salinan [Template Sheet]() (jika ada) atau sediakan sendiri.
   - Catat **ID Spreadsheet** dari URL: `docs.google.com/spreadsheets/d/[ID_INI]/edit`

2. **Buat Project Apps Script Baharu**
   - Buka [script.google.com](https://script.google.com)
   - Klik **"Project Baru"**
   - Gantikan kandungan `Code.gs` dengan kod dari [`appscript/Code.gs`](/appscript/Code.gs) di repo ini.
   - **Tukar `SPREADSHEET_ID`** dalam kod dengan ID Sheet anda.

3. **Tambah Fail HTML & Manifest**
   - Klik **"+" > "HTML"**, namakan `Index`. Tampal kod dari [`appscript/Index.html`](/appscript/Index.html).
   - Klik **"+" > "JSON"**, namakan `appsscript`. Tampal kod dari [`appscript/appsscript.json`](/appscript/appsscript.json).

4. **Deploy sebagai Web App**
   - Klik **"Deploy" > "New deployment"**
   - Pilih **"Web app"**
   - **"Execute as"**: Pilih "Me" (akaun anda)
   - **"Who has access"**: Pilih **"Anyone"** (supaya ahli boleh akses)
   - Klik **"Deploy"** dan salin URL yang dihasilkan.
