; Enolink! — Windows kurulum programı
Unicode true
!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "Enolink! — Türkçe İnk alternatifi"
OutFile "${CIKTI}"
InstallDir "$LOCALAPPDATA\Programs\Enolink"
InstallDirRegKey HKCU "Software\Enolink" "KurulumYolu"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "Enolink! ${SURUM}"

!define MUI_ICON "${IKON}"
!define MUI_UNICON "${IKON}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\Enolink.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Enolink!'i şimdi başlat"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Turkish"

VIProductVersion "${SURUM}.0"
VIAddVersionKey /LANG=${LANG_TURKISH} "ProductName" "Enolink!"
VIAddVersionKey /LANG=${LANG_TURKISH} "FileDescription" "Enolink! Kurulumu"
VIAddVersionKey /LANG=${LANG_TURKISH} "FileVersion" "${SURUM}"
VIAddVersionKey /LANG=${LANG_TURKISH} "LegalCopyright" "MIT"

Section "Kur"
  SetOutPath "$INSTDIR"
  File /r "${KAYNAK}\*.*"
  WriteUninstaller "$INSTDIR\Kaldir.exe"
  CreateDirectory "$SMPROGRAMS\Enolink!"
  CreateShortCut "$SMPROGRAMS\Enolink!\Enolink!.lnk" "$INSTDIR\Enolink.exe" "" "$INSTDIR\Enolink.ico"
  CreateShortCut "$SMPROGRAMS\Enolink!\Kaldır.lnk" "$INSTDIR\Kaldir.exe"
  CreateShortCut "$DESKTOP\Enolink!.lnk" "$INSTDIR\Enolink.exe" "" "$INSTDIR\Enolink.ico"
  ; .ink dosya ilişkilendirmesi (yalnızca bu kullanıcı)
  WriteRegStr HKCU "Software\Classes\.ink" "" "Enolink.ink"
  WriteRegStr HKCU "Software\Classes\Enolink.ink" "" "Ink hikâyesi"
  WriteRegStr HKCU "Software\Classes\Enolink.ink\DefaultIcon" "" "$INSTDIR\Enolink.ico"
  WriteRegStr HKCU "Software\Classes\Enolink.ink\shell\open\command" "" '"$INSTDIR\Enolink.exe" "%1"'
  WriteRegStr HKCU "Software\Enolink" "KurulumYolu" "$INSTDIR"
  !define UN "Software\Microsoft\Windows\CurrentVersion\Uninstall\Enolink"
  WriteRegStr HKCU "${UN}" "DisplayName" "Enolink!"
  WriteRegStr HKCU "${UN}" "DisplayVersion" "${SURUM}"
  WriteRegStr HKCU "${UN}" "Publisher" "Enoli"
  WriteRegStr HKCU "${UN}" "DisplayIcon" "$INSTDIR\Enolink.ico"
  WriteRegStr HKCU "${UN}" "UninstallString" '"$INSTDIR\Kaldir.exe"'
  WriteRegDWORD HKCU "${UN}" "NoModify" 1
  WriteRegDWORD HKCU "${UN}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${UN}" "EstimatedSize" $0
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
SectionEnd

Section "Uninstall"
  RMDir /r "$INSTDIR"
  Delete "$DESKTOP\Enolink!.lnk"
  RMDir /r "$SMPROGRAMS\Enolink!"
  DeleteRegKey HKCU "Software\Classes\Enolink.ink"
  ReadRegStr $0 HKCU "Software\Classes\.ink" ""
  StrCmp $0 "Enolink.ink" 0 +2
    DeleteRegKey HKCU "Software\Classes\.ink"
  DeleteRegKey HKCU "Software\Enolink"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Enolink"
SectionEnd
