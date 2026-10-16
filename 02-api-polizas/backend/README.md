# API de Pólizas de Arrendamiento: Backend

API REST para gestionar pólizas de arrendamiento (individuales y colectivas) y sus riesgos: consulta, creación, renovación con IPC y cancelación. Toda operación que cambia el estado de una póliza o de un riesgo se notifica al sistema CORE.

Las decisiones de diseño y los supuestos tomados están en [DECISIONES.md](DECISIONES.md).

## Requisitos

| Herramienta | Versión | Notas |
|---|---|---|
| JDK | 17 | `JAVA_HOME` debe apuntar al JDK 17 |
| Maven | No hace falta | El proyecto incluye Maven Wrapper (`mvnw` / `mvnw.cmd`) |
| Docker Desktop | Reciente | Solo para el perfil Oracle y la imagen de la app |

## Ejecución

### Opción 1: H2 en memoria (por defecto, sin Docker)

```bash
./mvnw spring-boot:run          # Linux / macOS / Git Bash
mvnw.cmd spring-boot:run        # Windows (cmd / PowerShell)
```

- API: `http://localhost:8080`
- Para usar otro puerto: `./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8081`
- Consola H2: `http://localhost:8080/h2-console` (JDBC URL `jdbc:h2:mem:polizas`, usuario `sa`, sin contraseña)

H2 corre en `MODE=Oracle` y Flyway aplica **las mismas migraciones** que en Oracle. Los datos de prueba se recargan en cada arranque.

### Opción 1b: Backend + frontend con Docker (H2)

Desde la carpeta superior (`02-api-polizas/`), `docker compose up --build` levanta esta API y el frontend Angular. Ver [frontend/README.md](../frontend/README.md).

Para correr la API local en otro puerto no hace falta tocar archivos: `SERVER_PORT=8081 ./mvnw spring-boot:run`.

### Opción 2: Oracle con Docker Compose (API + base de datos)

```bash
docker compose up --build
```

- Levanta `gvenzl/oracle-free:23-slim` y la API con los perfiles `oracle,json` (logs en JSON).
- La API espera a que Oracle esté *healthy*. El primer arranque de Oracle tarda 1 a 2 minutos.
- Si el 8080 está ocupado: `API_PORT=8082 docker compose up --build`.
- Para detener: `docker compose down`. Agregue `-v` para borrar también los datos de Oracle.

### Opción 3: Oracle en Docker, API local

```bash
docker compose up -d oracle
./mvnw spring-boot:run -Dspring-boot.run.profiles=oracle
```

> Flyway muestra un aviso de que Oracle 23.26 es más reciente que su última versión probada. Es informativo: las migraciones se verificaron contra esa versión.

## Pruebas y cobertura

```bash
./mvnw verify
```

- Ejecuta 96 pruebas (unitarias de dominio y servicios, de repositorio y de integración con MockMvc).
- Genera el reporte JaCoCo en `target/site/jacoco/index.html`.
- **Falla el build** si la cobertura de líneas es menor al 80 %. Cobertura actual: ~99 % de líneas y ~91 % de ramas.

## Documentación interactiva (Swagger)

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

Para probar desde Swagger, pulse **Authorize** e ingrese la API key `123456`.

## Colección Postman

[postman/api-polizas.postman_collection.json](postman/api-polizas.postman_collection.json): 20 peticiones con aserciones, incluidos los casos de error. Tiene dos variables: `baseUrl` (por defecto `http://localhost:8080`) y `apiKey`. Está pensada para ejecutarse en orden sobre una base recién iniciada:

```bash
npx newman run postman/api-polizas.postman_collection.json
```

## Seguridad

Todas las rutas exigen el header `x-api-key: 123456`. Si falta o no coincide, la respuesta es **401** en JSON. Quedan excluidas Swagger (`/swagger-ui/**`, `/v3/api-docs/**`), la consola H2 y los *preflight* CORS (`OPTIONS`).

- El valor se configura en `seguridad.api-key`, o con la variable de entorno `API_KEY`.
- CORS está habilitado solo para `http://localhost:4200` (`seguridad.cors.origenes-permitidos`).

## Endpoints y ejemplos curl

```bash
BASE=http://localhost:8080
KEY="x-api-key: 123456"
```

