@echo off
echo ========================================
echo Building ConstructLM Electron App
echo ========================================
echo.

echo [1/3] Building Vite app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Vite build failed
    pause
    exit /b %errorlevel%
)
echo.

echo [2/3] Building Electron main process...
call npx vite build --config electron.vite.config.ts
if %errorlevel% neq 0 (
    echo ERROR: Electron build failed
    pause
    exit /b %errorlevel%
)
echo.

echo [3/3] Packaging with electron-builder...
call npx electron-builder
if %errorlevel% neq 0 (
    echo ERROR: Packaging failed
    pause
    exit /b %errorlevel%
)
echo.

echo ========================================
echo Build Complete!
echo Output: release folder
echo ========================================
pause
