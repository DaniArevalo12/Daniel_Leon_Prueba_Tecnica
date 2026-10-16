# Convenciones del proyecto: Prueba técnica Seguros Bolívar

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `01-diseno-sistema/` | Diseño de la solución |
| `02-api-polizas/backend/` | API REST de pólizas (Java 17, Spring Boot 3.5) |
| `02-api-polizas/frontend/` | Frontend Angular (consume el backend en `http://localhost:8080`) |
| `03-base-datos/` | Entregables de base de datos |
| `04-versionamiento/` | Estrategia de versionamiento |
| `05-liderazgo/` | Entregables de liderazgo |

## Reglas generales

- No inventar requisitos fuera del enunciado. Si una regla no está definida, preguntar o documentar el supuesto en `02-api-polizas/backend/DECISIONES.md` (sección "Supuestos").
- Priorizar claridad sobre complejidad: cada decisión debe poder explicarse en una entrevista.
- Idioma: código de dominio, mensajes, logs y documentación en **español** (`Poliza`, `renovar`, `RecursoNoEncontradoException`). Los términos técnicos estándar se dejan en inglés (`Controller`, `Repository`, `Service`, `Request`, `Response`).

## Diseño de sistema (`01-diseno-sistema`)

- `ARQUITECTURA.md` es el documento fuente; `ARQUITECTURA.pdf` se genera a partir de él, nunca se edita a mano.
- Diagramas en Mermaid (`diagramas/*.mmd`), exportados a `.svg` y `.png` con el tema común (`herramientas/mermaid-config.json`).
- En los diagramas de secuencia no usar `;` dentro de los textos (Mermaid lo toma como separador de sentencias).
- Regenerar todo: `cd 01-diseno-sistema/herramientas && npm ci && npm run todo` (requiere `npx playwright install chromium`).
- La tabla de trazabilidad (§8) debe reflejar el estado real del código del Módulo 2: no marcar nada como implementado si no lo está.

## Módulos 3, 4 y 5 (`03-base-datos`, `04-versionamiento`, `05-liderazgo`)

- Cada carpeta tiene `RESPUESTA.md` (fuente) y `RESPUESTA.pdf` (generado con `cd 01-diseno-sistema/herramientas && npm run respuestas`).
- Formato: enunciado resumido, respuesta corta de 2–3 líneas y luego el detalle.
- Solo se reportan resultados medidos de verdad. Las evidencias están junto al documento: `03-base-datos/demo/resultados/salida-completa.txt` y `04-versionamiento/salida-demo-*.txt`.
- Demo de Oracle: `03-base-datos/demo/ejecutar-demo.sh` (o `.ps1`). Usa el servicio `oracle` del compose del backend y al terminar elimina su usuario y detiene el contenedor.
- En SQL*Plus, un `PROMPT` que termina en guion continúa en la línea siguiente: no terminar líneas en `-`.
- Los `.ps1` se guardan en UTF-8 **con BOM** (Windows PowerShell 5.1 lee como ANSI los archivos sin BOM).

## Backend (`02-api-polizas/backend`)

### Stack

- Java 17, Spring Boot 3.5.x, Maven mediante el wrapper (`./mvnw`; no requiere Maven instalado).
- Spring Web, Data JPA, Bean Validation, Flyway, springdoc-openapi.
- H2 en `MODE=Oracle` por defecto; perfil `oracle` con `docker compose` (`gvenzl/oracle-free`).
- JUnit 5, Mockito, AssertJ, MockMvc, JaCoCo (mínimo 80 % de líneas; el build falla si baja).

### Arquitectura (hexagonal ligera)

- `domain/`: entidades con sus reglas de negocio (modelo rico), excepciones de negocio, eventos de dominio y puertos (`CorePort`). Sin dependencias de web ni de Spring, salvo anotaciones JPA.
- `application/`: casos de uso (`*Service`) que orquestan: cargar → invocar el dominio → `saveAndFlush` → notificar al CORE → publicar evento. Reciben *commands*, nunca DTOs web.
- `infrastructure/`: web (controllers, DTOs, mappers, errores), persistencia (Spring Data), adaptador del CORE, notificaciones, seguridad y configuración.
- Las reglas de negocio van en las entidades, no en los servicios ni en los controllers.

### Convenciones de código

