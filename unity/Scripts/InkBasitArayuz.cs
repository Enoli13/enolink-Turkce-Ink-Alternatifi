// Enolink! — hazır, bağımlılıksız deneme arayüzü (IMGUI).
// InkHikayeYoneticisi ile aynı nesneye ekle ve Play'e bas. Kendi arayüzünü yazana kadar test için idealdir.
using System.Collections.Generic;
using UnityEngine;

namespace Enolink
{
    [AddComponentMenu("Enolink!/Ink Basit Arayüz (deneme)")]
    [RequireComponent(typeof(InkHikayeYoneticisi))]
    public class InkBasitArayuz : MonoBehaviour
    {
        public int yaziBoyutu = 20;
        public bool etiketleriGoster = true;
        [Range(0.3f, 1f)] public float genislikOrani = 0.6f;

        InkHikayeYoneticisi _y;
        readonly List<string> _satirlar = new List<string>();
        Vector2 _kaydirma;
        GUIStyle _metin, _dugme, _bilgi;

        void Awake()
        {
            _y = GetComponent<InkHikayeYoneticisi>();
            _y.MetinGeldi.AddListener((satir, etiketler) =>
            {
                if (string.IsNullOrWhiteSpace(satir) && etiketler.Count == 0) return;
                string ek = etiketleriGoster && etiketler.Count > 0 ? "  <color=#958392><size=" + (yaziBoyutu - 6) + ">#" + string.Join(" #", etiketler.ToArray()) + "</size></color>" : "";
                _satirlar.Add(satir + ek);
                _kaydirma.y = float.MaxValue;
            });
            _y.BlokBasladi.AddListener(ad => { if (_y.RastgeleMi) _satirlar.Add("<color=#a3a77a><size=" + (yaziBoyutu - 6) + ">— " + ad + " —</size></color>"); });
            _y.HikayeBitti.AddListener(() => _satirlar.Add("<color=#978e7d>— Son —</color>"));
        }

        void Update()
        {
            // Seçenek yoksa metni otomatik ilerlet
            if (_y.Hikaye != null && _y.DevamEdebilirMi) _y.TumunuIlerle();
        }

        void OnGUI()
        {
            if (_metin == null)
            {
                _metin = new GUIStyle(GUI.skin.label) { fontSize = yaziBoyutu, wordWrap = true, richText = true };
                _metin.normal.textColor = new Color(0.90f, 0.87f, 0.81f);
                _dugme = new GUIStyle(GUI.skin.button) { fontSize = yaziBoyutu - 2, alignment = TextAnchor.MiddleLeft, wordWrap = true, padding = new RectOffset(14, 14, 10, 10) };
                _bilgi = new GUIStyle(GUI.skin.label) { fontSize = yaziBoyutu - 6, richText = true };
            }
            float g = Screen.width * genislikOrani;
            var alan = new Rect((Screen.width - g) / 2f, 20, g, Screen.height - 40);
            GUILayout.BeginArea(alan);
            if (_y.Hikaye == null) { GUILayout.Label("Hikâye yüklenemedi — Console'a bak.", _metin); GUILayout.EndArea(); return; }

            _kaydirma = GUILayout.BeginScrollView(_kaydirma, GUILayout.ExpandHeight(true));
            foreach (var s in _satirlar) { GUILayout.Label(s, _metin); GUILayout.Space(6); }
            GUILayout.EndScrollView();
            GUILayout.Space(10);

            var secenekler = _y.MevcutSecenekler;
            if (secenekler.Count > 0)
            {
                for (int i = 0; i < secenekler.Count; i++)
                {
                    if (GUILayout.Button(secenekler[i].text, _dugme))
                    {
                        _satirlar.Add("<i><color=#b0714a>› " + secenekler[i].text + "</color></i>");
                        _y.SecimYap(i);
                        _kaydirma.y = float.MaxValue;
                    }
                }
            }
            else if (_y.BlokBittiMi && _y.RastgeleMi && !_y.BittiMi)
            {
                if (GUILayout.Button("Devam →", _dugme)) { _y.Ilerle(); _kaydirma.y = float.MaxValue; }
            }
            else if (_y.BittiMi)
            {
                if (GUILayout.Button("Baştan başla", _dugme)) { _satirlar.Clear(); _y.Baslat(); }
            }
            GUILayout.Label(_y.RastgeleMi ? "<color=#978e7d>Rastgele mod · gösterilen blok: " + _y.GosterilenBlokSayisi + " · kalan: " + _y.KalanBlokSayisi + "</color>" : "<color=#978e7d>Sıralı mod</color>", _bilgi);
            GUILayout.EndArea();
        }
    }
}
