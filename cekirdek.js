// Enolink! — çekirdek: derleme ve Unity aktarımı (Electron'dan bağımsız, test edilebilir)
'use strict';
const path = require('path');
const fs = require('fs');
const ink = require('inkjs/full');

// ---------- Derleyici mesajlarını Türkçeleştirme ----------
const ceviriler = [
  [/^ERROR:/, 'HATA:'], [/^WARNING:/, 'UYARI:'], [/^TODO:/, 'YAPILACAK:'], [/^RUNTIME ERROR:/, 'ÇALIŞMA HATASI:'], [/^RUNTIME WARNING:/, 'ÇALIŞMA UYARISI:'],
  [/\bline (\d+)/g, 'satır $1'],
  [/Divert target not found: '([^']*)'/, "Yönlendirme hedefi bulunamadı: '$1'"],
  [/Unresolved variable: (\S+)/, 'Tanımsız değişken: $1'],
  [/Expected (.*) but saw (.*)/, '$1 bekleniyordu ama $2 bulundu'],
  [/Unexpected content/i, 'Beklenmeyen içerik'],
  [/some kind of logic, conditional or sequence within braces: \{ \.\.\. \}/, 'süslü parantez içinde mantık, koşul veya dizi { ... }'],
  [/end of line/g, 'satır sonu'],
  [/closing brace '\}'/g, "kapanış parantezi '}'"],
  [/Failed to load: '([^']*)'/, "Yüklenemedi: '$1'"],
  [/Apparent loose end exists where the flow runs out\. Do you need a '-> DONE' or '-> END'\?/, "Akış bir yerde sonsuza açık kalıyor. '-> DONE' veya '-> END' eklemen gerekebilir."],
  [/Empty diverts \(->\) are only valid on choices/, 'Boş yönlendirme (->) sadece seçeneklerde kullanılabilir'],
  [/Expected end of line/, 'Satır sonu bekleniyordu'],
  [/Expected divert target/, 'Yönlendirme hedefi bekleniyordu'],
  [/'([^']*)' was already defined/, "'$1' zaten tanımlı"],
  [/Choice should not be empty/, 'Seçenek boş olmamalı'],
  [/Unexpected character/, 'Beklenmeyen karakter'],
  [/Knot names must/, 'Düğüm adları'],
  [/Function called with wrong number of arguments/i, 'Fonksiyon yanlış sayıda argümanla çağrıldı'],
  [/Unbalanced/i, 'Dengesiz'],
];
function turkcele(msj) {
  let m = String(msj);
  for (const [r, t] of ceviriler) m = m.replace(r, t);
  return m;
}
function mesajAyristir(msj, tur, anaDosya) {
  const ham = String(msj);
  const satirEsl = ham.match(/line (\d+)/);
  const dosyaEsl = ham.match(/'([^']+\.ink)'/);
  const temiz = anaDosya ? ham.replace("'" + anaDosya + "' ", '') : ham;
  return { tur, metin: turkcele(temiz), satir: satirEsl ? parseInt(satirEsl[1], 10) : null, dosya: dosyaEsl ? dosyaEsl[1] : null };
}

// ---------- Derleme ----------
function derle(kaynak, dosyaYolu) {
  const kok = dosyaYolu ? path.dirname(dosyaYolu) : process.cwd();
  const mesajlar = [];
  const anaAd = dosyaYolu ? path.basename(dosyaYolu) : 'hikaye.ink';
  const dosyaIsleyici = {
    ResolveInkFilename: (ad) => path.resolve(kok, ad),
    LoadInkFileContents: (tamYol) => fs.readFileSync(tamYol, 'utf8'),
  };
  const hataIsleyici = (msj, tur) => {
    // tur: 0 Yazar(TODO), 1 Uyarı, 2 Hata
    mesajlar.push(mesajAyristir(msj, tur === 2 ? 'hata' : tur === 1 ? 'uyari' : 'not', anaAd));
  };
  const secenekler = new ink.CompilerOptions(anaAd, [], false, hataIsleyici, dosyaIsleyici);
  let json = null;
  try {
    const derleyici = new ink.Compiler(kaynak, secenekler);
    const hikaye = derleyici.Compile();
    if (hikaye && !mesajlar.some((m) => m.tur === 'hata')) json = hikaye.ToJson();
  } catch (e) {
    if (!mesajlar.some((m) => m.tur === 'hata')) mesajlar.push({ tur: 'hata', metin: 'HATA: ' + turkcele(e.message || e), satir: null });
  }
  return { basarili: !!json, json, mesajlar, dugumler: json ? dugumleriBul(json) : [] };
}

