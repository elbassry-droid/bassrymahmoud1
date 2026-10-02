@echo off
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
