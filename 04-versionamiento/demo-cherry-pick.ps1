# Demo: incorporar SOLO un fix de seguridad de main en feature/new-login con git cherry-pick -x.
# Equivalente PowerShell de demo-cherry-pick.sh. Crea un repositorio temporal y lo borra al final.
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$dir = Join-Path ([System.IO.Path]::GetTempPath()) ("demo-cherry-pick-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory $dir | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false

function Titulo($texto) { Write-Host "`n=== $texto ===" }
function Verificar($condicion, $mensaje) {
  if ($condicion) { Write-Host "  [OK] $mensaje" } else { Write-Host "  [FALLA] $mensaje"; throw "Verificación fallida: $mensaje" }
}
function Escribir($archivo, $contenido) { [System.IO.File]::WriteAllText((Join-Path $dir $archivo), $contenido, $utf8) }
# Ejecuta git y detiene la demo si falla (los comandos nativos no lanzan excepciones en PowerShell 5.1)
function G { & git @args; if ($LASTEXITCODE -ne 0) { throw "git $args falló" } }

Push-Location $dir
try {
  G -c init.defaultBranch=main init -q .
  G config user.name 'Demo'
  G config user.email 'demo@example.com'
  G config core.autocrlf false

  Titulo '1. Estado inicial en main'
  Escribir 'auth.js' "function validarToken(token) {`n  return token !== undefined && token.firma === 'valida';`n}`nmodule.exports = { validarToken };`n"
  Escribir 'login.txt' "pantalla de login v1`n"
  G add .; G commit -qm 'feat: autenticación inicial'
  G log --oneline

  Titulo '2. Trabajo en feature/new-login'
  G switch -qc feature/new-login
  Escribir 'login.txt' "pantalla de login v2 (nuevo diseño)`n"
  G commit -qam 'feat(login): nuevo diseño de la pantalla de login'
  Escribir 'login.txt' "pantalla de login v2 (nuevo diseño)`nrecordar sesión`n"
  G commit -qam 'feat(login): opción recordar sesión'
  G log --oneline

  Titulo '3. Mientras tanto, main recibe tres commits (solo uno es el fix de seguridad)'
  G switch -q main
  Escribir 'reportes.js' "module.exports = { generarReporte: () => [] };`n"
  G add reportes.js; G commit -qm 'feat(reportes): módulo de reportes (NO debe llegar a la feature)'
  Escribir 'auth.js' "function validarToken(token) {`n  if (token === undefined || token.firma !== 'valida') return false;`n  // FIX de seguridad: se rechazan tokens expirados`n  return token.expira > Date.now();`n}`nmodule.exports = { validarToken };`n"
  G commit -qam 'fix(security): rechazar tokens expirados (CVE interno SEC-123)'
  Escribir 'package.json' "{ `"dependencias`": `"actualizadas`" }`n"
  G add package.json; G commit -qm 'chore: actualización de dependencias (NO debe llegar a la feature)'
  G log --oneline

  Titulo '4. Identificar el commit del fix en main (por mensaje)'
  $fix = (git log main --grep='fix(security)' --format='%H' -n 1).Trim()
  G show --stat --format='%h %s' $fix

  Titulo '5. Aplicar SOLO el fix en la feature: git cherry-pick -x'
  G switch -q feature/new-login
  G cherry-pick -x $fix
  G log --oneline --graph --all

  Titulo '6. Verificación'
  $auth = Get-Content auth.js -Raw -Encoding UTF8
  Verificar ($auth -match 'token\.expira > Date\.now\(\)') 'la feature tiene el fix de seguridad'
  Verificar (-not (Test-Path reportes.js)) 'la feature NO tiene reportes.js (cambio no relacionado de main)'
  Verificar (-not (Test-Path package.json)) 'la feature NO tiene package.json (cambio no relacionado de main)'
  Verificar ((Get-Content login.txt -Raw -Encoding UTF8) -match 'nuevo diseño') 'el trabajo propio de la feature se conserva'
  $mensaje = (git log -1 --format=%B) -join "`n"
  Verificar ($mensaje -match "cherry picked from commit $fix") 'trazabilidad: el mensaje referencia el commit original (-x)'

  Titulo '7. Más adelante: integrar la feature en main (¿se duplica el fix?)'
  Write-Host "git cherry main feature/new-login  ('-' = cambio equivalente ya presente en main):"
  G cherry -v main feature/new-login
  G switch -q main
  G merge -q --no-ff feature/new-login -m 'Merge feature/new-login'
  Write-Host '  [OK] merge sin conflictos: Git reconoce que el fix ya está aplicado'
  $ocurrencias = (Select-String -Path auth.js -Pattern 'token.expira > Date.now()' -SimpleMatch).Count
  Write-Host "Ocurrencias de la línea del fix en auth.js de main: $ocurrencias"
  G log --oneline --graph
}
finally {
  Pop-Location
  Remove-Item -Recurse -Force $dir
}
