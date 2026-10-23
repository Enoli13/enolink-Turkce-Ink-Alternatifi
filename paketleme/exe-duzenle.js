// electron.exe'nin simgesini ve sürüm bilgilerini değiştirir (wine gerektirmez)
const fs = require('fs');
const ResEdit = require('resedit');
const [,, girdi, cikti, ikon, surum] = process.argv;
const exe = ResEdit.NtExecutable.from(fs.readFileSync(girdi), { ignoreCert: true });
const res = ResEdit.NtExecutableResource.from(exe);
const ikonDosyasi = ResEdit.Data.IconFile.from(fs.readFileSync(ikon));
const gruplar = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const grupId = gruplar.length ? gruplar[0].id : 1;
const dil = gruplar.length ? gruplar[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, grupId, dil, ikonDosyasi.icons.map((i) => i.data));
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
const [a, b, c] = surum.split('.').map(Number);
const lang = vi.getAllLanguagesForStringValues()[0] || { lang: 1033, codepage: 1200 };
vi.setStringValues(lang, {
  ProductName: 'Enolink!', FileDescription: 'Enolink! — Türkçe İnk alternatifi', CompanyName: 'Enoli',
  InternalName: 'Enolink', OriginalFilename: 'Enolink.exe',
  LegalCopyright: 'MIT — ink motoru © inkle Ltd.', FileVersion: surum, ProductVersion: surum,
});
vi.setFileVersion(a, b, c, 0, lang.lang); vi.setProductVersion(a, b, c, 0, lang.lang);
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
fs.writeFileSync(cikti, Buffer.from(exe.generate()));
console.log('exe hazır:', cikti, 'simge grubu', grupId);
