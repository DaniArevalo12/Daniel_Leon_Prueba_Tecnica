# Decisiones de diseño

Cada decisión indica **qué se hizo**, **por qué** y **qué alternativa se descartó**. Al final están los **supuestos** tomados donde el enunciado no definía una regla y las **mejoras** que quedan fuera del alcance.

---

## 1. Arquitectura

### 1.1 Hexagonal ligera en tres paquetes: `domain`, `application`, `infrastructure`

- **Qué:** el dominio contiene las entidades, sus reglas, las excepciones de negocio, los eventos y el puerto del CORE. La capa de aplicación orquesta los casos de uso. Todo lo técnico (HTTP, JPA, seguridad, logs) vive en infraestructura.
- **Por qué:** las reglas de negocio quedan aisladas y se prueban sin Spring (`PolizaTest` corre en milisegundos). El único sistema externo real, el CORE, queda detrás de una interfaz.
- **Descartado: hexagonal "pura"**, con modelos de dominio sin anotaciones JPA y entidades de persistencia separadas con su mapeo. Duplica clases y mapeos sin beneficio real en un servicio de este tamaño. Las anotaciones JPA en el dominio son metadatos que no cambian su comportamiento.
- **Descartado: capas planas** (controller → service → repository sin separar el dominio). Las reglas terminarían repartidas en los servicios.

### 1.2 Las reglas de negocio viven en las entidades (modelo rico)

- **Qué:** `Poliza.renovar(ipc)`, `Poliza.cancelar()`, `Poliza.agregarRiesgo()`, `Poliza.crear(...)` y `Riesgo.cancelar()` validan sus propias reglas y cambian su estado. Los servicios solo cargan, invocan, persisten y notifican.
- **Por qué:** la póliza es la *raíz del agregado*. Ella garantiza que, por ejemplo, cancelarla cancele todos sus riesgos. Es imposible dejar una póliza en un estado inválido aunque se agregue un nuevo caso de uso.
- **Descartado: modelo anémico** (entidades con getters/setters y lógica en servicios). Permite saltarse reglas llamando un setter, y cada servicio nuevo tendría que repetir las validaciones.
- Detalle: `getRiesgos()` devuelve una lista **no modificable**. Solo se agregan riesgos a través de `agregarRiesgo`.

### 1.3 Los servicios usan directamente los repositorios de Spring Data

- **Qué:** `PolizaService` depende de `PolizaRepository` (interfaz de Spring Data en `infrastructure.persistence`).
- **Por qué:** Spring Data ya es una abstracción (una interfaz sin implementación propia). Crear un puerto `PolizaRepositoryPort` con un adaptador que solo delega sería ceremonia.
- **Descartado: un puerto de persistencia propio.** Se justificaría si hubiera que cambiar de tecnología de persistencia, lo cual no está en el alcance.
- **Por qué el CORE sí tiene puerto:** es un sistema externo, con fallas propias, que se reemplaza por un mock en las pruebas y por otro adaptador en producción.

### 1.4 Commands entre la capa web y la de aplicación

- **Qué:** los controllers convierten los DTO (`CrearPolizaRequest`) en commands (`CrearPolizaCommand`) antes de llamar al servicio.
- **Por qué:** la aplicación no depende de anotaciones HTTP, Swagger ni Bean Validation. El mismo caso de uso podría invocarse desde un consumidor de mensajes.
- **Descartado:** pasar el DTO web al servicio. Es menos código, pero acopla los casos de uso al contrato HTTP.

### 1.5 Records para DTOs, mappers manuales y sin Lombok

- **Qué:** DTOs, commands, eventos y propiedades de configuración son `record`. Los mappers son clases con métodos estáticos.
- **Por qué:** los records son inmutables y nativos de Java 17. El mapeo manual es explícito, se depura con el IDE y no genera código oculto.
- **Descartado: MapStruct y Lombok.** Agregan procesamiento de anotaciones y "magia" que hay que explicar, para un ahorro mínimo de código en este tamaño.

