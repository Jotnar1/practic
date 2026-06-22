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

$openBrowser = Start-Job {
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 300
    try {
      $null = Invoke-WebRequest -Uri 'http://localhost:3000/api/menu' -UseBasicParsing -TimeoutSec 2
      Start-Process 'http://localhost:3000'
      return
    } catch {
      continue
    }
  }
}

try {
  node server.js
} finally {
  Stop-Job $openBrowser -ErrorAction SilentlyContinue
  Remove-Job $openBrowser -Force -ErrorAction SilentlyContinue
}
