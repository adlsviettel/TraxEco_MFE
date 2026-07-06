@echo off
color 0A
echo ========================================================
echo          TRAXECO VITE BUILD AND DEPLOY SCRIPT
echo ========================================================
echo.
echo [1/2] BUILDING DIST VIA VITE...
echo Please wait, this might take around 60 seconds...
echo.

call npx vite build
if errorlevel 1 (
    color 0C
    echo.
    echo [ERROR] Vite build failed! Check the errors above.
    pause
    exit /b %errorlevel%
)
echo.
echo ========================================================
echo [2/2] COPYING TO TARGET SERVER 192.168.14.10
echo Source: .\dist\*
echo Target: \\192.168.14.10\C\Program Files\Ampps\www\trax-eco\
echo.

xcopy "dist\*" "\\192.168.14.10\C\Program Files\Ampps\www\trax-eco\" /S /E /Y /C /H

if errorlevel 1 (
    color 0C
    echo.
    echo [ERROR] Copy failed! Check network connection.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo                   ALL DONE SUCCESSFULLY!
echo ========================================================
timeout /t 5 >nul 2>&1 || ping -n 6 127.0.0.1 >nul
