$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root 'backend'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js не найден. Установите его с https://nodejs.org/'
}

Set-Location $Backend

if (-not (Test-Path 'node_modules')) {
  Write-Host 'Установка зависимостей...'
  npm install
}

Write-Host ''
Write-Host 'Запуск сервера: http://localhost:3000'
Write-Host 'Чтобы остановить, нажмите Ctrl+C'
Write-Host ''

Start-Process 'http://localhost:3000'
node server.js
