// Enolink! — ana süreç
// Dosya işlemleri, derleme (inkjs: ink 1.2.1'in resmi JS portu) ve Unity aktarımı burada yapılır.
'use strict';
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const UYGULAMA_ADI = 'Enolink!';
const TAM_AD = 'Enolink! — Türkçe İnk alternatifi';
let pencere = null;

// ---------- Ayarlar (son dosyalar, Unity yolu vb.) ----------
const ayarDosyasi = () => path.join(app.getPath('userData'), 'ayarlar.json');
function ayarOku() {
  try { return JSON.parse(fs.readFileSync(ayarDosyasi(), 'utf8')); } catch { return {}; }
}
function ayarYaz(a) {
  try { fs.mkdirSync(path.dirname(ayarDosyasi()), { recursive: true }); fs.writeFileSync(ayarDosyasi(), JSON.stringify(a, null, 2)); } catch {}
}

const { derle, unityyeAktar } = require('./cekirdek');

// ---------- Pencere ----------
function pencereOlustur() {
  pencere = new BrowserWindow({
    width: 1400, height: 880, minWidth: 900, minHeight: 600,
    title: TAM_AD,
    backgroundColor: '#1e1b18',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  pencere.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  pencere.on('close', (e) => {
    if (pencere.__kapatOnayli) return;
    e.preventDefault();
    pencere.webContents.send('kapatma-istegi');
  });
}

function menuKur() {
  const g = (k) => () => pencere && pencere.webContents.send('menu', k);
  const sablon = [
    { label: 'Dosya', submenu: [
      { label: 'Yeni', accelerator: 'CmdOrCtrl+N', click: g('yeni') },
      { label: 'Aç…', accelerator: 'CmdOrCtrl+O', click: g('ac') },
      { label: 'Kaydet', accelerator: 'CmdOrCtrl+S', click: g('kaydet') },
      { label: 'Farklı Kaydet…', accelerator: 'CmdOrCtrl+Shift+S', click: g('farkliKaydet') },
      { type: 'separator' },
      { label: 'JSON Olarak Dışa Aktar…', accelerator: 'CmdOrCtrl+E', click: g('jsonAktar') },
      { label: "Unity'ye Aktar", accelerator: 'CmdOrCtrl+U', click: g('unityAktar') },
      { type: 'separator' },
      { label: 'Çıkış', role: 'quit' },
    ] },
    { label: 'Düzen', submenu: [
      { label: 'Geri Al', role: 'undo' }, { label: 'Yinele', role: 'redo' }, { type: 'separator' },
      { label: 'Kes', role: 'cut' }, { label: 'Kopyala', role: 'copy' }, { label: 'Yapıştır', role: 'paste' }, { label: 'Tümünü Seç', role: 'selectAll' },
      { type: 'separator' },
      { label: 'Bul', accelerator: 'CmdOrCtrl+F', click: g('bul') },
      { label: 'Bul ve Değiştir', accelerator: 'CmdOrCtrl+H', click: g('degistir') },
      { label: 'Satıra Git', accelerator: 'CmdOrCtrl+G', click: g('satiraGit') },
    ] },
    { label: 'Hikâye', submenu: [
      { label: 'Derle / Kontrol Et', accelerator: 'F5', click: g('derle') },
      { label: 'Baştan Oynat', accelerator: 'F6', click: g('oynat') },
      { label: 'Rastgele Oynat', accelerator: 'F7', click: g('rastgeleOynat') },
    ] },
    { label: 'Görünüm', submenu: [
      { label: 'Paneli Göster/Gizle', accelerator: 'CmdOrCtrl+B', click: g('panel') },
      { label: 'Yakınlaştır', role: 'zoomIn' }, { label: 'Uzaklaştır', role: 'zoomOut' }, { label: 'Normal Boyut', role: 'resetZoom' },
      { type: 'separator' }, { label: 'Tam Ekran', role: 'togglefullscreen' },
      { label: 'Geliştirici Araçları', role: 'toggleDevTools' },
    ] },
    { label: 'Yardım', submenu: [
      { label: 'Ink Hızlı Rehber', accelerator: 'F1', click: g('yardim') },
      { label: "Ink'in resmi dokümantasyonu (İngilizce)", click: () => shell.openExternal('https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md') },
      { label: 'Hakkında', click: g('hakkinda') },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(sablon));
}

// ---------- IPC ----------
const inkFiltre = [{ name: 'Ink hikâyesi', extensions: ['ink'] }, { name: 'Tüm dosyalar', extensions: ['*'] }];
ipcMain.handle('ayar-oku', () => ayarOku());
ipcMain.handle('ayar-yaz', (_e, a) => { ayarYaz({ ...ayarOku(), ...a }); return true; });
ipcMain.handle('derle', (_e, { kaynak, dosyaYolu }) => derle(kaynak, dosyaYolu));
ipcMain.handle('dosya-ac', async (_e, yol) => {
  if (!yol) {
    const r = await dialog.showOpenDialog(pencere, { title: 'Ink dosyası aç', filters: inkFiltre, properties: ['openFile'] });
    if (r.canceled || !r.filePaths[0]) return null;
    yol = r.filePaths[0];
  }
  try { return { yol, icerik: fs.readFileSync(yol, 'utf8') }; } catch (e) { return { hata: 'Dosya açılamadı: ' + e.message }; }
});
ipcMain.handle('dosya-kaydet', async (_e, { yol, icerik, farkli }) => {
  if (!yol || farkli) {
    const r = await dialog.showSaveDialog(pencere, { title: 'Kaydet', defaultPath: yol || 'hikaye.ink', filters: inkFiltre });
    if (r.canceled || !r.filePath) return null;
    yol = r.filePath.endsWith('.ink') ? r.filePath : r.filePath + '.ink';
  }
  try { fs.writeFileSync(yol, icerik, 'utf8'); return { yol }; } catch (e) { return { hata: 'Kaydedilemedi: ' + e.message }; }
});
ipcMain.handle('json-aktar', async (_e, { kaynak, dosyaYolu }) => {
  const s = derle(kaynak, dosyaYolu);
  if (!s.basarili) return { basarili: false, mesaj: 'Hikâyede hata var, JSON üretilemedi.' };
  const r = await dialog.showSaveDialog(pencere, { title: 'JSON olarak kaydet', defaultPath: (dosyaYolu || 'hikaye.ink').replace(/\.ink$/i, '') + '.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, s.json, 'utf8');
  return { basarili: true, mesaj: 'JSON kaydedildi: ' + r.filePath };
});
ipcMain.handle('unity-klasor-sec', async () => {
  const r = await dialog.showOpenDialog(pencere, { title: 'Unity proje klasörünü seç', properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return null;
  const k = r.filePaths[0];
  return { yol: k, unityMi: fs.existsSync(path.join(k, 'Assets')) && fs.existsSync(path.join(k, 'ProjectSettings')) };
});
ipcMain.handle('unity-aktar', (_e, o) => { try { return unityyeAktar(o); } catch (e) { return { basarili: false, mesaj: 'Aktarım hatası: ' + e.message }; } });
ipcMain.handle('klasor-goster', (_e, k) => { if (k) shell.openPath(k); });
ipcMain.handle('onay', async (_e, { mesaj, dugmeler }) => {
  const r = await dialog.showMessageBox(pencere, { type: 'question', message: mesaj, buttons: dugmeler, defaultId: 0, cancelId: dugmeler.length - 1, title: UYGULAMA_ADI });
  return r.response;
});
ipcMain.on('kapat-onayli', () => { if (pencere) { pencere.__kapatOnayli = true; pencere.close(); } });
ipcMain.on('baslik', (_e, b) => pencere && pencere.setTitle(b));

// Komut satırından dosya açma (ör. "enolink hikaye.ink")
function argDosyasi() {
  const a = process.argv.slice(app.isPackaged ? 1 : 2).find((x) => /\.ink$/i.test(x));
  return a && fs.existsSync(a) ? path.resolve(a) : null;
}
ipcMain.handle('baslangic-dosyasi', () => argDosyasi());

app.setName('Enolink');
app.whenReady().then(() => { menuKur(); pencereOlustur(); });
app.on('window-all-closed', () => app.quit());
