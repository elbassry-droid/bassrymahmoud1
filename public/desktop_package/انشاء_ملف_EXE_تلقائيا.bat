@echo off
chcp 65001 > nul
title تجميع ملف EXE للويندوز - د. محمود حمدي بصري
cls
echo ====================================================================
echo            أداة إنشاء وتجميع ملف EXE لبرنامج الصيدلية
echo ====================================================================
echo.
echo جاري البحث عن مترجم مايكروسوفت C# المدمج في الويندوز...

set "CSC_PATH="
if exist "%windir%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" set "CSC_PATH=%windir%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not defined CSC_PATH (
    if exist "%windir%\Microsoft.NET\Framework\v4.0.30319\csc.exe" set "CSC_PATH=%windir%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

if not defined CSC_PATH (
    echo [!] لم يتم العثور على csc.exe تلقائيا. سيتم تشغيل البرنامج كـ Desktop App عبر المتصفح.
    pause
    start "" "%~dp0تشغيل_البرنامج_كتطبيق_سطح_مكتب.bat"
    exit /b 1
)

echo [+] تم العثور على مترجم مايكروسوفت: %CSC_PATH%
echo [+] جاري بناء وتوليد ملف PharmacyPOS_App.exe ...

"%CSC_PATH%" /target:winexe /out:"%~dp0PharmacyPOS_App.exe" /win32icon:"%~dp0icon.ico" "%~dp0PharmacyPOS_Launcher.cs" >nul 2>&1
if not exist "%~dp0PharmacyPOS_App.exe" (
    "%CSC_PATH%" /target:winexe /out:"%~dp0PharmacyPOS_App.exe" "%~dp0PharmacyPOS_Launcher.cs"
)

if exist "%~dp0PharmacyPOS_App.exe" (
    echo.
    echo ====================================================================
    echo    [ تم بنجاح إنشاء ملف: PharmacyPOS_App.exe في نفس المجلد! ]
    echo ====================================================================
    echo.
    echo يمكنك الآن النقر المزدوج على PharmacyPOS_App.exe لتشغيل البرنامج مباشرة!
    echo.
    pause
) else (
    echo [x] حدث خطأ أثناء التجميع. يمكنك استخدام ملف تشغيل_البرنامج_كتطبيق_سطح_مكتب.bat مباشرة.
    pause
)
