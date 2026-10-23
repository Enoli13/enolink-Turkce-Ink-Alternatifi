// Enolink! — arayüz mantığı
'use strict';
(async function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const api = window.api;

  // ---------- Durum ----------
  const durum = {
    dosyaYolu: null,
    degisti: false,
    sonDerleme: null, // { basarili, json, mesajlar, dugumler }
    ayar: Object.assign({
      tema: 'koyu', boyut: 15, otoDerle: true, satirKaydir: true, otoKaydet: false,
      sonDosyalar: [], unity: {},
    }, await api.ayarOku()),
  };
  durum.ayar.unity = Object.assign({ yol: '', rastgele: false, havuz: null, baslangic: '', tekrarYok: true, herOyun: true, secKaristir: false, sabitTohum: false, tohum: '', runtime: true, canli: false, adlar: {} }, durum.ayar.unity || {});
  const ayarKaydet = () => api.ayarYaz(durum.ayar);

  // ---------- Editör ----------
  const cm = CodeMirror($('#editor'), {
    mode: 'ink', lineNumbers: true, lineWrapping: durum.ayar.satirKaydir, styleActiveLine: true,
    autoCloseBrackets: '{}[]()""', indentUnit: 4, tabSize: 4, indentWithTabs: false,
    gutters: ['hata-gutter', 'CodeMirror-linenumbers'],
    extraKeys: {
      'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment',
      'Ctrl-H': 'replace', 'Ctrl-G': 'jumpToLine',
      Tab: (c) => c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end'),
    },
    phrases: {
      'Search:': 'Ara:', '(Use /re/ syntax for regexp search)': '(düzenli ifade için /ifade/ yaz)',
      'Replace:': 'Değiştir:', 'Replace all:': 'Tümünü değiştir:', 'With:': 'Yenisi:', 'Replace with:': 'Yenisi:',
      'Replace?': 'Değiştirilsin mi?', Yes: 'Evet', No: 'Hayır', All: 'Tümü', Stop: 'Dur',
      'Jump to line:': 'Satıra git:', '(Use line:column or scroll% syntax)': '(satır:sütun veya yüzde% yaz)',
    },
  });
  // toggleComment için basit uygulama
  CodeMirror.commands.toggleComment = (c) => {
    const secimler = c.listSelections();
    c.operation(() => {
      for (const s of secimler) {
        const bas = Math.min(s.anchor.line, s.head.line), son = Math.max(s.anchor.line, s.head.line);
        const hepsiYorum = [...Array(son - bas + 1)].every((_, i) => /^\s*\/\//.test(c.getLine(bas + i)));
        for (let i = bas; i <= son; i++) {
          const t = c.getLine(i);
          if (hepsiYorum) c.replaceRange(t.replace(/^(\s*)\/\/ ?/, '$1'), { line: i, ch: 0 }, { line: i, ch: t.length });
          else c.replaceRange('// ' + t, { line: i, ch: 0 }, { line: i, ch: t.length });
        }
      }
    });
  };

  cm.on('cursorActivity', () => {
    const p = cm.getCursor();
    $('#imlecBilgi').textContent = `Satır ${p.line + 1}, Sütun ${p.ch + 1}`;
  });
  let derlemeZamanlayici = null;
  cm.on('change', () => {
    if (!durum.yukleniyor) degistiAyarla(true);
    istatistikGuncelle();
    if (durum.ayar.otoDerle) { clearTimeout(derlemeZamanlayici); derlemeZamanlayici = setTimeout(() => derle(false), 650); }
  });

  // ---------- Bildirim ----------
  let bildirimZ = null;
  function bildir(metin, tur = 'bilgi') {
    const b = $('#bildirim');
    b.textContent = metin; b.className = 'bildirim ' + tur; b.hidden = false;
    clearTimeout(bildirimZ); bildirimZ = setTimeout(() => (b.hidden = true), tur === 'hata' ? 6000 : 3500);
  }

  // ---------- Dosya ----------
  function dosyaAdi() { return durum.dosyaYolu ? durum.dosyaYolu.split(/[\\/]/).pop() : 'adsız.ink'; }
  function basligiGuncelle() {
    $('#dosyaAdi').textContent = dosyaAdi();
    $('#dosyaAdi').title = durum.dosyaYolu || 'Kaydedilmedi';
    $('#degisti').hidden = !durum.degisti;
    api.baslik(`${durum.degisti ? '● ' : ''}${dosyaAdi()} — Enolink!`);
    const ad = durum.ayar.unity.adlar[durum.dosyaYolu || ''] || '';
    $('#unityAd').value = ad;
  }
  function degistiAyarla(d) { if (durum.degisti !== d) { durum.degisti = d; basligiGuncelle(); } }
  function icerikYukle(metin, yol) {
    durum.yukleniyor = true;
    cm.setValue(metin); cm.clearHistory();
    durum.yukleniyor = false;
    durum.dosyaYolu = yol || null;
    degistiAyarla(false); basligiGuncelle();
    if (yol) sonDosyaEkle(yol);
    derle(false).then(() => oyunBaslat());
  }
  async function kaydedilmediyseSor() {
    if (!durum.degisti) return true;
    const r = await api.onay('Kaydedilmemiş değişiklikler var. Kaydetmek ister misin?', ['Kaydet', 'Kaydetme', 'Vazgeç']);
    if (r === 0) return await kaydet();
    return r === 1;
  }
  async function yeni() { if (await kaydedilmediyseSor()) icerikYukle('-> basla\n\n=== basla ===\nHikâyen burada başlıyor.\n-> END\n', null); }
  async function ac(yol) {
    if (!(await kaydedilmediyseSor())) return;
    const r = await api.dosyaAc(yol);
    if (!r) return;
    if (r.hata) return bildir(r.hata, 'hata');
    icerikYukle(r.icerik, r.yol);
    bildir('Açıldı: ' + dosyaAdi());
  }
  async function kaydet(farkli = false) {
    const r = await api.dosyaKaydet(durum.dosyaYolu, cm.getValue(), farkli);
    if (!r) return false;
    if (r.hata) { bildir(r.hata, 'hata'); return false; }
    const eskiYol = durum.dosyaYolu;
    durum.dosyaYolu = r.yol;
    if (!eskiYol && durum.ayar.unity.adlar['']) { durum.ayar.unity.adlar[r.yol] = durum.ayar.unity.adlar['']; delete durum.ayar.unity.adlar['']; }
    degistiAyarla(false); basligiGuncelle(); sonDosyaEkle(r.yol);
    bildir('Kaydedildi');
    if (durum.ayar.unity.canli && durum.ayar.unity.yol) unityAktar(true);
    return true;
  }
  function sonDosyaEkle(yol) {
    durum.ayar.sonDosyalar = [yol, ...durum.ayar.sonDosyalar.filter((x) => x !== yol)].slice(0, 10);
    ayarKaydet(); sonDosyalariCiz();
  }
  function sonDosyalariCiz() {
    const ul = $('#sonDosyalar'); ul.innerHTML = '';
    if (!durum.ayar.sonDosyalar.length) { ul.innerHTML = '<li class="ipucu">Henüz yok</li>'; return; }
    for (const y of durum.ayar.sonDosyalar) {
      const li = document.createElement('li');
      li.innerHTML = `<b></b><small></small>`;
      li.querySelector('b').textContent = y.split(/[\\/]/).pop();
      li.querySelector('small').textContent = y;
      li.onclick = () => ac(y);
      ul.appendChild(li);
    }
  }
  async function jsonAktar() {
    const r = await api.jsonAktar(cm.getValue(), durum.dosyaYolu);
    if (r) bildir(r.mesaj, r.basarili ? 'basari' : 'hata');
  }

  // ---------- Derleme ----------
  let hataIsaretleri = [];
  async function derle(bildirimGoster = true) {
    const s = await api.derle(cm.getValue(), durum.dosyaYolu);
    if (s.basarili) durum.sonDugumler = s.dugumler; else s.dugumler = durum.sonDugumler || [];
    durum.sonDerleme = s;
    hatalariCiz(s);
    dugumleriCiz();
    havuzuCiz();
    if (bildirimGoster) bildir(s.basarili ? (s.mesajlar.length ? `Derlendi (${s.mesajlar.length} uyarı)` : 'Derlendi, hata yok') : 'Derleme hatası', s.basarili ? 'basari' : 'hata');
    return s;
  }
  function hatalariCiz(s) {
    cm.clearGutter('hata-gutter');
    hataIsaretleri.forEach((l) => cm.removeLineClass(l, 'background', 'satir-hata'));
    hataIsaretleri = [];
    const ul = $('#hataListesi'); ul.innerHTML = '';
    const hatalar = s.mesajlar.filter((m) => m.tur === 'hata').length;
    const uyarilar = s.mesajlar.filter((m) => m.tur === 'uyari').length;
    $('#durumNokta').className = 'nokta ' + (hatalar ? 'kirmizi' : uyarilar ? 'sari' : 'yesil');
    $('#hataOzet').textContent = hatalar ? `${hatalar} hata${uyarilar ? `, ${uyarilar} uyarı` : ''}` : uyarilar ? `Hata yok, ${uyarilar} uyarı` : 'Hata yok — hikâye hazır';
    $('#hataCubugu').classList.toggle('acik', s.mesajlar.length > 0);
    for (const m of s.mesajlar) {
      const li = document.createElement('li');
      li.className = m.tur;
      li.textContent = m.metin;
      const anaDosya = !m.dosya || m.dosya === dosyaAdi() || m.dosya === 'hikaye.ink';
      if (m.satir && anaDosya) {
        li.onclick = () => { cm.focus(); cm.setCursor({ line: m.satir - 1, ch: 0 }); cm.scrollIntoView(null, 120); };
        const isaret = document.createElement('div');
        isaret.className = 'gutter-isaret ' + m.tur; isaret.title = m.metin; isaret.textContent = m.tur === 'hata' ? '●' : '▲';
        cm.setGutterMarker(m.satir - 1, 'hata-gutter', isaret);
        if (m.tur === 'hata') { const h = cm.addLineClass(m.satir - 1, 'background', 'satir-hata'); hataIsaretleri.push(h); }
      }
      ul.appendChild(li);
    }
  }

  // ---------- Yapı: düğümler & istatistik ----------
  function dugumSatiriBul(ad) {
    const re = new RegExp('^\\s*={2,}\\s*(function\\s+)?' + ad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    for (let i = 0; i < cm.lineCount(); i++) if (re.test(cm.getLine(i))) return i;
    return -1;
  }
  function dugumleriCiz() {
    const ul = $('#dugumListesi'); ul.innerHTML = '';
    const filtre = $('#dugumAra').value.trim().toLocaleLowerCase('tr');
    const dugumler = (durum.sonDerleme && durum.sonDerleme.dugumler) || [];
    if (!dugumler.length) { ul.innerHTML = '<li class="ipucu">Düğüm yok ya da hikâye derlenmedi.</li>'; return; }
    for (const d of dugumler) {
      if (filtre && !d.ad.toLocaleLowerCase('tr').includes(filtre)) continue;
      const li = document.createElement('li');
      li.innerHTML = '<span class="dad"></span><small></small>';
      li.querySelector('.dad').textContent = d.ad;
      li.querySelector('small').textContent = d.altlar.length ? d.altlar.length + ' alt bölüm' : '';
      li.onclick = () => { const s = dugumSatiriBul(d.ad); if (s >= 0) { cm.focus(); cm.setCursor({ line: s, ch: 0 }); cm.scrollIntoView({ line: s, ch: 0 }, 80); } };
      ul.appendChild(li);
    }
  }
  function istatistikGuncelle() {
    const satirlar = cm.getValue().split('\n');
    let kelime = 0, secenek = 0, yon = 0, dugum = 0, alt = 0, yorumda = false, degisken = 0, etiket = 0;
    for (let t of satirlar) {
      if (yorumda) { if (t.includes('*/')) { yorumda = false; t = t.split('*/').pop(); } else continue; }
      if (t.includes('/*')) { yorumda = !t.includes('*/'); t = t.split('/*')[0]; }
      t = t.replace(/\/\/.*/, '');
      if (/^\s*={2,}/.test(t)) { dugum++; continue; }
      if (/^\s*=\s*\w/.test(t)) { alt++; continue; }
      if (/^\s*(VAR|CONST)\b/.test(t)) { degisken++; continue; }
      if (/^\s*(~|INCLUDE|LIST|EXTERNAL)/.test(t)) continue;
      if (/^\s*[*+]/.test(t)) secenek++;
      yon += (t.match(/->/g) || []).length;
      etiket += (t.match(/#/g) || []).length;
      const duz = t.replace(/#.*/, '').replace(/->\s*[\w.]*/g, '').replace(/^\s*[-*+\s]+/, '').replace(/\{[^}]*\}/g, ' x ').replace(/[\[\]<>]/g, ' ');
      kelime += (duz.match(/[\p{L}\p{N}']+/gu) || []).length;
    }
    const dk = Math.max(1, Math.round(kelime / 200));
    $('#istatistik').innerHTML = [
      ['Kelime', kelime], ['Satır', satirlar.length], ['Düğüm', dugum], ['Alt bölüm', alt],
      ['Seçenek', secenek], ['Yönlendirme', yon], ['Değişken', degisken], ['Etiket', etiket], ['Okuma süresi', '~' + dk + ' dk'],
    ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  }

  // ---------- Kalıplar ----------
  function kaliplariCiz() {
    const k = $('#sablonlar');
    for (const s of window.KALIPLAR) {
      const b = document.createElement('button');
      b.className = 'sablon';
      b.innerHTML = '<b></b><small></small>';
      b.querySelector('b').textContent = s.ad; b.querySelector('small').textContent = s.aciklama;
      b.onclick = () => { cm.replaceSelection(s.metin, 'end'); cm.focus(); };
      k.appendChild(b);
    }
  }

  // ---------- Oynatıcı (önizleme) ----------
  const oyun = { hikaye: null, gecmis: [], rastgele: false, torba: [], kullanilan: [], blok: null, bitti: false };
  function karistir(dizi) { for (let i = dizi.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [dizi[i], dizi[j]] = [dizi[j], dizi[i]]; } return dizi; }
  function havuzAl() {
    const tum = ((durum.sonDerleme && durum.sonDerleme.dugumler) || []).map((d) => d.ad);
    const u = durum.ayar.unity;
    let h = Array.isArray(u.havuz) ? u.havuz.filter((x) => tum.includes(x)) : tum.slice();
    if (u.baslangic) h = h.filter((x) => x !== u.baslangic);
    return h;
  }
  function oyunAlani() { return $('#oyunAlani'); }
  function oyunYaz(html, sinif) { const p = document.createElement('div'); p.className = sinif || 'paragraf'; p.innerHTML = html; oyunAlani().appendChild(p); return p; }
  function kacis(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function oyunBaslat(rastgeleZorla) {
    const s = durum.sonDerleme;
    oyunAlani().innerHTML = '';
    if (rastgeleZorla !== undefined) $('#oyRastgele').checked = rastgeleZorla;
    oyun.rastgele = $('#oyRastgele').checked;
    if (!s || !s.basarili) { oyunYaz('Hikâye derlenemedi. Aşağıdaki hata listesine bak.', 'sistem hata'); return; }
    try {
      oyun.hikaye = new inkjs.Story(s.json);
      oyun.hikaye.onError = (m) => oyunYaz(kacis('Çalışma hatası: ' + m), 'sistem hata');
    } catch (e) { oyunYaz('Hikâye yüklenemedi: ' + kacis(e.message), 'sistem hata'); return; }
    oyun.gecmis = []; oyun.kullanilan = []; oyun.bitti = false; oyun.blok = null;
    if (oyun.rastgele) {
      oyun.torba = karistir(havuzAl());
      const u = durum.ayar.unity;
      if (!oyun.torba.length && !u.baslangic) { oyunYaz('Rastgele mod için hikâyede düğüm olmalı ve Unity sekmesindeki havuzda seçili olmalı.', 'sistem hata'); return; }
      if (u.baslangic) blokBaslat(u.baslangic); else blokBaslat(siradakiBlok());
    } else {
      devamEt();
    }
  }
  function siradakiBlok() {
    if (!oyun.torba.length) {
      if (!durum.ayar.unity.tekrarYok) { const h = havuzAl(); return h[Math.floor(Math.random() * h.length)] || null; }
      return null;
    }
    if (!durum.ayar.unity.tekrarYok) { const h = havuzAl(); return h[Math.floor(Math.random() * h.length)]; }
    return oyun.torba.shift();
  }
  function blokBaslat(ad) {
    if (!ad) { oyunYaz('Tüm metin blokları gösterildi. Unity\'de bu noktada <code>HikayeBitti</code> olayı tetiklenir.', 'sistem'); oyun.bitti = true; return; }
    oyun.blok = ad; oyun.kullanilan.push(ad);
    oyunYaz(`<span>Rastgele blok ${oyun.kullanilan.length}: <b>${kacis(ad)}</b></span>`, 'blok-ayrac');
    try { oyun.hikaye.ChoosePathString(ad); } catch (e) { oyunYaz('Düğüme gidilemedi: ' + kacis(e.message), 'sistem hata'); return; }
    devamEt();
  }
  function devamEt() {
    const h = oyun.hikaye;
    try {
      while (h.canContinue) {
        const satir = h.Continue();
        const etiketler = h.currentTags || [];
        if (satir.trim() || etiketler.length) {
          const p = oyunYaz(kacis(satir), 'paragraf yeni');
          if (etiketler.length) { const e = document.createElement('div'); e.className = 'etiketler'; e.innerHTML = etiketler.map((t) => `<span>#${kacis(t)}</span>`).join(''); p.appendChild(e); }
        }
      }
    } catch (e) { oyunYaz('Çalışma hatası: ' + kacis(e.message), 'sistem hata'); }
    seceneklerCiz();
    degiskenleriCiz();
    oyunAlani().scrollTop = oyunAlani().scrollHeight;
  }
  function seceneklerCiz() {
    const h = oyun.hikaye;
    let secenekler = h.currentChoices.slice();
    if (!secenekler.length) {
      if (oyun.rastgele) {
        const kutu = oyunYaz('', 'secenekler');
        const b = document.createElement('button'); b.className = 'secenek devam';
        b.textContent = 'Sıradaki rastgele blok →';
        b.onclick = () => { kutu.remove(); blokBaslat(siradakiBlok()); };
        kutu.appendChild(b);
        return;
      }
      oyunYaz('— Son —', 'sistem son');
      return;
    }
    if (oyun.rastgele && durum.ayar.unity.secKaristir) secenekler = karistir(secenekler);
    const kutu = oyunYaz('', 'secenekler');
    for (const c of secenekler) {
      const b = document.createElement('button'); b.className = 'secenek'; b.textContent = c.text;
      b.onclick = () => {
        oyun.gecmis.push({ durum: h.state.ToJson(), html: oyunAlani().innerHTML, torba: oyun.torba.slice(), kullanilan: oyun.kullanilan.slice() });
        kutu.remove();
        oyunYaz(kacis(c.text), 'secilen');
        $$('#oyunAlani .yeni').forEach((x) => x.classList.remove('yeni'));
        h.ChooseChoiceIndex(c.index);
        devamEt();
      };
      kutu.appendChild(b);
    }
  }
  function geriAl() {
    const g = oyun.gecmis.pop();
    if (!g) return bildir('Geri alınacak seçim yok');
    oyun.hikaye.state.LoadJson(g.durum);
    oyunAlani().innerHTML = g.html;
    oyun.torba = g.torba; oyun.kullanilan = g.kullanilan;
    // Butonları yeniden bağla
    const eski = oyunAlani().querySelector('.secenekler'); if (eski) eski.remove();
    seceneklerCiz(); degiskenleriCiz();
  }
  function degiskenleriCiz() {
    const t = $('#degiskenTablosu'); t.innerHTML = '';
    const h = oyun.hikaye; if (!h) return;
    const ds = h.variablesState;
    const adlar = ds._globalVariables ? Array.from(ds._globalVariables.keys()) : [];
    if (!adlar.length) { t.innerHTML = '<tr><td class="ipucu">Değişken yok</td></tr>'; return; }
    for (const ad of adlar) {
      let v = ds.$(ad);
      if (v && typeof v === 'object') v = v.toString();
      const tr = document.createElement('tr');
      tr.innerHTML = '<td></td><td></td>';
      tr.children[0].textContent = ad; tr.children[1].textContent = String(v);
      t.appendChild(tr);
    }
  }

  // ---------- Unity ----------
  function unityArayuzuGuncelle() {
    const u = durum.ayar.unity;
    const parca = (u.yol || '').split(/[\\/]/).filter(Boolean);
    $('#unityYolu').textContent = !u.yol ? 'Seçilmedi' : parca.length > 3 ? '…/' + parca.slice(-3).join('/') : u.yol;
    $('#unityYolu').title = u.yol || '';
    $('#unityRastgele').checked = u.rastgele;
    $('#rastgeleAyarlar').classList.toggle('kapali', !u.rastgele);
    $('#unityTekrarYok').checked = u.tekrarYok;
    $('#unityHerOyun').checked = u.herOyun;
    $('#unitySecKaristir').checked = u.secKaristir;
    $('#unitySabitTohum').checked = u.sabitTohum;
    $('#tohumSatiri').hidden = !u.sabitTohum;
    $('#unityTohum').value = u.tohum;
    $('#unityRuntime').checked = u.runtime;
    $('#unityCanli').checked = u.canli;
    $('#btnUnity').classList.toggle('rastgele-aktif', u.rastgele);
    $('#btnUnity').textContent = u.rastgele ? "Unity'ye Aktar (rastgele)" : "Unity'ye Aktar";
  }
  function havuzuCiz() {
    const u = durum.ayar.unity;
    const dugumler = ((durum.sonDerleme && durum.sonDerleme.dugumler) || []).map((d) => d.ad);
    const sel = $('#unityBaslangic');
    sel.innerHTML = '<option value="">(yok — tamamen rastgele)</option>' + dugumler.map((d) => `<option>${kacis(d)}</option>`).join('');
    sel.value = dugumler.includes(u.baslangic) ? u.baslangic : '';
    const k = $('#havuzListesi'); k.innerHTML = '';
    if (!dugumler.length) { k.innerHTML = '<p class="ipucu">Hikâyede düğüm yok. Rastgele mod için <code>=== ad ===</code> ile bloklar oluştur.</p>'; return; }
    const secili = Array.isArray(u.havuz) ? u.havuz : dugumler;
    for (const d of dugumler) {
      const l = document.createElement('label'); l.className = 'havuz-oge' + (d === u.baslangic ? ' devre-disi' : '');
      l.innerHTML = '<input type="checkbox"><span></span>';
      l.querySelector('span').textContent = d + (d === u.baslangic ? ' (başlangıç)' : '');
      const cb = l.querySelector('input'); cb.checked = secili.includes(d); cb.disabled = d === u.baslangic;
      cb.onchange = () => {
        const simdi = Array.isArray(u.havuz) ? u.havuz.slice() : dugumler.slice();
        u.havuz = cb.checked ? [...new Set([...simdi, d])] : simdi.filter((x) => x !== d);
        ayarKaydet();
      };
      k.appendChild(l);
    }
  }
  async function unitySec() {
    const r = await api.unityKlasorSec();
    if (!r) return;
    durum.ayar.unity.yol = r.yol; ayarKaydet(); unityArayuzuGuncelle();
    $('#unityDurum').innerHTML = r.unityMi ? '✔ Unity projesi bulundu.' : '⚠ Bu klasörde <b>Assets</b>/<b>ProjectSettings</b> yok; yine de dosyalar buraya yazılır.';
  }
  async function unityAktar(sessiz) {
    const u = durum.ayar.unity;
    if (!u.yol) { sekmeAc('unity'); await unitySec(); if (!durum.ayar.unity.yol) return; }
    const r = await api.unityAktar({
      kaynak: cm.getValue(), dosyaYolu: durum.dosyaYolu, unityKlasoru: u.yol,
      hikayeAdi: $('#unityAd').value.trim() || null,
      rastgele: u.rastgele, havuz: Array.isArray(u.havuz) ? u.havuz : null, baslangic: u.baslangic,
      tekrarYok: u.tekrarYok, herOyundaKaristir: u.herOyun, secenekleriKaristir: u.secKaristir,
      sabitTohum: u.sabitTohum, tohum: u.tohum, runtimeDahil: u.runtime,
    });
    $('#unitySonuc').textContent = r.mesaj;
    $('#unitySonuc').className = 'sonuc ' + (r.basarili ? 'basari' : 'hata');
    if (r.basarili) { durum.sonKlasor = r.klasor; $('#unityKlasorAc').disabled = false; }
    if (!sessiz || !r.basarili) bildir(r.mesaj, r.basarili ? 'basari' : 'hata');
    if (r.mesajlar) hatalariCiz({ mesajlar: r.mesajlar });
  }

  // ---------- Sekmeler, panel, ayarlar ----------
  function sekmeAc(ad) {
    $$('.sekmeler button').forEach((b) => b.classList.toggle('aktif', b.dataset.sekme === ad));
    $$('.sekme-icerik').forEach((d) => d.classList.toggle('aktif', d.dataset.icerik === ad));
    $('#panel').classList.remove('gizli');
  }
  $$('.sekmeler button').forEach((b) => (b.onclick = () => sekmeAc(b.dataset.sekme)));
  function temaUygula() {
    const a = durum.ayar;
    document.documentElement.dataset.tema = a.tema;
    document.documentElement.style.setProperty('--editor-boyut', a.boyut + 'px');
    $('#ayTema').value = a.tema; $('#ayBoyut').value = a.boyut; $('#ayBoyutDeger').textContent = a.boyut;
    $('#ayOtoDerle').checked = a.otoDerle; $('#aySatirKaydir').checked = a.satirKaydir; $('#ayOtoKaydet').checked = a.otoKaydet;
    cm.setOption('lineWrapping', a.satirKaydir);
    cm.refresh();
  }
  $('#ayTema').onchange = (e) => { durum.ayar.tema = e.target.value; ayarKaydet(); temaUygula(); };
  $('#ayBoyut').oninput = (e) => { durum.ayar.boyut = +e.target.value; ayarKaydet(); temaUygula(); };
  $('#ayOtoDerle').onchange = (e) => { durum.ayar.otoDerle = e.target.checked; ayarKaydet(); };
  $('#aySatirKaydir').onchange = (e) => { durum.ayar.satirKaydir = e.target.checked; ayarKaydet(); temaUygula(); };
  $('#ayOtoKaydet').onchange = (e) => { durum.ayar.otoKaydet = e.target.checked; ayarKaydet(); };
  setInterval(() => { if (durum.ayar.otoKaydet && durum.degisti && durum.dosyaYolu) kaydet(); }, 30000);

  const ub = (id, alan, sonra) => ($(id).onchange = (e) => { durum.ayar.unity[alan] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; ayarKaydet(); unityArayuzuGuncelle(); if (sonra) sonra(); });
  ub('#unityRastgele', 'rastgele', () => { $('#oyRastgele').checked = durum.ayar.unity.rastgele; });
  ub('#unityTekrarYok', 'tekrarYok'); ub('#unityHerOyun', 'herOyun'); ub('#unitySecKaristir', 'secKaristir');
  ub('#unitySabitTohum', 'sabitTohum'); ub('#unityTohum', 'tohum'); ub('#unityRuntime', 'runtime'); ub('#unityCanli', 'canli');
  ub('#unityBaslangic', 'baslangic', havuzuCiz);
  $('#unityAd').onchange = (e) => { durum.ayar.unity.adlar[durum.dosyaYolu || ''] = e.target.value.trim(); ayarKaydet(); };
  $('#havuzTumu').onclick = (e) => { e.preventDefault(); durum.ayar.unity.havuz = null; ayarKaydet(); havuzuCiz(); };
  $('#havuzHicbiri').onclick = (e) => { e.preventDefault(); durum.ayar.unity.havuz = []; ayarKaydet(); havuzuCiz(); };
  $('#unitySec').onclick = unitySec;
  $('#unityAktarBtn').onclick = () => unityAktar(false);
  $('#unityKlasorAc').onclick = () => api.klasorGoster(durum.sonKlasor);

  $('#btnDerle').onclick = () => derle(true);
  $('#btnOynat').onclick = async () => { sekmeAc('oynat'); await derle(false); oyunBaslat(); };
  $('#btnUnity').onclick = () => { sekmeAc('unity'); unityAktar(false); };
  $('#btnPanel').onclick = () => { $('#panel').classList.toggle('gizli'); setTimeout(() => cm.refresh(), 220); };
  $('#oyBastan').onclick = async () => { await derle(false); oyunBaslat(); };
  $('#oyGeri').onclick = geriAl;
  $('#oyRastgele').onchange = () => oyunBaslat();
  $('#dugumAra').oninput = dugumleriCiz;
  $('#hataBaslik').onclick = () => $('#hataCubugu').classList.toggle('acik');
  $('#dYeni').onclick = yeni; $('#dAc').onclick = () => ac(); $('#dKaydet').onclick = () => kaydet(); $('#dFarkli').onclick = () => kaydet(true);
  $('#dJson').onclick = jsonAktar;
  $('#dOrnek').onclick = async () => { if (await kaydedilmediyseSor()) icerikYukle(window.ORNEK_HIKAYE, null); };
  $('#yardimIcerik').innerHTML = window.YARDIM_HTML;

  api.menuDinle(async (k) => {
    const islem = {
      yeni, ac: () => ac(), kaydet: () => kaydet(), farkliKaydet: () => kaydet(true), jsonAktar,
      unityAktar: () => { sekmeAc('unity'); unityAktar(false); },
      bul: () => cm.execCommand('find'), degistir: () => cm.execCommand('replace'), satiraGit: () => cm.execCommand('jumpToLine'),
      derle: () => derle(true),
      oynat: async () => { sekmeAc('oynat'); await derle(false); oyunBaslat(false); },
      rastgeleOynat: async () => { sekmeAc('oynat'); await derle(false); oyunBaslat(true); },
      panel: () => $('#btnPanel').click(),
      yardim: () => sekmeAc('yardim'),
      hakkinda: () => bildir('Enolink! 1.0 — Türkçe İnk alternatifi. inkle ink 1.2.1 motoru üzerine kuruludur (MIT).'),
    }[k];
    if (islem) islem();
  });
  api.kapatmaDinle(async () => { if (await kaydedilmediyseSor()) api.kapatOnayli(); });

  // Dosya sürükle-bırak
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    const y = f && api.dosyaYoluAl(f);
    if (y && /\.ink$/i.test(y)) ac(y);
  });

  // ---------- Başlangıç ----------
  temaUygula(); unityArayuzuGuncelle(); kaliplariCiz(); sonDosyalariCiz();
  $('#oyRastgele').checked = durum.ayar.unity.rastgele;
  const bas = await api.baslangicDosyasi();
  if (bas) { const r = await api.dosyaAc(bas); if (r && !r.hata) icerikYukle(r.icerik, r.yol); else icerikYukle(window.ORNEK_HIKAYE, null); }
  else icerikYukle(window.ORNEK_HIKAYE, null);
  istatistikGuncelle();
  cm.focus();
  window.__studyo = { cm, durum, derle, oyunBaslat, unityAktar }; // test için
})();
