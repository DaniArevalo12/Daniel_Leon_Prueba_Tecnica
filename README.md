# Prueba técnica: Desarrollador Full Stack · Seguros Bolívar (proceso 9834)

**Daniel Fernando León Arévalo** · danielarevalodev2005@gmail.com · [github.com/DaniArevalo12](https://github.com/DaniArevalo12)

Plataforma de gestión de pólizas de arrendamiento: diseño de arquitectura, API REST (Spring Boot), frontend (Angular), optimización de base de datos (Oracle), versionamiento (Git) y liderazgo técnico.

---

## Empieza aquí: todo en 5 minutos

Requisito: Docker Desktop.

```bash
cd 02-api-polizas
docker compose up --build
```

| Qué | Dónde |
|---|---|
| Frontend | http://localhost:4200 |
| API (Swagger UI) | http://localhost:8080/swagger-ui.html; pulse **Authorize** e ingrese la API key |
| API key de prueba | `123456` (header `x-api-key`) |
| Datos de prueba | 8 pólizas individuales y colectivas en distintos estados (cargadas por Flyway) |

Si los puertos están ocupados: `WEB_PORT=4300 API_PORT=8082 docker compose up --build`. Para detener: `docker compose down`.

## Entregable

Los cinco módulos en un documento único: **[Daniel_Leon_Prueba_Tecnica.pdf](Daniel_Leon_Prueba_Tecnica.pdf)**. El código del Módulo 2 está en [github.com/DaniArevalo12/Daniel_Leon_Prueba_Tecnica](https://github.com/DaniArevalo12/Daniel_Leon_Prueba_Tecnica) (se regenera con `cd 01-diseno-sistema/herramientas && npm run entregable`).

## Índice de módulos

| Módulo | Carpeta | Documento principal | Lo más destacado |
|---|---|---|---|
| 1. Diseño de sistema | [`01-diseno-sistema/`](01-diseno-sistema/) | [ARQUITECTURA.md](01-diseno-sistema/ARQUITECTURA.md) · [PDF](01-diseno-sistema/ARQUITECTURA.pdf) | C4, 3 patrones con alternativa descartada, ER, 3 flujos de secuencia (incluido el fallo del CORE: técnico frente a rechazo de negocio) y una tabla de trazabilidad diseño ↔ código |
| 2. API de pólizas | [`02-api-polizas/`](02-api-polizas/) | [README.md](02-api-polizas/README.md) · [PDF](02-api-polizas/README.pdf) | 96 pruebas de backend (cobertura 99,8 % en líneas), 80 unitarias y 10 e2e en frontend; Docker de un comando. Detalle en [backend](02-api-polizas/backend/README.md) y [frontend](02-api-polizas/frontend/README.md) |
| 3. Base de datos | [`03-base-datos/`](03-base-datos/) | [RESPUESTA.md](03-base-datos/RESPUESTA.md) · [PDF](03-base-datos/RESPUESTA.pdf) | Demo reproducible en Oracle con planes y tiempos **reales**: de 226 ms a < 1 ms con *keyset*, y *nested loops* frente a *hash join* según la selectividad |
| 4. Versionamiento | [`04-versionamiento/`](04-versionamiento/) | [RESPUESTA.md](04-versionamiento/RESPUESTA.md) · [PDF](04-versionamiento/RESPUESTA.pdf) | `git cherry-pick -x` con demo ejecutable (bash y PowerShell) que verifica con aserciones el resultado |
| 5. Liderazgo técnico | [`05-liderazgo/`](05-liderazgo/) | [RESPUESTA.md](05-liderazgo/RESPUESTA.md) · [PDF](05-liderazgo/RESPUESTA.pdf) | Plan de 2 semanas por bloques, organización en dos frentes, métricas DORA de equipo y prácticas obligatorias |

Las decisiones técnicas, con su alternativa descartada, están en [backend/DECISIONES.md](02-api-polizas/backend/DECISIONES.md) y [frontend/DECISIONES.md](02-api-polizas/frontend/DECISIONES.md).

## Matriz de cumplimiento

Abreviaturas de rutas: `be` = `02-api-polizas/backend/src/main/java/com/segurosbolivar/polizas`, `fe` = `02-api-polizas/frontend/src/app`.

### Módulo 1: Diseño de sistema

| Requisito | Dónde se cumple | Más allá de lo pedido |
|---|---|---|
| Arquitectura de alto nivel | ARQUITECTURA.md §2 (diagramas C4 de contexto y contenedores) | Diagrama de despliegue multi-zona (§7) |
| 3 patrones justificados | §3: microservicios + API Gateway, hexagonal + ACL, event-driven + outbox | CQRS evaluado y diferido; alternativa de un solo servicio |
| Modelo de datos | §4 (ER con cardinalidades y reglas) | `estado_sync_core`, base de datos por servicio |
| Escalabilidad, logs, tolerancia a fallos y versionamiento de APIs | §6 | SLOs, OWASP API Top 10 (Anexo B), equivalencias AWS/Azure (Anexo C) |
| Diagrama con Pólizas, Riesgos, Notificaciones, Adapter CORE, BD y Gateway | §2.2 · `diagramas/02-contenedores.*` | Fuentes Mermaid y exportados SVG/PNG reproducibles (`herramientas/`) |
| Disponibilidad 24/7 | §7 (SLA objetivo, RPO/RTO propuestos) | Tabla §8: qué está implementado y qué es propuesta |

### Módulo 2: API de pólizas (backend)

| Requisito | Dónde se cumple | Más allá de lo pedido |
|---|---|---|
| `GET /polizas?tipo=&estado=` | `be/infrastructure/web/controller/PolizaController.java` | Valores de filtro inválidos → 400 con los permitidos |
| `GET /polizas/{id}/riesgos` | `PolizaController.java` | — |
| `POST /polizas/{id}/renovar` (canon × (1 + IPC), prima, nueva vigencia, RENOVADA) | `be/domain/model/Poliza.java#renovar` · IPC en `application.yml` | `GET /parametros/renovacion` para mostrar el IPC en el frontend |
| `POST /polizas/{id}/cancelar` (cancela la póliza y todos sus riesgos) | `Poliza.java#cancelar` | — |
| `POST /polizas/{id}/riesgos` (solo COLECTIVA) | `Poliza.java#agregarRiesgo` | 422 para INDIVIDUAL, 409 si está cancelada |
| `POST /riesgos/{id}/cancelar` | `be/infrastructure/web/controller/RiesgoController.java` | — |
| `POST /core-mock/evento` (`{"evento":"ACTUALIZACION","polizaId":555}`) registra en logs | `be/infrastructure/core/CoreMockController.java` | Campo `operacion` con la operación concreta |
| Toda modificación de estado invoca el CORE | `be/application/PolizaService.java`, `RiesgoService.java` → `CorePort` → `CoreHttpAdapter` | Timeouts configurables; un fallo se registra y no revierte (ver DECISIONES) |
| Individual: exactamente 1 riesgo | `Poliza.java#crear` | — |
| No renovar canceladas; cancelar algo ya cancelado → 409 | `Poliza.java`, `Riesgo.java` · `GlobalExceptionHandler.java` | Bloqueo optimista (`@Version`) → 409 |
| Prima = canon × meses, con `BigDecimal` | `Poliza.java` · `be/domain/model/Montos.java` | Redondeo `HALF_EVEN` justificado |
| Eventos de creación y renovación → notificaciones | `be/domain/event/*` · `be/infrastructure/notificacion/NotificacionService.java` | Se notifica solo tras el commit (`AFTER_COMMIT`) |
| Header `x-api-key` → 401 en JSON; Swagger y H2 excluidos | `be/infrastructure/security/ApiKeyFilter.java` | Comparación en tiempo constante; la key nunca se registra en logs |
| Swagger con el esquema de API key | `be/infrastructure/config/OpenApiConfig.java` | — |
| CORS para `localhost:4200` | `be/infrastructure/security/SeguridadConfig.java` | CORS como filtro, para que los 401 también lleven cabeceras CORS |
| ProblemDetail (400, 401, 404, 409, 422) | `be/infrastructure/web/error/GlobalExceptionHandler.java` | Errores por campo y `correlationId` en cada respuesta |
| Logs estructurados con `correlationId` (MDC) | `be/infrastructure/config/CorrelationIdFilter.java` · perfil `json` (ECS) | El id se propaga al CORE y se ve en el frontend |
| Flyway con datos de prueba; H2 en modo Oracle y perfil `oracle` | `backend/src/main/resources/db/migration/` | Mismas migraciones verificadas en Oracle 23.26 |
| Tests unitarios y de integración, cobertura ≥ 80 % | `backend/src/test/` · JaCoCo en `pom.xml` | 96 pruebas, 99,8 % de líneas; el build falla si baja del 80 % |
| Dockerfile multi-stage y docker-compose | `backend/Dockerfile` · `backend/docker-compose.yml` (Oracle) | Usuario sin privilegios y `TZ=America/Bogota` |
| Colección de Postman | `backend/postman/api-polizas.postman_collection.json` | 20 peticiones con aserciones, verificada con newman |
| README y DECISIONES | `backend/README.md` · `backend/DECISIONES.md` | Supuestos documentados |
| Endpoints extra para el frontend (`GET /polizas/{id}`, `POST /polizas`) | `PolizaController.java` | — |

### Módulo 2: frontend

| Requisito | Dónde se cumple | Más allá de lo pedido |
|---|---|---|
| Listado con filtros y badges de estado | `fe/features/polizas/pages/poliza-list/` | Filtros en la URL (se pueden compartir) |
| Detalle con datos, vigencia, canon, prima y riesgos | `fe/features/polizas/pages/poliza-detail/` | Pipe de fechas sin desfase de zona horaria |
| Crear INDIVIDUAL (1 riesgo) y COLECTIVA (FormArray, 0..n) | `fe/features/polizas/pages/poliza-create/` | Prima estimada; errores 400 del backend en cada campo |
| Renovar: IPC aplicado y anterior frente a nuevo; deshabilitado si está cancelada | `fe/features/polizas/components/renovacion-dialog/` | Recarga el estado real ante un 409 |
| Cancelar póliza y riesgo con confirmación; agregar riesgo solo en COLECTIVA no cancelada | `poliza-detail.ts` · `fe/shared/components/confirm-dialog/` | `<dialog>` nativo accesible |
| Interceptors: API key, errores ProblemDetail → toast, `X-Correlation-Id` | `fe/core/http/interceptors.ts` · `api-error.ts` | La API key nunca se envía a dominios externos |
| Proxy de desarrollo configurable (8080 por defecto) | `02-api-polizas/frontend/proxy.conf.js` | Elimina el header `Origin` (ver DECISIONES §3.4) |
| Moneda COP y fechas es-CO | `fe/app.config.ts` · `fe/shared/pipes/` | — |
| Estados de carga, vacío y error; diseño responsive y accesible | `fe/shared/components/` | Reglas ESLint de accesibilidad y contraste AA verificado |
| Pruebas | `*.spec.ts` (80) · `frontend/e2e/` (Playwright, 10) | Los e2e encontraron 3 defectos reales, ya corregidos |
| Dockerfile multi-stage con nginx y compose de backend + frontend | `frontend/Dockerfile` · `02-api-polizas/docker-compose.yml` | Cabeceras de seguridad en nginx |
| README y DECISIONES | `frontend/README.md` · `frontend/DECISIONES.md` | Recorridos e2e sobre la aplicación real (Playwright) |

### Módulos 3, 4 y 5

| Requisito | Dónde se cumple | Más allá de lo pedido |
|---|---|---|
| M3: al menos 3 estrategias de optimización | `03-base-datos/RESPUESTA.md` §2 (5 estrategias) y tabla de prioridad | Demo en Oracle con resultados reales (`demo/`) |
| M4: comando o estrategia para traer solo el fix | `04-versionamiento/RESPUESTA.md` (`git cherry-pick -x`) | Casos especiales, alternativas descartadas y demo con aserciones |
| M5: 5 prioridades, organización, métricas, prácticas y presión del negocio | `05-liderazgo/RESPUESTA.md` §1–5 | Evidencia de esas prácticas aplicada en esta prueba (§6) |

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Java 17, Spring Boot 3.5, Spring Data JPA, Bean Validation, Flyway, springdoc-openapi, JUnit 5, Mockito, JaCoCo |
| Base de datos | H2 en modo Oracle (por defecto) · Oracle Database Free 23 (perfil `oracle`) |
| Frontend | Angular 21 (standalone, signals, zoneless), Tailwind CSS 4, Vitest, Playwright, ESLint |
| Infraestructura | Docker, Docker Compose, nginx |
| Documentación | Markdown, Mermaid (diagramas), PDF generado con Playwright |

## Requisitos para ejecutar

| Para | Necesita |
|---|---|
| Ver todo con Docker | Docker Desktop |
| Backend local | JDK 17 (Maven no hace falta: se usa `./mvnw`, o `mvnw.cmd` en Windows) |
| Frontend local | Node.js 20.19+ o 22.12+ y npm 10+ |
| Demo de Oracle (Módulo 3) | Docker Desktop |
| Regenerar diagramas y PDF | Node.js (`cd 01-diseno-sistema/herramientas && npm ci && npm run todo`) |

Instrucciones detalladas: [backend](02-api-polizas/backend/README.md) · [frontend](02-api-polizas/frontend/README.md).

## Uso de IA en el desarrollo

Desarrollé esta prueba con **Claude Code** como asistente para generar, revisar y verificar código y documentación. Así lo trabajé:

- **Yo definí los requisitos y las restricciones** de cada módulo y **aprobé cada plan antes de implementarlo**. Varias decisiones las ajusté sobre la propuesta del asistente: Java 17, el contrato `evento` + `operacion` hacia el CORE, la consistencia eventual entre Pólizas y Riesgos con estado de sincronización, y la escala de la demo de Oracle, entre otras.
- **Nada se dio por bueno sin verificación:** builds y pruebas en cada fase, recorridos e2e en el navegador, revisiones visuales, planes de ejecución medidos en Oracle y una prueba final desde cero del paquete entregado. Esa verificación encontró y corrigió defectos reales (descritos en `frontend/DECISIONES.md` §7).
- **[CLAUDE.md](CLAUDE.md)** contiene las convenciones que le di al asistente: idioma, arquitectura, reglas de código y de pruebas.
- Puedo explicar y defender cada decisión; las alternativas descartadas están documentadas en los `DECISIONES.md`.

Así trabajaría también en el equipo: la IA acelera la generación y la revisión, pero el criterio técnico, la aprobación y la responsabilidad sobre el resultado son humanos, con las mismas pruebas y revisiones que cualquier otro código (ver Módulo 5, "Uso responsable de IA").