---

## 2. Dominio y datos

### 2.1 Dinero con `BigDecimal`, escala 2 y `RoundingMode.HALF_EVEN`

- **Qué:** toda operación monetaria pasa por `Montos.redondear()`, la política única de redondeo. Las columnas son `NUMBER(15,2)`.
- **Por qué:** `double` no representa exactamente valores decimales (0.1 + 0.2 ≠ 0.3). HALF_EVEN (redondeo bancario) evita el sesgo acumulado hacia arriba que produce HALF_UP en miles de cálculos.
- **Descartado: HALF_UP.** Es más "intuitivo", pero acumula sesgo. Si negocio exigiera HALF_UP, se cambia en un único lugar.
- Ejemplo verificado en pruebas: `100.50 × 1.05 = 105.525 → 105.52`.

### 2.2 Ids con secuencias de base de datos

- **Qué:** `GenerationType.SEQUENCE` con `seq_poliza` y `seq_riesgo`, y el número de póliza (`POL-000001`) desde una tercera secuencia, `seq_numero_poliza`.
- **Por qué:** las secuencias son el mecanismo nativo de Oracle y funcionan igual en H2 en modo Oracle. El número sale de la base de datos, así que es único aunque haya varias instancias de la API.
- **Descartado: `IDENTITY`.** Funciona en Oracle 12c+, pero obliga a Hibernate a insertar inmediatamente para conocer el id. **Descartado: calcular el número como `max + 1`**, que genera duplicados con concurrencia.
- Las secuencias inician en 1000 para reservar el rango inferior a los datos de prueba. Así los ejemplos del README y de Postman (`/polizas/1`) son reproducibles.

### 2.3 Flyway es el único dueño del esquema (`ddl-auto: none`)

- **Qué:** el esquema se define en `V1__esquema_polizas.sql` y los datos en `V2__datos_prueba.sql`. Hibernate no crea ni modifica tablas.
- **Por qué:** los cambios de esquema quedan versionados, revisables y repetibles en todos los ambientes. Las restricciones (`CHECK`, `UNIQUE`, `FK`) y los índices se declaran explícitamente. Por ejemplo, `ix_riesgo_poliza` existe porque Oracle no indexa las llaves foráneas automáticamente.
- **Descartado: `ddl-auto: update`.** No es apto para producción: no borra columnas, no versiona y puede alterar tablas sin revisión.
- **Descartado: `ddl-auto: validate`.** Era la primera opción, pero H2 reporta `NUMBER(19)` como `NUMERIC` y Hibernate espera `BIGINT`, aunque sea correcto en Oracle. La coincidencia entre mapeo y esquema la garantizan las pruebas de repositorio y de integración, que ejercen todas las columnas sobre las migraciones reales.

### 2.4 H2 en modo Oracle por defecto y perfil `oracle` con Docker

- **Qué:** las mismas migraciones corren en H2 (`MODE=Oracle`) y en Oracle Free 23. Ambas se verificaron.
- **Por qué:** cualquiera clona el repositorio y ejecuta sin instalar nada. El perfil `oracle` demuestra compatibilidad con el motor real.
- **Descartado: Testcontainers para las pruebas.** Es más fiel, pero obliga a tener Docker para correr `mvn verify` y vuelve lentas las pruebas. Queda como mejora (ver §6).

### 2.5 Bloqueo optimista con `@Version`

- **Qué:** `Poliza` y `Riesgo` tienen `@Version`. Si dos peticiones modifican la misma póliza a la vez, la segunda falla y responde **409 "Modificación concurrente"**.
- **Por qué:** los conflictos son raros. El bloqueo optimista no retiene bloqueos en la base mientras se procesa la petición.
- **Descartado: bloqueo pesimista** (`SELECT ... FOR UPDATE`). Serializa el acceso y puede generar bloqueos largos, sobre todo porque la operación incluye una llamada HTTP al CORE.
- Se agregó `@Version` también en `Riesgo` para proteger su cancelación concurrente.

