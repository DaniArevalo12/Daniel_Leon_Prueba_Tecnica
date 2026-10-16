# Demo reproducible del Módulo 3 sobre Oracle Free (equivalente PowerShell de ejecutar-demo.sh).
#   .\ejecutar-demo.ps1
#   .\ejecutar-demo.ps1 -Orders 10000000 -Customers 500000
#   .\ejecutar-demo.ps1 -Mantener
param(
  [int]$Orders = 2000000,
  [int]$Customers = 100000,
  [switch]$Mantener
)
$ErrorActionPreference = 'Stop'
$aqui = $PSScriptRoot
$compose = Join-Path $aqui '..\..\02-api-polizas\backend\docker-compose.yml'
$salida = Join-Path $aqui 'resultados'
$conexion = 'demo_perf/Demo_Perf_2026@//localhost:1521/FREEPDB1'
New-Item -ItemType Directory -Force $salida | Out-Null

Write-Host '>> Levantando Oracle Free (servicio oracle del compose del backend)'
docker compose -f $compose up -d oracle
$cid = (docker compose -f $compose ps -q oracle).Trim()
while ((docker inspect -f '{{.State.Health.Status}}' $cid) -ne 'healthy') { Start-Sleep -Seconds 5 }
Write-Host '>> Oracle listo'

docker exec -u root $cid rm -rf /tmp/demo   # docker cp deja los archivos como root
docker cp (Join-Path $aqui 'sql') "${cid}:/tmp/demo"
function Invoke-SqlPlus { docker exec -i -e NLS_LANG=AMERICAN_AMERICA.AL32UTF8 $cid sqlplus -s @args }

& {
  "Demo Módulo 3 · $(Get-Date -Format 'yyyy-MM-dd HH:mm') · orders=$Orders customers=$Customers"
  Invoke-SqlPlus '/' 'as' 'sysdba' '@/tmp/demo/00-usuario.sql'
  Invoke-SqlPlus $conexion '@/tmp/demo/01-esquema-datos.sql' $Orders $Customers
  Invoke-SqlPlus $conexion '@/tmp/demo/02-medicion.sql'
  Invoke-SqlPlus $conexion '@/tmp/demo/03-experimentos.sql'
} 2>&1 | Tee-Object -FilePath (Join-Path $salida 'salida-completa.txt')

if (-not $Mantener) {
  Write-Host '>> Limpiando: se elimina el usuario demo_perf y se detiene el contenedor'
  "ALTER SESSION SET CONTAINER = FREEPDB1;`nDROP USER demo_perf CASCADE;`nEXIT" | docker exec -i $cid sqlplus -s / as sysdba
  docker compose -f $compose stop oracle
}
Write-Host ">> Resultados en $salida\salida-completa.txt"
