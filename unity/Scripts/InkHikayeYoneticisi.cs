// Enolink! — Unity hikâye yöneticisi
// Enolink!'ten aktarılan hikâyeyi oynatır. "Randomize" ile aktarıldıysa
// metin blokları (düğümler) rastgele sırayla gelir.
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using Ink.Runtime;

namespace Enolink
{
    [Serializable]
    public class InkAktarimAyari
    {
        public int surum;
        public string hikaye;
        public string mod = "sirali";
        public string baslangicDugumu = "";
        public string[] havuz = new string[0];
        public string[] aktarimdakiKarisikSira = new string[0];
        public int tohum;
        public bool herOyundaYenidenKaristir = true;
        public bool tekrarYok = true;
        public bool secenekleriKaristir;
    }

    public enum InkOynatmaModu { AktarimAyarinaGore, Sirali, Rastgele }

    [Serializable] public class InkMetinOlayi : UnityEvent<string, List<string>> { }
    [Serializable] public class InkSecenekOlayi : UnityEvent<List<Choice>> { }
    [Serializable] public class InkBlokOlayi : UnityEvent<string> { }

    [AddComponentMenu("Enolink!/Ink Hikâye Yöneticisi")]
    public class InkHikayeYoneticisi : MonoBehaviour
    {
        [Header("Hikâye")]
        [Tooltip("Enolink!'te aktarırken kullanılan ad. Resources/EnolinkHikayeler/<ad>.json dosyası yüklenir.")]
        public string hikayeAdi = "hikaye";
        [Tooltip("İsteğe bağlı: JSON'u doğrudan sürükleyip bırak (doluysa hikâye adı yerine bu kullanılır).")]
        public TextAsset hikayeJson;
        [Tooltip("İsteğe bağlı: <ad>_ayar.json dosyası (boşsa adından bulunur).")]
        public TextAsset ayarJson;

        [Header("Oynatma")]
        [Tooltip("AktarimAyarinaGore: Enolink!'te seçtiğin mod kullanılır.")]
        public InkOynatmaModu mod = InkOynatmaModu.AktarimAyarinaGore;
        [Tooltip("Tüm bloklar bitince havuzu yeniden karıştırıp devam et (sonsuz oyun).")]
        public bool bitinceYenidenKaristir = false;
        [Tooltip("Sahne başlayınca hikâyeyi otomatik başlat.")]
        public bool otomatikBasla = true;

        [Header("Olaylar")]
        public InkMetinOlayi MetinGeldi = new InkMetinOlayi();
        public InkSecenekOlayi SeceneklerGeldi = new InkSecenekOlayi();
        public InkBlokOlayi BlokBasladi = new InkBlokOlayi();
        public InkBlokOlayi BlokBitti = new InkBlokOlayi();
        public UnityEvent HikayeBitti = new UnityEvent();

        public Story Hikaye { get; private set; }
        public InkAktarimAyari Ayar { get; private set; }
        public bool RastgeleMi { get; private set; }
        public string AktifBlok { get; private set; }
        public bool BittiMi { get; private set; }
        public int GosterilenBlokSayisi { get; private set; }

        readonly List<string> _torba = new List<string>();
        System.Random _rnd;
        List<Choice> _karisikSecenekler;
        int _karisikSecenekTuru = -1;
        string _sonBlok;

        void Start()
        {
            if (otomatikBasla) Baslat();
        }

        /// <summary>JSON ve ayarları yükler (Baslat bunu kendisi çağırır).</summary>
        public bool Yukle()
        {
            var json = hikayeJson != null ? hikayeJson : Resources.Load<TextAsset>("EnolinkHikayeler/" + hikayeAdi);
            if (json == null)
            {
                Debug.LogError("[Enolink] Hikâye bulunamadı: Resources/EnolinkHikayeler/" + hikayeAdi + ".json — Enolink!'ten Unity'ye aktardığından ve adın doğru olduğundan emin ol.");
                return false;
            }
            var ayarDosyasi = ayarJson != null ? ayarJson : Resources.Load<TextAsset>("EnolinkHikayeler/" + (hikayeJson != null ? hikayeJson.name : hikayeAdi) + "_ayar");
            Ayar = ayarDosyasi != null ? JsonUtility.FromJson<InkAktarimAyari>(ayarDosyasi.text) : new InkAktarimAyari();
            if (Ayar.havuz == null) Ayar.havuz = new string[0];
            if (Ayar.aktarimdakiKarisikSira == null) Ayar.aktarimdakiKarisikSira = new string[0];

            Hikaye = new Story(json.text);
            Hikaye.onError += (mesaj, tur) =>
            {
                if (tur == Ink.ErrorType.Error) Debug.LogError("[Enolink] " + mesaj); else Debug.LogWarning("[Enolink] " + mesaj);
            };

            RastgeleMi = mod == InkOynatmaModu.Rastgele || (mod == InkOynatmaModu.AktarimAyarinaGore && Ayar.mod == "rastgele");
            _rnd = Ayar.tohum != 0 ? new System.Random(Ayar.tohum) : new System.Random(Guid.NewGuid().GetHashCode());
            return true;
        }