### 2.6 Auditoría con callbacks JPA (`@PrePersist` / `@PreUpdate`)

- **Qué:** `fechaCreacion` y `fechaActualizacion` se asignan en la propia entidad.
- **Por qué:** con `@CreationTimestamp` y `@UpdateTimestamp` de Hibernate, cada fecha se generaba por separado, y al crear se observó `fechaActualizacion` microsegundos *anterior* a `fechaCreacion`. Con el callback ambas parten del mismo instante.
- **Descartado: auditoría de Spring Data** (`@CreatedDate`, `@EnableJpaAuditing`). Es más configuración para el mismo resultado, pues no hay usuario autenticado que auditar.

---

## 3. Integraciones y eventos

### 3.1 CORE como puerto con adaptador HTTP

- **Qué:** `CorePort` (dominio) define `notificar(EventoCore)`. `CoreHttpAdapter` lo implementa con `RestClient` contra `POST /core-mock/evento`, con timeouts de conexión (2 s) y lectura (3 s) configurables. El adaptador envía la API key y propaga el `X-Correlation-Id`.
- **Por qué:** el servicio no sabe si el CORE es HTTP, una cola o un mock. En las pruebas se reemplaza el puerto y se verifica qué se envió.
- **Timeouts:** sin ellos, un CORE lento bloquearía indefinidamente los hilos de la API. Hay una prueba con un servidor real que tarda 2 s, y el adaptador corta a los 300 ms sin propagar error.

### 3.2 Contrato del evento: `evento` siempre `"ACTUALIZACION"` más `operacion`

- **Qué:** `{"evento":"ACTUALIZACION","operacion":"RENOVACION","polizaId":1}`.
- **Por qué:** respeta literalmente el contrato del enunciado (`evento: ACTUALIZACION`) y el campo adicional dice qué cambió (`CREACION`, `RENOVACION`, `CANCELACION`, `RIESGO_AGREGADO`, `RIESGO_CANCELADO`). El mock también acepta el body mínimo del enunciado, sin `operacion`.
- Para operaciones sobre un riesgo, `polizaId` es el de su póliza.

### 3.3 Llamada síncrona al CORE, después del `flush` y sin revertir la operación si falla

- **Qué:** el servicio cambia el estado, hace `saveAndFlush` y luego invoca el CORE dentro del mismo flujo. Si el CORE falla (timeout, conexión rechazada, 4xx/5xx), el adaptador **registra un WARN con el correlationId y no lanza excepción**. La operación de negocio se confirma igual.
- **Por qué el flush antes:** si la base va a rechazar el cambio (restricción, versión concurrente), el error ocurre *antes* de avisar al CORE. Así no se notifica una operación que no va a existir.
- **Por qué no revertir:** el enunciado pide "manejo de error registrado en logs". Que el CORE esté caído no debe impedir que un asesor cancele una póliza. El sistema de pólizas es la fuente de verdad.
- **Limitación conocida:** si el CORE falla, la notificación se pierde (solo queda el log). En el otro extremo, si el commit fallara *después* del flush, que es muy improbable, el CORE habría recibido un evento de algo que no se confirmó.
- **Mejora: patrón Transactional Outbox.** El evento se guarda en una tabla `outbox` *en la misma transacción* del cambio de negocio, y un proceso aparte lo envía al CORE con reintentos. Garantiza entrega *al menos una vez* y elimina ambas inconsistencias. No se implementó porque agrega una tabla, un *scheduler* y lógica de reintentos que exceden el alcance pedido.

### 3.4 Eventos de dominio y notificaciones después del commit

