# API de Pólizas de Arrendamiento: Frontend

Interfaz web en Angular 21 para consultar, crear, renovar y cancelar pólizas de arrendamiento y sus riesgos. Consume la API del [backend](../backend/README.md).

Las decisiones de diseño y sus alternativas descartadas están en [DECISIONES.md](DECISIONES.md).

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 20.19+ o 22.12+ (LTS) |
| npm | 10+ |
| Backend | En ejecución (ver [backend/README.md](../backend/README.md)) |

## Ejecución en desarrollo

```bash
npm ci                                     # instala exactamente las versiones del lockfile
npm start                                  # http://localhost:4200, proxy /api → http://localhost:8080
BACKEND_URL=http://localhost:8081 npm start   # backend en otro puerto
```

En PowerShell: `$env:BACKEND_URL="http://localhost:8081"; npm start`.

El navegador siempre llama a `/api/...` (mismo origen). El *dev-server* reenvía esas llamadas al backend según [proxy.conf.js](proxy.conf.js), así que no depende de CORS ni hay puertos en el código. Para levantar el backend en el 8081: `SERVER_PORT=8081 ./mvnw spring-boot:run`.

> **Nota sobre `npm install`:** npm 10.9 tiene un bug que corta la instalación con `Cannot read properties of null (reading 'edgesOut')` al resolver el peer opcional `canvas` de `jsdom`. `npm ci` funciona normalmente porque parte del lockfile. Si necesita agregar dependencias, use npm 11 (`npx npm@11 install <paquete>`).

## Ejecución con Docker (frontend + backend)

Desde `02-api-polizas/`:

```bash
docker compose up --build
```

| Servicio | URL |
|---|---|
| Frontend (nginx) | http://localhost:4200 |
| Backend / Swagger | http://localhost:8080/swagger-ui.html |

Los puertos se cambian con `WEB_PORT` y `API_PORT`, p. ej. `WEB_PORT=4300 API_PORT=8082 docker compose up --build`. nginx sirve la SPA y reenvía `/api` al servicio `backend`. El backend usa H2 en memoria; para Oracle vea `backend/docker-compose.yml`.

## Variables y configuración

| Dónde | Variable | Por defecto | Uso |
|---|---|---|---|
| `proxy.conf.js` (desarrollo) | `BACKEND_URL` | `http://localhost:8080` | Destino del proxy `/api` |
| nginx (Docker) | `BACKEND_URL` | `http://backend:8080` | Destino del proxy `/api`, resuelto al iniciar el contenedor |
| `src/environments/environment.ts` | `apiUrl` | `/api` | Prefijo de todas las llamadas |
| `src/environments/environment.ts` | `apiKey` | `123456` | API key enviada en `x-api-key` |
| e2e | `E2E_BASE_URL` | `http://localhost:4200` | URL contra la que corre Playwright |

### Sobre la API key en el frontend

Todo lo que viaja en el bundle de JavaScript es **público**: cualquier usuario puede leer la API key con las herramientas del navegador. Aquí se acepta solo porque así lo exige la prueba técnica.

En producción:
- La autenticación sería **OAuth2 / OpenID Connect**: el usuario inicia sesión en un proveedor de identidad y el frontend envía un *access token* de corta duración (`Authorization: Bearer ...`).
- El **API Gateway** valida ese token antes de enrutar al backend.
- Si el backend aún exigiera una API key de servicio, la inyectaría el gateway o el proxy (nginx) del lado del servidor, nunca el navegador.

## Pruebas

```bash
npm test              # pruebas unitarias (Vitest, runner por defecto de Angular 21), una ejecución
npm run test:watch    # modo observador
npm run lint          # ESLint con angular-eslint, incluidas las reglas de accesibilidad de plantillas
npm run build         # build de producción (sin warnings)
```

Las **80 pruebas unitarias** cubren:
- **Servicios HTTP:** URLs, filtros, contrato de los cuerpos.
- **Interceptors:** API key solo hacia la propia API, `X-Correlation-Id`, traducción de ProblemDetail 400/401/404/409/422/5xx, sin conexión, cuerpos no-JSON.
- **Componentes con lógica:**
  - Formulario de creación: INDIVIDUAL con exactamente 1 riesgo, COLECTIVA con de 0 a n, prima estimada, validaciones y errores 400 del backend en cada campo.
  - Acciones del detalle según estado y tipo.
  - Diálogo de renovación: IPC y comparación anterior/nuevo.
  - Listado: filtros en la URL y estados de carga, vacío y error.
- **Componentes compartidos y pipes:** diálogo, toasts, badge, fechas sin desfase de zona horaria, moneda COP.

### Pruebas end-to-end (Playwright)

Recorren la aplicación real en Chromium contra el backend real. Requieren el backend y el frontend en ejecución (`npm start` + backend, o `docker compose up`):

```bash
npx playwright install chromium     # solo la primera vez
npm run e2e                         # contra http://localhost:4200
E2E_BASE_URL=http://localhost:4300 npm run e2e   # p. ej. contra el contenedor
```

Flujos cubiertos ([e2e/polizas.spec.ts](e2e/polizas.spec.ts)):

1. Listado con filtros desde la URL.
2. Crear póliza individual (exactamente un riesgo).
3. Crear póliza colectiva con varios riesgos.
4. Validación de formulario: muestra los errores sin llamar al backend.
5. Agregar un riesgo a una colectiva.
6. Cancelar un riesgo sin cambiar el estado de la póliza.
7. Renovar: IPC y comparación de los valores anteriores frente a los nuevos.
8. Cancelar una póliza (y todos sus riesgos).
9. Renovar una póliza cancelada: muestra el toast de error 409 con su código de seguimiento.
10. Póliza inexistente: muestra el estado "no encontrada".

Cada prueba que modifica datos crea sus propias pólizas, así que se puede ejecutar varias veces sin reiniciar el backend.

**Sobre el caso 9:** en la interfaz el botón Renovar está deshabilitado para pólizas canceladas. La prueba reproduce el caso real en que el 409 sí ocurre: el usuario tiene abierto el detalle de una póliza activa, otro usuario la cancela, y al pulsar Renovar el backend rechaza la operación. El toast muestra el mensaje del backend y el código de seguimiento, y la vista se recarga con el estado real.

## Estructura

```
src/app/
├── core/                        Singleton de la aplicación
│   ├── models/                  Contratos del backend (Poliza, Riesgo, ProblemDetail)
│   ├── http/                    Interceptors, ApiError, tokens de configuración
│   ├── services/                Clientes HTTP (pólizas, riesgos, parámetros)
│   └── layout/                  Shell (encabezado, navegación) y página 404
├── features/polizas/            Funcionalidad de pólizas (lazy loading)
│   ├── pages/                   Listado, detalle, creación
│   ├── components/              Filtros, tabla de riesgos, subformulario de riesgo, diálogo de renovación
│   └── polizas.routes.ts
├── shared/                      Reutilizable y sin dependencias de negocio
│   ├── components/              Badge, diálogo de confirmación, toast, spinner, estados vacío y error, errores de campo
│   ├── forms/                   Validadores de formato y mapeo de errores 400 del backend
│   ├── pipes/                   fechaLocal, moneda (COP)
│   ├── services/                ToastService
│   └── util/                    Carga<T> (estado cargando / listo / error)
└── testing/                     Datos de prueba compartidos por los specs
```