| Método | Ruta | Descripción | Éxito |
|---|---|---|---|
| GET | `/polizas?tipo=&estado=` | Lista pólizas (filtros opcionales) | 200 |
| GET | `/polizas/{id}` | Consulta una póliza | 200 |
| POST | `/polizas` | Crea una póliza con sus riesgos | 201 |
| GET | `/polizas/{id}/riesgos` | Lista los riesgos de una póliza | 200 |
| POST | `/polizas/{id}/renovar` | Renueva aplicando el IPC | 200 |
| POST | `/polizas/{id}/cancelar` | Cancela la póliza y todos sus riesgos | 200 |
| POST | `/polizas/{id}/riesgos` | Agrega un riesgo (solo COLECTIVA) | 201 |
| POST | `/riesgos/{id}/cancelar` | Cancela un riesgo | 200 |
| GET | `/parametros/renovacion` | IPC vigente que se aplicará al renovar | 200 |
| POST | `/core-mock/evento` | Mock del CORE: registra el evento en logs | 202 |

**1. Listar pólizas, con filtros opcionales** (`tipo`: `INDIVIDUAL`/`COLECTIVA`; `estado`: `ACTIVA`/`RENOVADA`/`CANCELADA`)

```bash
curl -H "$KEY" "$BASE/polizas"
curl -H "$KEY" "$BASE/polizas?tipo=COLECTIVA&estado=ACTIVA"
```

**2. Consultar una póliza**

```bash
curl -H "$KEY" "$BASE/polizas/1"
```

**3. Crear una póliza**

Una INDIVIDUAL lleva exactamente un riesgo; una COLECTIVA admite cero o más.

```bash
curl -X POST -H "$KEY" -H "Content-Type: application/json" "$BASE/polizas" -d '{
  "tipo": "INDIVIDUAL",
  "tomador": "Inmobiliaria Andina S.A.S.",
  "fechaInicioVigencia": "2026-11-01",
  "mesesVigencia": 12,
  "valorCanon": 1800000.00,
  "riesgos": [{
    "direccionInmueble": "Calle 100 # 15-20 Apto 301, Bogotá",
    "arrendatario": "María Fernanda Ruiz",
    "arrendador": "Inmobiliaria Andina S.A.S."
  }]
}'
```

Responde `201` con el header `Location: /polizas/{id}`, `numero` generado (`POL-001000`) y `valorPrima = 1800000 × 12 = 21600000.00`.

**4. Riesgos de una póliza**

```bash
curl -H "$KEY" "$BASE/polizas/4/riesgos"
```

**5. Renovar una póliza**

```bash
curl -X POST -H "$KEY" "$BASE/polizas/1/renovar"
```

Con IPC 5,20 %: el canon pasa de 1.500.000 a 1.578.000 y la prima de 18.000.000 a 18.936.000. La vigencia 2026-01-01 → 2027-01-01 pasa a 2027-01-01 → 2028-01-01, y el estado queda `RENOVADA`.

**6. Cancelar una póliza (y todos sus riesgos)**

```bash
curl -X POST -H "$KEY" "$BASE/polizas/4/cancelar"
```

**7. Agregar un riesgo (solo pólizas COLECTIVA no canceladas)**

```bash
curl -X POST -H "$KEY" -H "Content-Type: application/json" "$BASE/polizas/7/riesgos" -d '{
  "direccionInmueble": "Carrera 7 # 72-10 Apto 1201, Bogotá",
  "arrendatario": "Julián Torres",
  "arrendador": "Arrendamientos Boyacá S.A.S."
}'
```

**8. Cancelar un riesgo**

```bash
curl -X POST -H "$KEY" "$BASE/riesgos/5/cancelar"
```

**9. Parámetros de renovación** (los usa el frontend para mostrar el IPC antes de confirmar)

```bash
curl -H "$KEY" "$BASE/parametros/renovacion"
# {"ipc":0.0520}
```

**10. Mock del CORE**

```bash
curl -X POST -H "$KEY" -H "Content-Type: application/json" "$BASE/core-mock/evento" \
  -d '{"evento":"ACTUALIZACION","polizaId":555}'
```

## Errores

