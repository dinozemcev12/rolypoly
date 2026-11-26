@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ========================================
echo   RolyPoly - Запуск платформы
echo ========================================

if not exist "backend\.env" (
    echo [1/4] Создание backend\.env для локального запуска (SQLite)...
    (
        echo APP_NAME=RolyPoly
        echo APP_ENV=development
        echo DEBUG=true
        echo SECRET_KEY=dev-secret-key-change-in-production-32chars
        echo DATABASE_URL=sqlite:///./rolypoly_dev.db
        echo BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
    ) > "backend\.env"
)

if not exist "backend\.venv\Scripts\python.exe" (
    echo [2/4] Создание Python venv и установка зависимостей backend...
    python -m venv backend\.venv
    backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
) else (
    echo [2/4] Backend venv найден.
)

if not exist "frontend\node_modules" (
    echo [3/4] Установка зависимостей frontend...
    pushd frontend
    call npm install
    popd
) else (
    echo [3/4] Frontend node_modules найден.
)

echo [4/4] Запуск серверов...
start "RolyPoly Backend (8000)" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000"
start "RolyPoly Frontend (5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1 --port 5173"

timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo.
echo Готово!
echo   Frontend: http://127.0.0.1:5173
echo   Backend:  http://127.0.0.1:8000/api/v1/docs
echo.
echo Демо-аккаунты (пароль: secret123):
echo   gm_master (Ведущий), player1, player2
echo.
pause