        /// <summary>Hikâyeyi baştan başlatır.</summary>
        public void Baslat()
        {
            if (!Yukle()) return;
            BittiMi = false; AktifBlok = null; _sonBlok = null; GosterilenBlokSayisi = 0; _karisikSecenekTuru = -1;
            if (RastgeleMi)
            {
                TorbayiDoldur();
                if (!string.IsNullOrEmpty(Ayar.baslangicDugumu)) BlokOynat(Ayar.baslangicDugumu);
                else SiradakiBlok();
            }
        }

        void TorbayiDoldur()
        {
            _torba.Clear();
            var kaynak = (Ayar.herOyundaYenidenKaristir || Ayar.aktarimdakiKarisikSira.Length == 0) ? Ayar.havuz : Ayar.aktarimdakiKarisikSira;
            foreach (var ad in kaynak) if (!string.IsNullOrEmpty(ad) && Hikaye.KnotContainerWithName(ad) != null) _torba.Add(ad);
            if (Ayar.herOyundaYenidenKaristir || Ayar.aktarimdakiKarisikSira.Length == 0) Karistir(_torba);
            // Yeniden doldururken son gösterilen blok hemen tekrar gelmesin
            if (_torba.Count > 1 && _torba[0] == _sonBlok) { var t = _torba[0]; _torba.RemoveAt(0); _torba.Add(t); }
        }

        void Karistir<T>(IList<T> liste)
        {
            for (int i = liste.Count - 1; i > 0; i--)
            {
                int j = _rnd.Next(i + 1);
                T t = liste[i]; liste[i] = liste[j]; liste[j] = t;
            }
        }

        /// <summary>Belirli bir düğümü (metin bloğunu) oynatmaya başlar.</summary>
        public void BlokOynat(string dugumAdi)
        {
            if (Hikaye == null && !Yukle()) return;
            AktifBlok = dugumAdi; _sonBlok = dugumAdi; GosterilenBlokSayisi++;
            _karisikSecenekTuru = -1;
            Hikaye.ChoosePathString(dugumAdi);
            BlokBasladi.Invoke(dugumAdi);
        }

        /// <summary>Rastgele modda sıradaki rastgele bloğa geçer. Blok kalmadıysa false döner.</summary>
        public bool SiradakiBlok()
        {
            if (Hikaye == null) return false;
            string sonraki = null;
            if (!Ayar.tekrarYok)
            {
                var havuz = new List<string>();
                foreach (var ad in Ayar.havuz) if (Hikaye.KnotContainerWithName(ad) != null) havuz.Add(ad);
                if (havuz.Count > 1) havuz.Remove(_sonBlok);
                if (havuz.Count > 0) sonraki = havuz[_rnd.Next(havuz.Count)];
            }
            else
            {
                if (_torba.Count == 0 && bitinceYenidenKaristir) TorbayiDoldur();
                if (_torba.Count > 0) { sonraki = _torba[0]; _torba.RemoveAt(0); }
            }
            if (sonraki == null)
            {
                BittiMi = true;
                HikayeBitti.Invoke();
                return false;
            }
            BlokOynat(sonraki);
            return true;
        }

        /// <summary>Gösterilecek metin var mı?</summary>
        public bool DevamEdebilirMi { get { return Hikaye != null && Hikaye.canContinue; } }

        /// <summary>Şu anki blok bitti mi (metin ve seçenek kalmadı)?</summary>
        public bool BlokBittiMi { get { return Hikaye != null && !Hikaye.canContinue && Hikaye.currentChoices.Count == 0; } }

