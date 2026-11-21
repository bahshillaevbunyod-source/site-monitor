# Разовая выкладка Worker в Cloudflare. Секреты берутся из .env.local и в консоль не печатаются.
$ErrorActionPreference = 'Stop'
$env:NODE_OPTIONS = '--use-system-ca'
Set-Location C:\site-monitor

Write-Host '1/3 deploy worker'
npx wrangler deploy

Write-Host '2/3 secrets (values are not printed)'
foreach ($name in 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID') {
  $line = Get-Content .env.local | Where-Object { $_ -like "$name=*" } | Select-Object -First 1
  $val = $line.Substring($name.Length + 1).Trim()
  if (-not $val) { throw "$name is empty in .env.local" }
  $val | npx wrangler secret put $name
}

Write-Host '3/3 seed state from state.json'
npx wrangler kv key put state --path state.json --namespace-id d8404a87523346db9b0a88b0b1eb2e75 --remote

Write-Host 'DONE'
