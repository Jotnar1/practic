@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js не найден. Установите его с https://nodejs.org/
  pause
  exit /b 1
)

cd backend

if not exist node_modules (
  echo Установка зависимостей...
  call npm install
  if errorlevel 1 (
    echo Ошибка установки зависимостей.
    pause
    exit /b 1
  )
)

echo.
echo Запуск сервера: http://localhost:3000
echo Чтобы остановить, нажмите Ctrl+C
echo.

start "" "http://localhost:3000"
node server.js
