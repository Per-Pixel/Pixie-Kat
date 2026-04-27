# PowerShell script to start both frontend and backend servers

Write-Host "Starting PixieKat Development Servers..." -ForegroundColor Green

# Start backend server in new window
Write-Host "`nStarting Backend Server (Port 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\server'; npm start"

# Wait a bit for backend to start
Start-Sleep -Seconds 2

# Start frontend server in new window
Write-Host "Starting Frontend Server (Port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev"

Write-Host "`n✓ Both servers are starting in separate windows" -ForegroundColor Green
Write-Host "  - Backend: http://localhost:3001" -ForegroundColor Yellow
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "`nPress any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