// Derlenmiş JSON'dan düğüm (knot) adlarını ve alt bölümlerini (stitch) çıkarır
function dugumleriBul(json) {
  try {
    const d = JSON.parse(json);
    const kok = d.root;
    const sozluk = kok[kok.length - 1] || {};
    const sonuc = [];
    for (const ad of Object.keys(sozluk)) {
      if (ad === 'global decl' || ad.startsWith('#')) continue;
      const icerik = sozluk[ad];
      const altlar = [];
      if (Array.isArray(icerik)) {
        const son = icerik[icerik.length - 1];
        if (son && typeof son === 'object' && !Array.isArray(son)) {
          for (const k of Object.keys(son)) if (!k.startsWith('#') && !/^c-\d+$/.test(k) && !/^g-\d+$/.test(k) && !/^s\d*$/.test(k)) altlar.push(k);
        }
      }
      sonuc.push({ ad, altlar });
    }
    return sonuc;
  } catch { return []; }
}

// ---------- Unity aktarımı ----------
function dosyaAdiTemizle(ad) {
  return (ad || 'hikaye')
    .replace(/\.ink$/i, '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'hikaye';
}
function klasorKopyala(kaynak, hedef, filtre) {
  fs.mkdirSync(hedef, { recursive: true });
  for (const ad of fs.readdirSync(kaynak)) {
    const k = path.join(kaynak, ad), h = path.join(hedef, ad);
    if (fs.statSync(k).isDirectory()) klasorKopyala(k, h, filtre);
    else if (!filtre || filtre(ad)) fs.copyFileSync(k, h);
  }
}

function unityyeAktar(o) {
  // o: { kaynak, dosyaYolu, unityKlasoru, hikayeAdi, rastgele, havuz[], baslangic, tohum, tekrarYok, secenekleriKaristir, runtimeDahil }
  const sonuc = derle(o.kaynak, o.dosyaYolu);
  if (!sonuc.basarili) return { basarili: false, mesaj: 'Hikâyede hata var, önce hataları düzelt.', mesajlar: sonuc.mesajlar };
  if (!o.unityKlasoru) return { basarili: false, mesaj: 'Önce Unity proje klasörünü seç.' };

  const assets = fs.existsSync(path.join(o.unityKlasoru, 'Assets')) ? path.join(o.unityKlasoru, 'Assets') : o.unityKlasoru;
  const anaKlasor = path.join(assets, 'Enolink');
  const ad = dosyaAdiTemizle(o.hikayeAdi || (o.dosyaYolu ? path.basename(o.dosyaYolu) : 'hikaye'));
  const hikayeKlasoru = path.join(anaKlasor, 'Resources', 'EnolinkHikayeler');
  fs.mkdirSync(hikayeKlasoru, { recursive: true });

  const tumDugumler = sonuc.dugumler.map((d) => d.ad);
  let havuz = (o.havuz && o.havuz.length ? o.havuz : tumDugumler).filter((x) => tumDugumler.includes(x));
  if (o.baslangic) havuz = havuz.filter((x) => x !== o.baslangic);
  if (o.rastgele && havuz.length === 0) return { basarili: false, mesaj: 'Rastgele mod için hikâyede en az bir düğüm (=== ad ===) olmalı ve havuzda seçili olmalı.' };

  // Aktarım anında da karıştırılmış bir sıra yazılır; Unity tarafı istenirse her oyunda yeniden karıştırır.
  const karisik = havuz.slice();
  let tohum = Number.isFinite(+o.tohum) && String(o.tohum).trim() !== '' ? +o.tohum : Math.floor(Math.random() * 2147483647);
  let s = tohum >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = karisik.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [karisik[i], karisik[j]] = [karisik[j], karisik[i]]; }

  const ayar = {
    surum: 1,
    hikaye: ad,
    mod: o.rastgele ? 'rastgele' : 'sirali',
    baslangicDugumu: o.baslangic || '',
    havuz,
    aktarimdakiKarisikSira: karisik,
    tohum: o.sabitTohum ? tohum : 0,
    herOyundaYenidenKaristir: o.herOyundaKaristir !== false,
    tekrarYok: o.tekrarYok !== false,
    secenekleriKaristir: !!o.secenekleriKaristir,
    aktarimTarihi: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(hikayeKlasoru, ad + '.json'), sonuc.json, 'utf8');
  fs.writeFileSync(path.join(hikayeKlasoru, ad + '_ayar.json'), JSON.stringify(ayar, null, 2), 'utf8');

  // Betikler
  const sablonlar = path.join(__dirname, 'unity');
  klasorKopyala(path.join(sablonlar, 'Scripts'), path.join(anaKlasor, 'Scripts'));
  if (o.runtimeDahil !== false) {
    klasorKopyala(path.join(sablonlar, 'Runtime'), path.join(anaKlasor, 'Runtime'), (f) => f.endsWith('.cs') || f.endsWith('.txt') || f.endsWith('.asmdef'));
  }
  fs.copyFileSync(path.join(sablonlar, 'BENIOKU.txt'), path.join(anaKlasor, 'BENIOKU.txt'));

  return {
    basarili: true,
    mesaj: `Aktarıldı: ${path.relative(o.unityKlasoru, hikayeKlasoru) || hikayeKlasoru} → ${ad}.json (${ayar.mod === 'rastgele' ? 'RASTGELE, ' + havuz.length + ' metin bloğu' : 'sıralı'})`,
    klasor: anaKlasor, ad, ayar,
  };
}

module.exports = { derle, unityyeAktar, dugumleriBul, turkcele };
