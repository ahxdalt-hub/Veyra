@echo off
REM =========================================================
REM VEYRA - Quick Setup Script (Windows Batch)
REM =========================================================
REM This script prepares your environment for deployment
REM Run this BEFORE running deploy-all.sh or manual deployment

echo.
echo =============================================
echo    VEYRA CLOUDFLARE SETUP - WINDOWS
echo =============================================
echo.

REM Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found: %NODE_VERSION%
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not available!
    pause
    exit /b 1
)
echo [OK] npm found

REM Check Git Bash availability
where bash >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Git Bash detected - you can run deploy-all.sh
) else (
    echo [INFO] Git Bash not found - use PowerShell commands instead
)

REM Verify .env.local exists
if not exist ".env.local" (
    echo.
    echo [WARNING] .env.local not found!
    echo Creating template...
    copy .env.example .env.local >nul 2>&1
    echo [OK] Template created at .env.local
    echo PLEASE EDIT .env.local and fill in your secrets before deploying!
    goto :setup_complete
)
echo [OK] Environment file found

REM Check for required secrets
set DODO_API_KEY=%DODO_PAYMENTS_API_KEY%
set SUPABASE_KEY=%SUPABASE_SERVICE_ROLE_KEY%

if "%DODO_API_KEY%"=="" (
    echo.
    echo [WARNING] DODO_PAYMENTS_API_KEY not set in environment
    echo Set it via: wrangler secret put DODO_PAYMENTS_API_KEY
) else (
    echo [OK] Dodo API key configured
)

if "%SUPABASE_KEY%"=="" (
    echo [WARNING] SUPABASE_SERVICE_ROLE_KEY not set in environment  
) else (
    echo [OK] Supabase service key configured
)

echo.
echo =============================================
echo SETUP COMPLETE!
echo =============================================
echo.
echo Next steps:
echo 1. Review and edit .env.local with your actual secrets
echo 2. Install Wrangler CLI if needed: npm install -g wrangler@latest
echo 3. Login to Cloudflare: wrangler login
echo 4. Deploy using: ./deploy-all.sh (Git Bash) OR follow README-DEPLOYMENT.md
echo.
pause

:setup_complete