Todas las respuestas de error siguen el formato [RFC 9457 – Problem Details](https://www.rfc-editor.org/rfc/rfc9457) (`application/problem+json`) e incluyen el `correlationId` para buscar la traza en los logs:

```json
{
  "type": "about:blank",
  "title": "Conflicto de estado",
  "status": 409,
  "detail": "La póliza POL-000004 ya está cancelada",
  "instance": "/polizas/4/cancelar",
  "timestamp": "2026-10-15T20:43:39.87-05:00",
  "correlationId": "3dd00aa1-b8bc-4541-a04b-c7a641d7b2e4"
}
```

| Código | Cuándo |
|---|---|
| 400 | Campos inválidos (con detalle por campo en `errores`), JSON mal formado o parámetros con tipo inválido |
| 401 | API key ausente o incorrecta |
| 404 | La póliza, el riesgo o la ruta no existe |
| 409 | Conflicto con el estado actual: cancelar algo ya cancelado, renovar una póliza cancelada, agregar riesgo a una póliza cancelada o modificación concurrente (bloqueo optimista) |
| 422 | Regla de negocio violada por la petición: agregar riesgo a una póliza INDIVIDUAL, o crear una INDIVIDUAL sin exactamente un riesgo |

Nunca se exponen stack traces ni mensajes internos. Los errores inesperados responden 500 con un mensaje genérico.

## Datos de prueba (Flyway `V2__datos_prueba.sql`)

| Id | Número | Tipo | Estado | Riesgos |
|---|---|---|---|---|
| 1 | POL-000001 | INDIVIDUAL | ACTIVA | 1 activo |
| 2 | POL-000002 | INDIVIDUAL | RENOVADA | 1 activo |
| 3 | POL-000003 | INDIVIDUAL | CANCELADA | 1 cancelado |
| 4 | POL-000004 | COLECTIVA | ACTIVA | 2 activos, 1 cancelado |
| 5 | POL-000005 | COLECTIVA | RENOVADA | 2 activos |
| 6 | POL-000006 | COLECTIVA | CANCELADA | 2 cancelados |
| 7 | POL-000007 | COLECTIVA | ACTIVA | Sin riesgos |
| 8 | POL-000008 | INDIVIDUAL | ACTIVA | 1 activo |

Los datos nuevos toman ids y números desde 1000.

## Configuración

| Propiedad | Por defecto | Descripción |
|---|---|---|
| `polizas.renovacion.ipc` | `0.0520` | IPC aplicado al canon al renovar (fracción: 0.0520 = 5,20 %) |
| `seguridad.api-key` | `${API_KEY:123456}` | API key exigida en `x-api-key` |
| `seguridad.cors.origenes-permitidos` | `http://localhost:4200` | Orígenes permitidos por CORS |
| `core.base-url` | `http://localhost:${server.port}` | URL base del CORE |
| `core.timeout-conexion` / `core.timeout-lectura` | `2s` / `3s` | Timeouts de la llamada al CORE |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Ver `application-oracle.yml` | Conexión del perfil `oracle` |

Perfiles: `oracle` (base Oracle) y `json` (logs estructurados en formato ECS).

Cualquier propiedad se puede sobrescribir con variables de entorno, por *relaxed binding* de Spring Boot. Por ejemplo, `SERVER_PORT=8081` o `SEGURIDAD_CORS_ORIGENESPERMITIDOS=https://polizas.ejemplo.com`. La imagen Docker fija `TZ=America/Bogota` para que las fechas de auditoría queden en hora de Colombia.

## Observabilidad

- Cada petición recibe un `correlationId`. Si el cliente envía `X-Correlation-Id`, se reutiliza; si no, se genera. Se devuelve en la respuesta, aparece en cada línea de log y se propaga al CORE.
- Formato de texto (por defecto): `... [cid=3dd00aa1-...] c.s.p.application.PolizaService : Póliza cancelada id=4 ...`
- Formato JSON (perfil `json`): un objeto ECS por línea, con `correlationId` como campo.
- Los logs registran solo identificadores. Nunca registran nombres de tomadores, arrendatarios ni la API key.

## Estructura

```
src/main/java/com/segurosbolivar/polizas/
├── domain/            Modelo y reglas de negocio (sin dependencias de infraestructura)
│   ├── model/         Poliza (raíz del agregado), Riesgo, enums, Montos
│   ├── exception/     Excepciones de negocio → 404 / 409 / 422
│   ├── event/         Eventos de dominio (creación, renovación)
│   └── port/          CorePort: puerto de salida hacia el CORE
├── application/       Casos de uso (PolizaService, RiesgoService) y commands
└── infrastructure/
    ├── persistence/   Repositorios Spring Data JPA
    ├── core/          Adaptador HTTP del CORE y mock /core-mock/evento
    ├── notificacion/  Simulación de correo / SMS (escucha eventos de dominio)
    ├── security/      Filtro de API key y CORS
    ├── web/           Controllers, DTOs, mappers y manejo global de errores
    └── config/        CorrelationId y OpenAPI
```
