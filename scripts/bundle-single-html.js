import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const distDir = path.resolve('dist');
const distSingleDir = path.resolve('dist_single');
const distSingleDashDir = path.resolve('dist-single');
const publicDir = path.resolve('public');
const publicDistSingleDir = path.resolve('public/dist_single');
const desktopPackageDir = path.resolve('public/desktop_package');

// Ensure all target output directories exist
[distDir, distSingleDir, distSingleDashDir, publicDir, publicDistSingleDir, desktopPackageDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const distHtmlPath = path.join(distDir, 'index.html');

if (fs.existsSync(distHtmlPath)) {
  let html = fs.readFileSync(distHtmlPath, 'utf-8');

  // Extract the inlined JavaScript from <script>
  const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

  if (scriptMatch) {
    const jsContent = scriptMatch[1];

    // Remove the script tag from <head> to prevent execution before <div id="root"> exists
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Ensure <div id="root"> exists
    if (!html.includes('<div id="root">')) {
      html = html.replace('<body>', '<body>\n    <div id="root"></div>');
    }

    // Place the script right before </body> so <div id="root"></div> is already in DOM
    html = html.replace(
      '</body>',
      () => `<script>\n${jsContent}\n</script>\n</body>`
    );
  }

  // Write single standalone HTML to all distribution directories
  const targetFiles = [
    path.join(distSingleDir, 'index.html'),
    path.join(distSingleDir, 'pos_offline_singlefile.html'),
    path.join(distSingleDashDir, 'index.html'),
    path.join(distSingleDashDir, 'pos_offline_singlefile.html'),
    path.join(publicDistSingleDir, 'index.html'),
    path.join(publicDir, 'pos_offline_singlefile.html'),
    path.join(distDir, 'pos_offline_singlefile.html'),
    path.join(distDir, 'نظام_الكاشير_والمخازن_محمود_حمدي_بصري.html'),
    path.join(publicDir, 'نظام_الكاشير_والمخازن_محمود_حمدي_بصري.html'),
    path.join(distSingleDir, 'نظام_الكاشير_والمخازن_محمود_حمدي_بصري.html'),
    path.join(desktopPackageDir, 'نظام_الكاشير_والمخازن_محمود_حمدي_بصري.html'),
    path.join(desktopPackageDir, 'index.html'),
  ];

  for (const targetPath of targetFiles) {
    fs.writeFileSync(targetPath, html, 'utf-8');
  }

  // 1. Create Windows Batch Native App Launcher (.BAT)
  const batchLauncherContent = `@echo off
chcp 65001 > nul
title نظام إدارة الصيدليات ونقاط البيع - د. محمود حمدي بصري
cls
echo ====================================================================
echo        نظام كاشير وإدارة الصيدليات - د. محمود حمدي بصري
echo                    تطبيق سطح المكتب للكمبيوتر
echo ====================================================================
echo.
echo جاري تشغيل البرنامج في نافذة سطح مكتب مستقلة...
echo.

set "HTML_FILE=%~dp0نظام_الكاشير_والمخازن_محمود_حمدي_بصري.html"
if not exist "%HTML_FILE%" set "HTML_FILE=%~dp0index.html"

:: 1. Try Microsoft Edge in dedicated standalone App Mode
where msedge >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start "" msedge --app="%HTML_FILE%" --window-size=1366,768 --start-maximized
    exit /b 0
)

:: 2. Try Google Chrome in dedicated App Mode
where chrome >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start "" chrome --app="%HTML_FILE%" --window-size=1366,768 --start-maximized
    exit /b 0
)

:: 3. Try standard Windows default browser
start "" "%HTML_FILE%"
exit /b 0
`;

  fs.writeFileSync(
    path.join(desktopPackageDir, 'تشغيل_البرنامج_كتطبيق_سطح_مكتب.bat'),
    batchLauncherContent,
    'utf-8'
  );
  fs.writeFileSync(
    path.join(publicDir, 'تشغيل_البرنامج_كتطبيق_سطح_مكتب.bat'),
    batchLauncherContent,
    'utf-8'
  );

  // 2. Create 1-Click Native C# Windows EXE Compiler Script
  const exeCompilerScript = `@echo off
chcp 65001 > nul
title تجميع ملف EXE للويندوز - د. محمود حمدي بصري
cls
echo ====================================================================
echo            أداة إنشاء وتجميع ملف EXE لبرنامج الصيدلية
echo ====================================================================
echo.
echo جاري البحث عن مترجم مايكروسوفت C# المدمج في الويندوز...

set "CSC_PATH="
if exist "%windir%\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe" set "CSC_PATH=%windir%\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe"
if not defined CSC_PATH (
    if exist "%windir%\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe" set "CSC_PATH=%windir%\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe"
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
`;

  fs.writeFileSync(
    path.join(desktopPackageDir, 'انشاء_ملف_EXE_تلقائيا.bat'),
    exeCompilerScript,
    'utf-8'
  );

  // 3. Create C# Source Launcher file
  const csharpSource = `using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace PharmacyPOS
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                string dir = AppDomain.CurrentDomain.BaseDirectory;
                string htmlFile = Path.Combine(dir, "نظام_الكاشير_والمخازن_محمود_حمدي_بصري.html");
                if (!File.Exists(htmlFile))
                {
                    htmlFile = Path.Combine(dir, "index.html");
                }

                // 1. Try launching Edge in dedicated App Mode
                ProcessStartInfo psiEdge = new ProcessStartInfo
                {
                    FileName = "msedge.exe",
                    Arguments = "--app=\\"" + htmlFile + "\\" --window-size=1366,768 --start-maximized",
                    UseShellExecute = true
                };

                try
                {
                    Process.Start(psiEdge);
                    return;
                }
                catch { }

                // 2. Try launching Chrome in dedicated App Mode
                ProcessStartInfo psiChrome = new ProcessStartInfo
                {
                    FileName = "chrome.exe",
                    Arguments = "--app=\\"" + htmlFile + "\\" --window-size=1366,768 --start-maximized",
                    UseShellExecute = true
                };

                try
                {
                    Process.Start(psiChrome);
                    return;
                }
                catch { }

                // 3. Fallback to default browser
                Process.Start(htmlFile);
            }
            catch (Exception ex)
            {
                MessageBox.Show("خطأ أثناء تشغيل البرنامج: " + ex.Message, "نظام كاشير الصيدلية", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
`;

  fs.writeFileSync(
    path.join(desktopPackageDir, 'PharmacyPOS_Launcher.cs'),
    csharpSource,
    'utf-8'
  );

  // 4. Create Readme file in package
  const readmeContent = `====================================================================
نظام إدارة الصيدليات والمخازن ونقاط البيع - د. محمود حمدي بصري
====================================================================

📁 محتويات هذا المجلد:
1. "تشغيل_البرنامج_كتطبيق_سطح_مكتب.bat" :
   - انقر عليه مرتين لتشغيل البرنامج كنافذة سطح مكتب مستقلة (App Mode) مثل أي برنامج EXE بدون شريط متصفح.

2. "انشاء_ملف_EXE_تلقائيا.bat" :
   - انقر عليه مرتين لإنشاء وتوليد ملف "PharmacyPOS_App.exe" مباشرة على جهازك في ثانية واحدة!

3. "نظام_الكاشير_والمخازن_محمود_حمدي_بصري.html" :
   - ملف البرنامج الكامل والمستقل الذي يحتوي على قاعدة البيانات وDrugEye ونقاط البيع.

لأي استفسار أو دعم فني:
د. محمود حمدي بصري - هاتف: 01027568272
`;

  fs.writeFileSync(
    path.join(desktopPackageDir, 'تعليمات_التشغيل.txt'),
    readmeContent,
    'utf-8'
  );

  // 5. Build ZIP Package using Python
  try {
    execSync('python3 scripts/make-zip.py', { stdio: 'inherit' });
    console.log('📦 Created PharmacyPOS_Windows_Desktop_EXE.zip successfully!');
  } catch (e) {
    console.error('Failed to create ZIP package:', e);
  }

  console.log(
    '✅ Standalone Single-file HTML & Desktop Windows package successfully generated!'
  );
} else {
  console.warn('⚠️ dist/index.html not found to bundle.');
}
