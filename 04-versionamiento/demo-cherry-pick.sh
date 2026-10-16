#!/usr/bin/env bash
# Demo: incorporar SOLO un fix de seguridad de main en feature/new-login con git cherry-pick -x.
# Crea un repositorio temporal, simula el escenario, verifica el resultado con aserciones y lo borra al final.
set -euo pipefail

DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT
cd "$DIR"

titulo() { printf '\n=== %s ===\n' "$1"; }
ok()     { printf '  [OK] %s\n' "$1"; }
falla()  { printf '  [FALLA] %s\n' "$1"; exit 1; }

git -c init.defaultBranch=main init -q .
git config user.name "Demo"
git config user.email "demo@example.com"
git config core.autocrlf false

titulo "1. Estado inicial en main"
cat > auth.js <<'JS'
function validarToken(token) {
  return token !== undefined && token.firma === 'valida';
}
module.exports = { validarToken };
JS
echo "pantalla de login v1" > login.txt
git add . && git commit -qm "feat: autenticación inicial"
git log --oneline

titulo "2. Trabajo en feature/new-login"
git switch -qc feature/new-login
echo "pantalla de login v2 (nuevo diseño)" > login.txt
git commit -qam "feat(login): nuevo diseño de la pantalla de login"
echo "recordar sesión" >> login.txt
git commit -qam "feat(login): opción recordar sesión"
git log --oneline

titulo "3. Mientras tanto, main recibe tres commits (solo uno es el fix de seguridad)"
git switch -q main
echo "module.exports = { generarReporte: () => [] };" > reportes.js
git add reportes.js && git commit -qm "feat(reportes): módulo de reportes (NO debe llegar a la feature)"
cat > auth.js <<'JS'
function validarToken(token) {
  if (token === undefined || token.firma !== 'valida') return false;
  // FIX de seguridad: se rechazan tokens expirados
  return token.expira > Date.now();
}
module.exports = { validarToken };
JS
git commit -qam "fix(security): rechazar tokens expirados (CVE interno SEC-123)"
echo '{ "dependencias": "actualizadas" }' > package.json
git add package.json && git commit -qm "chore: actualización de dependencias (NO debe llegar a la feature)"
git log --oneline

titulo "4. Identificar el commit del fix en main (por mensaje)"
FIX=$(git log main --grep='fix(security)' --format='%H' -n 1)
git show --stat --format='%h %s' "$FIX"

titulo "5. Aplicar SOLO el fix en la feature: git cherry-pick -x"
git switch -q feature/new-login
git cherry-pick -x "$FIX"
git log --oneline --graph --all

titulo "6. Verificación"
grep -q 'token.expira > Date.now()' auth.js && ok "la feature tiene el fix de seguridad" || falla "falta el fix"
[ ! -f reportes.js ]   && ok "la feature NO tiene reportes.js (cambio no relacionado de main)" || falla "llegó reportes.js"
[ ! -f package.json ]  && ok "la feature NO tiene package.json (cambio no relacionado de main)" || falla "llegó package.json"
grep -q 'nuevo diseño' login.txt && ok "el trabajo propio de la feature se conserva" || falla "se perdió el trabajo de la feature"
git log -1 --format=%B | grep -q "cherry picked from commit $FIX" && ok "trazabilidad: el mensaje referencia el commit original (-x)" || falla "sin referencia -x"
echo
echo "Mensaje del commit en la feature:"
git log -1 --format='%B' | sed 's/^/    /'

titulo "7. Más adelante: integrar la feature en main (¿se duplica el fix?)"
echo "git cherry main feature/new-login  ('-' = cambio equivalente ya presente en main):"
git cherry -v main feature/new-login | sed 's/^/    /'
git switch -q main
git merge -q --no-ff feature/new-login -m "Merge feature/new-login" && ok "merge sin conflictos: Git reconoce que el fix ya está aplicado"
echo "Ocurrencias de la línea del fix en auth.js de main: $(grep -c 'token.expira > Date.now()' auth.js)"
git log --oneline --graph | sed 's/^/    /'
