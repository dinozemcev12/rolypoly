$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "=== RolyPoly: запуск одной командой ===" -ForegroundColor Cyan

if (-not (Test-Path "backend\.env")) {
    Write-Host "Создание backend\.env (SQLite)..."
    @"
APP_NAME=RolyPoly
APP_ENV=development
DEBUG=true
SECRET_KEY=dev-secret-key-change-in-production-32chars
DATABASE_URL=sqlite:///./rolypoly_dev.db
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
"@ | Out-File -FilePath "backend\.env" -Encoding utf8
}

if (-not (Test-Path "backend\.venv\Scripts\uvicorn.exe")) {
    Write-Host "Создание backend\.venv и установка зависимостей..."
    python -m venv backend\.venv
    & "backend\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Установка frontend зависимостей..."
    Push-Location frontend
    npm install
    Pop-Location
}

$backendProc = Start-Process -FilePath "$Root\backend\.venv\Scripts\uvicorn.exe" `
    -ArgumentList "app.main:app --host 127.0.0.1 --port 8000" `
    -WorkingDirectory "$Root\backend" -NoNewWindow -PassThru

$frontendProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev -- --host 127.0.0.1 --port 5173" `
    -WorkingDirectory "$Root\frontend" -NoNewWindow -PassThru

Write-Host ""
Write-Host "Frontend: http://127.0.0.1:5173" -ForegroundColor Green
Write-Host "Backend:  http://127.0.0.1:8000/api/v1/docs" -ForegroundColor Green
Write-Host "Демо-аккаунты (пароль: secret123): gm_master, player1, player2" -ForegroundColor Yellow
Write-Host "Нажмите Ctrl+C для остановки обоих серверов."

Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:5173"

try {
    Wait-Process -Id $backendProc.Id, $frontendProc.Id
} finally {
    if ($backendProc -and -not $backendProc.HasExited) { Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue }
    if ($frontendProc -and -not $frontendProc.HasExited) { Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue }
}
