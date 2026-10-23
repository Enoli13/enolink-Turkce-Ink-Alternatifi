// Türkçe içerikler: örnek hikâye, kalıplar, yardım
window.ORNEK_HIKAYE = `// Enolink! — örnek hikâye
// Her "=== ad ===" bir düğümdür. Unity'de "Randomize" açıksa
// bu düğümler rastgele sırayla oyuncunun karşısına çıkar.

VAR cesaret = 0
VAR altin = 10

-> giris

=== giris ===
Gece yarısı, eski kervansarayın kapısı gıcırdadı. # konusan: anlatici
Sisli avluda bir fener sallanıyordu.
* [İçeri gir]
    Adımlarını sessizce attın.
    ~ cesaret += 1
* [Bekle ve dinle]
    Uzaktan bir ud sesi geliyordu.
- -> END

=== tuccar ===
Yaşlı bir tüccar tezgâhının ardından sana göz kırptı. # konusan: tuccar
"Bir harita ister misin? Sadece {altin > 5: beş altın|biraz cesaret} karşılığında."
* {altin >= 5} [Haritayı al]
    ~ altin -= 5
    Haritayı katlayıp cebine koydun.
* [Reddet]
    "Kaybeden sen olursun," dedi gülerek.
- -> END

=== kuyu ===
Avlunun ortasındaki kuyudan {~bir fısıltı|soğuk bir rüzgâr|bir kedi miyavlaması} yükseldi.
Aşağı bakınca yalnızca karanlık gördün.
-> END

=== bekci ===
Bekçi feneri yüzüne tuttu. # konusan: bekci
{cesaret > 0: "Cesur birine benziyorsun." | "Burada ne arıyorsun?"}
+ [Selam ver]
    Başını hafifçe eğdi.
+ [Sessiz kal]
    Omuz silkip yoluna devam etti.
- -> END
`;

window.KALIPLAR = [
  { ad: 'Düğüm (metin bloğu)', aciklama: 'Unity rastgele modda her düğüm ayrı bloktur', metin: '\n=== yeni_dugum ===\nMetin buraya.\n-> END\n' },
  { ad: 'Alt bölüm', aciklama: 'Düğüm içinde bölüm (stitch)', metin: '\n= alt_bolum\nMetin buraya.\n' },
  { ad: 'Seçenek (tek kullanımlık)', aciklama: '* bir kez seçilebilir', metin: '* [Seçenek metni]\n    Seçince olacaklar.\n' },
  { ad: 'Seçenek (kalıcı)', aciklama: '+ tekrar seçilebilir', metin: '+ [Seçenek metni]\n    Seçince olacaklar.\n' },
  { ad: 'Koşullu seçenek', aciklama: 'Şart sağlanırsa görünür', metin: '* {altin > 5} [Satın al]\n    ~ altin -= 5\n' },
  { ad: 'Toplanma noktası', aciklama: 'Seçeneklerden sonra akış birleşir', metin: '- ' },
  { ad: 'Yönlendirme', aciklama: 'Başka düğüme git', metin: '-> hedef_dugum' },
  { ad: 'Hikâyeyi bitir', aciklama: 'Akışı sonlandırır', metin: '-> END\n' },
  { ad: 'Değişken', aciklama: 'Genel değişken tanımla', metin: 'VAR degisken = 0\n' },
  { ad: 'Sabit', aciklama: 'Değişmeyen değer', metin: 'CONST MAKS = 10\n' },
  { ad: 'Değişken değiştir', aciklama: 'Mantık satırı', metin: '~ degisken += 1\n' },
  { ad: 'Koşul (eğer)', aciklama: 'Şarta göre metin', metin: '{degisken > 0: Şart doğruysa bu.|Değilse bu.}' },
  { ad: 'Çok koşullu', aciklama: 'switch benzeri', metin: '{\n    - degisken == 0: Sıfır.\n    - degisken < 5: Az.\n    - else: Çok.\n}\n' },
  { ad: 'Rastgele metin', aciklama: 'Her seferinde rastgele biri', metin: '{~ilk|ikinci|üçüncü}' },
  { ad: 'Karışık sıra', aciklama: 'Karıştırır, hepsi bitince tekrar', metin: '{shuffle:\n    - Birinci.\n    - İkinci.\n    - Üçüncü.\n}\n' },
  { ad: 'Döngü metni', aciklama: 'Sırayla döner', metin: '{&sabah|öğle|akşam}' },
  { ad: 'Sıralı metin', aciklama: 'Sonuncuda kalır', metin: '{ilk kez|ikinci kez|artık hep bu}' },
  { ad: 'Etiket (tag)', aciklama: "Unity'de okunur, ör. konuşan", metin: ' # konusan: ad' },
  { ad: 'Yapıştır', aciklama: 'Satırları birleştirir', metin: '<>' },
  { ad: 'Fonksiyon', aciklama: 'Hesaplama fonksiyonu', metin: '\n=== function ikiyle_carp(x) ===\n~ return x * 2\n' },
  { ad: 'Liste', aciklama: 'Durum listesi', metin: 'LIST ruh_hali = mutlu, (sakin), uzgun\n' },
  { ad: 'Başka dosya ekle', aciklama: 'INCLUDE', metin: 'INCLUDE diger_dosya.ink\n' },
  { ad: 'Harici fonksiyon', aciklama: "Unity C# tarafından sağlanır", metin: 'EXTERNAL sesCal(ad)\n' },
  { ad: 'Yorum', aciklama: 'Oyunda görünmez', metin: '// not: ' },
];

