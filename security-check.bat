@echo off
REM ConstructLM Security Pre-Release Checklist
REM Run this script before publishing to GitHub

echo.
echo ============================================
echo   ConstructLM Security Pre-Release Check
echo ============================================
echo.

REM Check 1: Verify .env.local is in .gitignore
echo [1/6] Checking .gitignore...
findstr /C:".env.local" .gitignore >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] .env.local is in .gitignore
) else (
    echo   [WARNING] .env.local NOT in .gitignore!
)

REM Check 2: Verify .env.local is not tracked by git
echo.
echo [2/6] Checking if .env.local is tracked by git...
git ls-files --error-unmatch .env.local >nul 2>&1
if %errorlevel% equ 0 (
    echo   [CRITICAL] .env.local IS TRACKED BY GIT!
    echo   Run: git rm --cached .env.local
) else (
    echo   [OK] .env.local is not tracked by git
)

REM Check 3: Verify .env.local exists
echo.
echo [3/6] Checking .env.local for placeholder values...
if exist .env.local (
    findstr /C:"your_" .env.local >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [OK] .env.local contains placeholder values
    ) else (
        echo   [WARNING] .env.local may contain real API keys!
        echo   Please verify and replace with placeholders
    )
) else (
    echo   [INFO] .env.local not found (OK if using .env.example)
)

REM Check 4: Verify LICENSE file exists
echo.
echo [4/6] Checking for LICENSE file...
if exist LICENSE (
    echo   [OK] LICENSE file exists
) else (
    echo   [WARNING] LICENSE file missing!
)

REM Check 5: Verify .env.example exists
echo.
echo [5/6] Checking for .env.example...
if exist .env.example (
    echo   [OK] .env.example exists
) else (
    echo   [WARNING] .env.example missing (recommended)
)

REM Check 6: Check git status
echo.
echo [6/6] Checking git status...
git status --short .env.local >nul 2>&1
if %errorlevel% equ 0 (
    echo   [WARNING] .env.local appears in git status!
) else (
    echo   [OK] .env.local not in git status
)

REM Summary
echo.
echo ============================================
echo   SUMMARY - ACTION REQUIRED
echo ============================================
echo.
echo Before publishing to GitHub:
echo.
echo 1. [CRITICAL] Revoke any exposed API keys at provider websites
echo 2. [CRITICAL] Replace real API keys in .env.local with placeholders
echo 3. [CRITICAL] Verify .env.local is in .gitignore
echo 4. [CRITICAL] Run: git status (ensure .env.local not listed)
echo 5. [READY] Commit and push to GitHub
echo.
echo Revoke API keys at:
echo   - Google Gemini: https://makersuite.google.com/app/apikey
echo   - Groq: https://console.groq.com/
echo   - OpenAI: https://platform.openai.com/
echo.
echo ============================================
echo.
pause
