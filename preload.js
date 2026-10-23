'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('api', {
  ayarOku: () => ipcRenderer.invoke('ayar-oku'),
  ayarYaz: (a) => ipcRenderer.invoke('ayar-yaz', a),
  derle: (kaynak, dosyaYolu) => ipcRenderer.invoke('derle', { kaynak, dosyaYolu }),
  dosyaAc: (yol) => ipcRenderer.invoke('dosya-ac', yol),
  dosyaKaydet: (yol, icerik, farkli) => ipcRenderer.invoke('dosya-kaydet', { yol, icerik, farkli }),
  jsonAktar: (kaynak, dosyaYolu) => ipcRenderer.invoke('json-aktar', { kaynak, dosyaYolu }),
  unityKlasorSec: () => ipcRenderer.invoke('unity-klasor-sec'),
  unityAktar: (o) => ipcRenderer.invoke('unity-aktar', o),
  klasorGoster: (k) => ipcRenderer.invoke('klasor-goster', k),
  onay: (mesaj, dugmeler) => ipcRenderer.invoke('onay', { mesaj, dugmeler }),
  baslangicDosyasi: () => ipcRenderer.invoke('baslangic-dosyasi'),
  dosyaYoluAl: (f) => { try { return webUtils.getPathForFile(f); } catch { return null; } },
  kapatOnayli: () => ipcRenderer.send('kapat-onayli'),
  baslik: (b) => ipcRenderer.send('baslik', b),
  menuDinle: (f) => ipcRenderer.on('menu', (_e, k) => f(k)),
  kapatmaDinle: (f) => ipcRenderer.on('kapatma-istegi', () => f()),
});