window.YARDIM_HTML = `
<h3>Ink hızlı rehber</h3>
<table class="rehber">
<tr><td><code>Düz metin</code></td><td>Oyuncuya gösterilen satır.</td></tr>
<tr><td><code>=== ad ===</code></td><td><b>Düğüm</b>. Hikâyenin bir bölümü. Unity rastgele modunda her düğüm bir metin bloğudur.</td></tr>
<tr><td><code>= ad</code></td><td>Alt bölüm (düğüm içinde).</td></tr>
<tr><td><code>* [Metin]</code></td><td>Bir kez seçilebilen seçenek.</td></tr>
<tr><td><code>+ [Metin]</code></td><td>Tekrar seçilebilen seçenek.</td></tr>
<tr><td><code>* Merhaba[.] dedim.</code></td><td>Köşeli parantez dışındaki kısım seçimden sonra da yazılır.</td></tr>
<tr><td><code>-</code></td><td>Toplanma: seçeneklerden sonra akış burada birleşir.</td></tr>
<tr><td><code>-&gt; ad</code></td><td>Başka düğüme git. <code>-&gt; END</code> bitirir, <code>-&gt; DONE</code> akışı durdurur.</td></tr>
<tr><td><code>VAR x = 0</code></td><td>Genel değişken. Unity'den okunup değiştirilebilir.</td></tr>
<tr><td><code>~ x = x + 1</code></td><td>Mantık satırı (hesap yap, gösterme).</td></tr>
<tr><td><code>{x}</code></td><td>Değişkenin değerini yaz.</td></tr>
<tr><td><code>{x &gt; 2: a|b}</code></td><td>Koşula göre a ya da b.</td></tr>
<tr><td><code>{~a|b|c}</code></td><td>Rastgele biri.</td></tr>
<tr><td><code>{&amp;a|b}</code></td><td>Döngü: a, b, a, b…</td></tr>
<tr><td><code># etiket</code></td><td>Satıra etiket. Unity'de <code>currentTags</code> ile okunur (ör. konuşan, ses, görsel).</td></tr>
<tr><td><code>&lt;&gt;</code></td><td>İki satırı yapıştırır.</td></tr>
<tr><td><code>// not</code></td><td>Yorum, oyunda görünmez.</td></tr>
<tr><td><code>INCLUDE a.ink</code></td><td>Başka ink dosyasını ekler (aynı klasöre göre).</td></tr>
</table>

<h3>Unity'ye aktarma</h3>
<ol>
<li><b>Unity</b> sekmesinde projenin ana klasörünü seç.</li>
<li>İstersen <b>Randomize</b> seçeneğini aç ve havuza girecek düğümleri işaretle.</li>
<li><b>Unity'ye Aktar</b>'a bas. Dosyalar <code>Assets/Enolink</code> içine yazılır.</li>
<li>Unity'de boş bir nesneye <b>InkHikayeYoneticisi</b> bileşenini ekle, <i>Hikaye Adi</i> alanına aktardığın adı yaz.</li>
<li>Hızlı deneme için aynı nesneye <b>InkBasitArayuz</b> ekle ve Play'e bas.</li>
</ol>
<p>Rastgele modda yönetici havuzdan rastgele bir düğüm seçer, bitince (seçenek kalmayınca veya <code>-&gt; END</code>) sıradakini rastgele seçer. "Tekrar etmesin" açıksa tüm bloklar bitmeden aynısı gelmez.</p>

<h3>Kısayollar</h3>
<table class="rehber">
<tr><td>Ctrl+S</td><td>Kaydet</td></tr><tr><td>Ctrl+O</td><td>Aç</td></tr><tr><td>Ctrl+N</td><td>Yeni</td></tr>
<tr><td>F5</td><td>Derle</td></tr><tr><td>F6</td><td>Baştan oynat</td></tr><tr><td>F7</td><td>Rastgele oynat</td></tr>
<tr><td>Ctrl+U</td><td>Unity'ye aktar</td></tr><tr><td>Ctrl+E</td><td>JSON dışa aktar</td></tr>
<tr><td>Ctrl+F / Ctrl+H</td><td>Bul / Bul ve değiştir</td></tr><tr><td>Ctrl+G</td><td>Satıra git</td></tr>
<tr><td>Ctrl+/</td><td>Satırı yorum yap</td></tr><tr><td>Ctrl+B</td><td>Paneli gizle/göster</td></tr>
</table>
<p class="ipucu">Enolink!, inkle'ın açık kaynak ink 1.2.1 motoru (MIT lisansı) üzerine kuruludur.</p>
`;