- **Qué:** crear y renovar publican `PolizaCreadaEvent` / `PolizaRenovadaEvent` con `ApplicationEventPublisher`. `NotificacionService` los escucha con `@TransactionalEventListener(phase = AFTER_COMMIT)` y simula correo y SMS en logs.
- **Por qué AFTER_COMMIT:** al cliente solo se le notifica si la operación quedó realmente guardada. Con `@EventListener` normal, el correo saldría aunque la transacción hiciera rollback.
- **Por qué records y no `extends ApplicationEvent`:** desde Spring 4.2 cualquier objeto puede publicarse como evento (Spring lo envuelve en un `PayloadApplicationEvent`). Así los eventos del dominio no dependen de Spring.
- **Descartado: llamar a `NotificacionService` directamente desde el servicio.** Acopla el caso de uso a cada canal de notificación. Con eventos se agregan nuevos suscriptores (auditoría, analítica) sin tocar el servicio.

### 3.5 `GET /parametros/renovacion` expone el IPC vigente

- **Qué:** endpoint de solo lectura, protegido con API key, que devuelve `{"ipc": 0.0520}` desde `polizas.renovacion.ipc`.
- **Por qué:** el frontend debe mostrar el IPC en el diálogo de confirmación *antes* de renovar. Exponerlo mantiene una **única fuente de verdad**: cambiar el IPC en `application.yml` lo actualiza en la API y en la interfaz.
- **Descartado: copiar el IPC en el `environment` del frontend.** Duplica la configuración, y si ambas copias se desalinean, el usuario confirmaría un porcentaje distinto al que realmente se aplica.
- **Descartado: calcular el porcentaje después de la respuesta.** No permite mostrarlo antes de confirmar.

---

## 4. Seguridad

### 4.1 Filtro de servlet propio para la API key, no Spring Security

- **Qué:** `ApiKeyFilter` (`OncePerRequestFilter`) valida `x-api-key` y responde 401 en `application/problem+json`. Excluye Swagger, la consola H2 y los preflight `OPTIONS`.
- **Por qué:** el requisito es un único header estático. Un filtro de unas 30 líneas se lee y se explica completo.
- **Descartado: Spring Security.** Es el estándar cuando hay usuarios, roles u OAuth2, pero para una API key trae una cadena de filtros y configuración que hay que justificar línea por línea. Si mañana se requiere OAuth2/JWT, migrar sería el siguiente paso natural.
- **Detalles de seguridad:**
  - Comparación en **tiempo constante** (`MessageDigest.isEqual`), para no filtrar información por diferencias de tiempo de respuesta.
  - El valor recibido **nunca se registra** en logs.
  - La key se toma de la variable de entorno `API_KEY` cuando existe. `123456` es solo el valor por defecto de la prueba.

### 4.2 CORS como filtro, antes del filtro de API key

- **Qué:** `CorsFilter` registrado con orden explícito: correlationId → CORS → API key.
- **Por qué:** si CORS se configurara en Spring MVC (`WebMvcConfigurer`), los 401 que emite el filtro de API key saldrían **sin** cabeceras CORS, y el navegador mostraría un error de CORS en vez del 401. Hay una prueba de integración que lo verifica.
- Solo se permite el origen `http://localhost:4200` y los métodos `GET`, `POST` y `OPTIONS` que usa la API.

### 4.3 OWASP Top 10 aplicado

| Riesgo | Medida |
|---|---|
| A01 Control de acceso | API key obligatoria en todas las rutas de negocio |
| A03 Inyección | JPA con parámetros enlazados (sin SQL concatenado); Bean Validation con longitudes máximas alineadas con las columnas; `X-Correlation-Id` validado con una expresión regular para evitar inyección en logs (CRLF) |
| A04 Diseño inseguro | Límites de entrada: `mesesVigencia` entre 1 y 120, máximo 100 riesgos por petición, montos con 13 enteros y 2 decimales |
| A05 Configuración | `server.error.include-stacktrace: never`; errores 500 con mensaje genérico; contenedor sin usuario root |
| A07 Autenticación | Comparación de key en tiempo constante; la key no se registra en logs |
| A09 Logging | correlationId en cada línea; solo se registran identificadores, nunca nombres de tomadores ni arrendatarios |

---

## 5. Calidad

### 5.1 Errores con ProblemDetail (RFC 9457)

