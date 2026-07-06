@echo off
echo ===================================================
echo [1/2] Building TraxEco MFE Production Bundle...
echo ===================================================
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Build failed! Code was not deployed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo [2/2] Deploying assets to AMPPS Server...
echo ===================================================
python deploy.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Deploy copy failed! Check network connection.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo Trien khai hoan tat thanh cong!
echo ===================================================
pause
