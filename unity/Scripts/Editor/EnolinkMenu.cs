// Enolink! — Unity menüsü
using UnityEditor;
using UnityEngine;

namespace Enolink.Editor
{
    public static class EnolinkMenu
    {
        [MenuItem("Enolink!/Sahneye Hikâye Yöneticisi Ekle", false, 1)]
        static void YoneticiEkle()
        {
            var go = new GameObject("Ink Hikâye");
            var y = go.AddComponent<InkHikayeYoneticisi>();
            go.AddComponent<InkBasitArayuz>();
            var json = IlkHikaye();
            if (json != null) y.hikayeAdi = json;
            Undo.RegisterCreatedObjectUndo(go, "Ink Hikâye Yöneticisi Ekle");
            Selection.activeObject = go;
            Debug.Log("[Enolink] 'Ink Hikâye' nesnesi eklendi" + (json != null ? " (hikâye: " + json + ")" : "") + ". Play'e basarak deneyebilirsin.");
        }

        [MenuItem("Enolink!/Aktarılan Hikâyeleri Göster", false, 2)]
        static void Goster()
        {
            var yol = "Assets/Enolink/Resources/EnolinkHikayeler";
            var obj = AssetDatabase.LoadAssetAtPath<Object>(yol);
            if (obj != null) { EditorGUIUtility.PingObject(obj); Selection.activeObject = obj; }
            else EditorUtility.DisplayDialog("Enolink!", "Henüz aktarılmış hikâye yok. Enolink!'ten 'Unity'ye Aktar' de.", "Tamam");
        }

        static string IlkHikaye()
        {
            foreach (var guid in AssetDatabase.FindAssets("t:TextAsset", new[] { "Assets/Enolink/Resources/EnolinkHikayeler" }))
            {
                var p = AssetDatabase.GUIDToAssetPath(guid);
                var ad = System.IO.Path.GetFileNameWithoutExtension(p);
                if (!ad.EndsWith("_ayar")) return ad;
            }
            return null;
        }
    }
}