- **Qué:** `GlobalExceptionHandler` extiende `ResponseEntityExceptionHandler`, así que los errores propios de Spring MVC (JSON mal formado, tipos inválidos, ruta inexistente) también salen en el mismo formato. Todos incluyen `timestamp` y `correlationId`.
- **Criterio 409 vs 422:**
  - **409 Conflict:** la petición es válida, pero **el estado actual del recurso** la impide (ya cancelada, renovar una cancelada, agregar riesgo a una cancelada, versión concurrente). Si el estado fuera otro, la misma petición funcionaría.
  - **422 Unprocessable Entity:** la petición **nunca** será válida para ese recurso, sin importar su estado (agregar un riesgo a una INDIVIDUAL; crear una INDIVIDUAL sin exactamente un riesgo).
  - **400:** la petición está mal formada o incumple las validaciones de formato.

### 5.2 correlationId por petición con MDC

- **Qué:** `CorrelationIdFilter` (primer filtro de la cadena) reutiliza el `X-Correlation-Id` recibido si es válido o genera un UUID. Lo guarda en el MDC, lo devuelve en la respuesta, lo incluye en los ProblemDetail y lo propaga al CORE.
- **Logs estructurados:** con el perfil `json`, Spring Boot emite cada línea en formato ECS (Elastic Common Schema) con el `correlationId` como campo, listo para Elastic o Datadog. Sin ese perfil se usa texto legible con `[cid=...]`, más cómodo en desarrollo.

### 5.3 Estrategia de pruebas (96 pruebas, ~99 % de líneas)

| Nivel | Qué prueba | Herramientas |
|---|---|---|
| Unitarias de dominio | Reglas de Poliza y Riesgo (cálculos, estados, invariantes) | JUnit 5, AssertJ |
| Unitarias de aplicación | Orquestación: persistencia, llamada al CORE y eventos (y que NO ocurran si falla una regla) | Mockito |
| Adaptador CORE | Contrato JSON, header de correlación, errores y timeout real | MockRestServiceServer, HttpServer del JDK |
| Repositorio | Migraciones Flyway, filtros, secuencias, cascada | `@DataJpaTest` sobre H2 modo Oracle |
| Integración | Endpoints completos con filtros, validación, errores, CORS y notificaciones | `@SpringBootTest` + MockMvc |

- **Base limpia por prueba:** antes de cada prueba de integración se ejecuta `flyway.clean()` + `migrate()`.
- **Descartado: `@Transactional` en las pruebas** (rollback automático). Con ese enfoque las transacciones nunca hacen commit, así que los listeners `AFTER_COMMIT` no se ejecutarían y no se podría probar que las notificaciones se envían.
- **El CORE se reemplaza con `@MockitoBean`** en las pruebas de integración, para verificar exactamente qué evento se envió por cada operación.
- **JaCoCo** hace fallar el build si la cobertura de líneas baja del 80 %.

### 5.4 Docker

- **Dockerfile multi-etapa:** una etapa con JDK compila y otra con solo JRE ejecuta, así la imagen final no incluye Maven ni el código fuente. Las dependencias se resuelven en una capa separada que se cachea mientras no cambie el `pom.xml`. El proceso corre con un usuario sin privilegios.
- Las pruebas no se ejecutan dentro del `docker build`: pertenecen al pipeline (`./mvnw verify`). Así la imagen se construye rápido y no depende de cómo se ejecuten las pruebas.
- **Zona horaria `TZ=America/Bogota` en la imagen:** las fechas de auditoría son `LocalDateTime` (sin zona) y se generan con el reloj del proceso. Con la imagen en UTC aparecían 5 horas adelantadas en la interfaz. *Alternativa descartada por ahora:* migrar las fechas de auditoría a `OffsetDateTime`/`Instant` con zona explícita, que es lo ideal si el sistema opera en varias zonas horarias (queda como mejora).

### 5.5 Java 17

