#!/usr/bin/env bash
# Demo reproducible del Módulo 3 sobre Oracle Free (reutiliza el docker-compose del backend).
#   ./ejecutar-demo.sh                          → 2.000.000 orders / 100.000 customers
#   ORDERS=10000000 CUSTOMERS=500000 ./ejecutar-demo.sh   → escala del enunciado
#   MANTENER=1 ./ejecutar-demo.sh               → no borra los datos ni detiene el contenedor al final
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash en Windows: no traducir rutas como /tmp/demo

ORDERS="${ORDERS:-2000000}"
CUSTOMERS="${CUSTOMERS:-100000}"
# En Git Bash (Windows) se usa la ruta Windows (pwd -W) porque docker.exe no entiende /c/...
AQUI="$(cd "$(dirname "$0")" && (pwd -W 2>/dev/null || pwd))"
COMPOSE="$AQUI/../../02-api-polizas/backend/docker-compose.yml"
SALIDA="$AQUI/resultados"
CONEXION="demo_perf/Demo_Perf_2026@//localhost:1521/FREEPDB1"
mkdir -p "$SALIDA"

echo ">> Levantando Oracle Free (servicio 'oracle' del compose del backend)"
docker compose -f "$COMPOSE" up -d oracle
CID="$(docker compose -f "$COMPOSE" ps -q oracle)"
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$CID")" = "healthy" ]; do sleep 5; done
echo ">> Oracle listo"

docker exec -u root "$CID" rm -rf /tmp/demo   # docker cp deja los archivos como root
docker cp "$AQUI/sql" "$CID:/tmp/demo"
sqlplus() { docker exec -i -e NLS_LANG=AMERICAN_AMERICA.AL32UTF8 "$CID" sqlplus -s "$@"; }

{
  echo "Demo Módulo 3 · $(date '+%Y-%m-%d %H:%M') · orders=$ORDERS customers=$CUSTOMERS"
  docker exec "$CID" bash -c 'echo "Oracle: $(sqlplus -v)"'
  sqlplus / as sysdba @/tmp/demo/00-usuario.sql
  sqlplus "$CONEXION" @/tmp/demo/01-esquema-datos.sql "$ORDERS" "$CUSTOMERS"
  sqlplus "$CONEXION" @/tmp/demo/02-medicion.sql
  sqlplus "$CONEXION" @/tmp/demo/03-experimentos.sql
} 2>&1 | tee "$SALIDA/salida-completa.txt"

if [ "${MANTENER:-0}" != "1" ]; then
  echo ">> Limpiando: se elimina el usuario demo_perf y se detiene el contenedor"
  docker exec -i "$CID" sqlplus -s / as sysdba <<'SQL'
ALTER SESSION SET CONTAINER = FREEPDB1;
DROP USER demo_perf CASCADE;
EXIT
SQL
  docker compose -f "$COMPOSE" stop oracle
fi
echo ">> Resultados en $SALIDA/salida-completa.txt"