- **Sin Lombok.** DTOs, commands, eventos y `@ConfigurationProperties` son `record`.
- **Mappers manuales**: clases `final` con métodos estáticos (`PolizaMapper.aResponse`).
- Inyección por constructor; nada de `@Autowired` en campos del código productivo.
- Dinero: `BigDecimal`, siempre redondeado con `Montos.redondear()` (escala 2, `HALF_EVEN`). Nunca `double`.
- Excepciones de negocio → HTTP: `RecursoNoEncontradoException` 404, `ConflictoEstadoException` 409 (conflicto con el estado actual), `ReglaNegocioException` 422 (la petición nunca sería válida).
- Toda acción que cambie el estado de pólizas o riesgos debe invocar `CorePort` con `EventoCore.actualizacion(OperacionCore.X, polizaId)`.
- Logs: solo identificadores (ids, número de póliza). **Nunca** nombres de personas, direcciones ni la API key.

### Base de datos

- El esquema lo gobierna **solo Flyway** (`ddl-auto: none`). Todo cambio es una nueva migración `V{n}__descripcion.sql`; nunca se edita una migración ya aplicada.
- El SQL debe funcionar en Oracle **y** en H2 en modo Oracle: `VARCHAR2`, `NUMBER`, `DATE`, `TIMESTAMP`, secuencias y `CONSTRAINT` con nombre.
- Los ids de los datos semilla son < 1000; las secuencias empiezan en 1000.

### Pruebas

- Nombres de prueba en español y descriptivos: `cancelarDosVecesEsUnConflicto`.
- Unitarias de dominio sin Spring; servicios con Mockito; endpoints con `@SpringBootTest` + MockMvc extendiendo `AbstractIntegrationTest` (limpia y migra la base antes de cada prueba y mockea `CorePort`).
- Las clases de prueba terminan en `Test` (las ejecuta Surefire).

### Comandos

```bash
cd 02-api-polizas/backend
./mvnw verify                 # compila, prueba y valida la cobertura
./mvnw spring-boot:run        # API en :8080 con H2
docker compose up --build     # API + Oracle
```

Swagger: `http://localhost:8080/swagger-ui.html` (API key `123456`).

## Frontend (`02-api-polizas/frontend`)

### Stack

- Angular 21: standalone, **zoneless**, signals, control flow `@if`/`@for`/`@switch` e inyección con `inject()`.
- Tailwind CSS v4 con tokens propios en `src/styles.css` (`primario-*` verde, `acento-*` amarillo). No usar logos ni marcas registradas.
- Formularios reactivos **tipados**. Vitest (runner por defecto) para pruebas unitarias, Playwright para e2e y ESLint (angular-eslint con reglas de accesibilidad).

### Arquitectura

- `core/`: modelos (copian exactamente los contratos del backend), servicios HTTP, interceptors y layout.
- `features/polizas/`: páginas y componentes del dominio, con lazy loading.
- `shared/`: componentes, pipes y utilidades genéricos, sin conocimiento del negocio.
- El backend es la fuente de verdad de las reglas de negocio. El frontend solo oculta o deshabilita acciones y valida **formato**.

### Convenciones de código

- Todos los componentes con `ChangeDetectionStrategy.OnPush`; el estado en `signal`/`computed`.
- Consultas modeladas como `Carga<T>` con `conEstadoDeCarga()`. Las vistas que muestran su propio error usan `sinToastDeError()`.
- Errores HTTP: siempre `ApiError` (lo produce el interceptor); nunca inspeccionar `HttpErrorResponse` en componentes.
- Fechas `LocalDate` con el pipe `fechaLocal`, nunca con `DatePipe`. Dinero con el pipe `moneda`.
- Accesibilidad obligatoria: `<label>` en cada campo, `aria-invalid`/`aria-describedby` en errores, diálogos con `<dialog>` nativo y nada comunicado solo con color.
- Botones y campos con las clases de `styles.css`: `btn btn-primario|btn-secundario|btn-peligro`, `campo`, `etiqueta`.
- El navegador siempre llama a `/api`. El proxy (`proxy.conf.js` o nginx) reenvía al backend y elimina el header `Origin`.

### Comandos

```bash
cd 02-api-polizas/frontend
npm ci                          # usar npm ci (npm install 10.9 tiene un bug con jsdom; ver README)
npm start                       # :4200, proxy → BACKEND_URL (por defecto http://localhost:8080)
npm test && npm run lint && npm run build   # verificación completa (sin warnings)
npm run e2e                     # requiere backend + frontend en ejecución
cd .. && docker compose up --build          # backend (H2) + frontend
```