Se usa Java 17 (LTS) por indicación del equipo, que coincide con el JDK disponible en el entorno. Todo lo usado (records, text blocks, *pattern matching* de `instanceof`) es compatible con 17.

---

## 6. Supuestos tomados (reglas no definidas en el enunciado)

| # | Situación | Decisión | Razón |
|---|---|---|---|
| 1 | Nueva vigencia al renovar | Inicio = fin de la vigencia anterior; fin = inicio + `mesesVigencia` (los mismos meses del periodo inicial) | Continuidad de cobertura sin huecos ni traslapes |
| 2 | Renovar una póliza ya RENOVADA | Se permite. Solo se bloquea si está CANCELADA | El enunciado solo prohíbe renovar canceladas; una póliza se renueva cada periodo |
| 3 | Creación de pólizas | INDIVIDUAL exige exactamente 1 riesgo en el body. COLECTIVA admite 0..n. El número lo genera el backend | Cumple "una individual solo puede tener 1 riesgo (se crea junto con la póliza)" |
| 4 | **Cancelar el único riesgo de una póliza INDIVIDUAL** con `/riesgos/{id}/cancelar` | **Se permite y la póliza no cambia de estado** | El enunciado no define que cancelar un riesgo afecte a la póliza. Inventar esa regla (p. ej. cancelar la póliza en cascada) tendría impacto de negocio sin validación. Es una pregunta abierta para el negocio |
| 5 | Datos de tomador, arrendatario y arrendador | Un campo de texto (nombre) cada uno | Así los nombra el enunciado; no se pidieron documentos ni datos de contacto |
| 6 | "Descripción/dirección del inmueble" | Un solo campo, `direccionInmueble` | El enunciado los presenta como el mismo dato |
| 7 | Paginación en `GET /polizas` | No se implementó | No se pidió (ver mejoras) |
| 8 | **Falla del CORE** | **Se registra en logs y no revierte la operación** | Ver §3.3; el patrón outbox es la mejora |
| 9 | Notificaciones correo/SMS | Solo en creación y renovación | Es lo que pide el enunciado |
| 10 | Agregar riesgo a una COLECTIVA RENOVADA | Se permite | Solo se prohíben las CANCELADAS |
| 11 | Cancelar una póliza con riesgos ya cancelados | Se cancelan solo los activos, sin error | Cancelar la póliza no debe fallar por riesgos cancelados antes |
| 12 | Renovar no modifica los riesgos | Los riesgos siguen activos con la póliza renovada | No se definió otra regla |
| 13 | Límites de entrada | `mesesVigencia` 1–120, canon > 0, hasta 100 riesgos por petición | Validación defensiva (OWASP A04); evita valores absurdos o abusivos |
| 14 | `fechaFinVigencia` | `inicio.plusMonths(meses)`; ej. 2026-01-01 + 12 = 2027-01-01 | Convención simple; si negocio usa "fin = día anterior", se ajusta en `Poliza` |
| 15 | IPC | Fracción decimal en `polizas.renovacion.ipc` (0.0520 = 5,20 %) | Evita ambigüedad entre "5.2" y "0.052" |
| 16 | `GET /polizas` y `GET /polizas/{id}` | No incluyen la lista de riesgos | Evita N+1 y respuestas pesadas; los riesgos tienen su endpoint |

## 7. Mejoras fuera del alcance

1. **Transactional Outbox** para el CORE, con reintentos y entrega garantizada.
2. **Paginación y orden** en `GET /polizas` (`Pageable` de Spring Data).
3. **Testcontainers con Oracle** en las pruebas de integración.
4. **OAuth2 / JWT con Spring Security** si se requieren usuarios y roles. **Rate limiting** por API key.
5. **Spring Boot Actuator** (`/actuator/health`) para *healthchecks* de Docker o Kubernetes y métricas.
6. **Idempotencia** en `POST /polizas` (header `Idempotency-Key`) para evitar duplicados por reintentos del cliente.
7. **Auditoría de usuario** (quién hizo cada cambio) cuando exista autenticación de usuarios.