        /// <summary>
        /// Bir sonraki satırı döndürür. Satır yoksa null döner; o zaman MevcutSecenekler'e bak
        /// ya da (rastgele modda) blok bittiyse otomatik olarak sıradaki bloğa geçilir.
        /// </summary>
        public string Ilerle()
        {
            if (Hikaye == null || BittiMi) return null;
            if (Hikaye.canContinue)
            {
                string satir = Hikaye.Continue().TrimEnd('\n');
                var etiketler = new List<string>(Hikaye.currentTags);
                MetinGeldi.Invoke(satir, etiketler);
                if (!Hikaye.canContinue) SonDurumuBildir();
                return satir;
            }
            if (BlokBittiMi && RastgeleMi && !BittiMi)
            {
                if (SiradakiBlok()) return Ilerle();
            }
            else if (BlokBittiMi && !RastgeleMi && !BittiMi)
            {
                BittiMi = true; HikayeBitti.Invoke();
            }
            return null;
        }

        /// <summary>Bir sonraki seçim noktasına kadar tüm metni birleştirip döndürür.</summary>
        public string TumunuIlerle()
        {
            var sb = new System.Text.StringBuilder();
            string s;
            while (DevamEdebilirMi && (s = Ilerle()) != null) sb.AppendLine(s);
            if (sb.Length == 0 && BlokBittiMi && RastgeleMi && !BittiMi && SiradakiBlok()) return TumunuIlerle();
            return sb.ToString().TrimEnd();
        }

        void SonDurumuBildir()
        {
            if (Hikaye.currentChoices.Count > 0) { SeceneklerGeldi.Invoke(MevcutSecenekler); return; }
            if (!Hikaye.canContinue)
            {
                if (RastgeleMi) BlokBitti.Invoke(AktifBlok);
                else if (!BittiMi) { BittiMi = true; HikayeBitti.Invoke(); }
            }
        }

        /// <summary>Şu anki seçenekler (ayar açıksa karışık sırada).</summary>
        public List<Choice> MevcutSecenekler
        {
            get
            {
                if (Hikaye == null) return new List<Choice>();
                var liste = Hikaye.currentChoices;
                if (!(RastgeleMi && Ayar.secenekleriKaristir)) return new List<Choice>(liste);
                int tur = Hikaye.state.currentTurnIndex;
                if (_karisikSecenekler == null || _karisikSecenekTuru != tur || _karisikSecenekler.Count != liste.Count)
                {
                    _karisikSecenekler = new List<Choice>(liste);
                    Karistir(_karisikSecenekler);
                    _karisikSecenekTuru = tur;
                }
                return new List<Choice>(_karisikSecenekler);
            }
        }

        /// <summary>MevcutSecenekler listesindeki sıraya göre seçim yapar.</summary>
        public void SecimYap(int listedekiSira)
        {
            var l = MevcutSecenekler;
            if (listedekiSira < 0 || listedekiSira >= l.Count) { Debug.LogWarning("[Enolink] Geçersiz seçim: " + listedekiSira); return; }
            SecimYap(l[listedekiSira]);
        }

        public void SecimYap(Choice secenek)
        {
            _karisikSecenekTuru = -1;
            Hikaye.ChooseChoiceIndex(secenek.index);
        }

        // ----- Değişkenler -----
        public object DegiskenAl(string ad) { return Hikaye != null ? Hikaye.variablesState[ad] : null; }
        public void DegiskenAyarla(string ad, object deger) { if (Hikaye != null) Hikaye.variablesState[ad] = deger; }
        public void DegiskenIzle(string ad, Story.VariableObserver izleyici) { if (Hikaye != null) Hikaye.ObserveVariable(ad, izleyici); }

        // ----- Kayıt -----
        [Serializable] class KayitVerisi { public string durum; public string[] torba; public string aktif; public string son; public int sayi; public bool bitti; }

        /// <summary>Oyunu kaydetmek için JSON döndürür (PlayerPrefs veya dosyaya yazabilirsin).</summary>
        public string KayitAl()
        {
            if (Hikaye == null) return null;
            var k = new KayitVerisi { durum = Hikaye.state.ToJson(), torba = _torba.ToArray(), aktif = AktifBlok, son = _sonBlok, sayi = GosterilenBlokSayisi, bitti = BittiMi };
            return JsonUtility.ToJson(k);
        }

        public void KayitYukle(string json)
        {
            if (Hikaye == null && !Yukle()) return;
            var k = JsonUtility.FromJson<KayitVerisi>(json);
            Hikaye.state.LoadJson(k.durum);
            _torba.Clear(); if (k.torba != null) _torba.AddRange(k.torba);
            AktifBlok = k.aktif; _sonBlok = k.son; GosterilenBlokSayisi = k.sayi; BittiMi = k.bitti; _karisikSecenekTuru = -1;
        }

        /// <summary>Rastgele modda kalan blok sayısı (tekrarYok açıkken).</summary>
        public int KalanBlokSayisi { get { return _torba.Count; } }
    }
}
