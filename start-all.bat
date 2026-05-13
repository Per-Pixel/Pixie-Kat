@echo off
REM ============================================================
REM  PixieKat - Start All Dev Servers
REM  Launches backend API, main website, and admin panel
REM  in three separate terminal windows.
REM ============================================================

setlocal
set "ROOT=%~dp0"

echo.
echo  ================================================
echo   Starting PixieKat development environment...
echo  ================================================
echo   [1/3] Backend API       - http://localhost:3001
echo   [2/3] Main Website      - http://localhost:5173
echo   [3/3] Admin Panel       - http://localhost:5174
echo  ================================================
echo.

REM Backend API server (main/server)
start "PixieKat :: Backend API"  cmd /k "cd /d "%ROOT%main\server" && npm run dev"

REM Small delay so the backend initializes first
timeout /t 2 /nobreak >nul

REM Main website (main)
start "PixieKat :: Main Website" cmd /k "cd /d "%ROOT%main" && npm run dev"

REM Admin panel (admin) - forced to port 5174 to match CORS
start "PixieKat :: Admin Panel"  cmd /k "cd /d "%ROOT%admin" && npm run dev -- --port 5174"

echo.
echo  All three servers launched in separate windows.
echo  Close each window individually to stop a service.
echo.

endlocal
