# Decisiones de diseño: Frontend

Cada decisión indica **qué se hizo**, **por qué** y **qué alternativa se descartó**. Las del backend están en [../backend/DECISIONES.md](../backend/DECISIONES.md).

---

## 1. Principio rector: el backend es la fuente de verdad

- **Qué:** el frontend **refleja** las reglas de negocio en la interfaz (oculta o deshabilita lo que no aplica), pero **no las impone**. Ejemplos:
  - Renovar está deshabilitado en pólizas canceladas.
  - Agregar riesgo solo aparece en pólizas colectivas no canceladas.
  - Cancelar solo aparece en riesgos activos.
- **Por qué:** si otro usuario cambia la póliza mientras esta pantalla está abierta, el estado mostrado queda desactualizado. El backend responde 409/422, el usuario ve el motivo en un toast y la vista se recarga con el estado real. La prueba e2e "renovar una póliza cancelada" demuestra exactamente ese caso.
- **Descartado:** replicar reglas en el cliente como única validación. Se pueden saltar fácilmente (basta con llamar la API directamente) y se desalinean con el tiempo.
- **Validación de formulario:** el cliente valida solo **formato** (obligatorios, longitudes, rangos, decimales), con los mismos límites que Bean Validation en el backend, para dar retroalimentación inmediata. Si aun así el backend responde 400, sus errores por campo se pintan en el control correspondiente (`riesgos[0].arrendador` → `riesgos.0.arrendador`).

## 2. Arquitectura

### 2.1 Estructura por funcionalidad: `core/`, `features/`, `shared/`

- **Qué:**
  - `core`: piezas únicas de la aplicación (interceptors, servicios HTTP, modelos, layout).
  - `features/polizas`: páginas y componentes del dominio, cargados con *lazy loading*.
  - `shared`: componentes genéricos sin conocimiento del negocio.
- **Por qué:** al agregar otra funcionalidad (p. ej. siniestros) se crea `features/siniestros` sin tocar lo demás. Lo reutilizable queda separado de lo específico.
- **Descartado: organizar por tipo** (`components/`, `services/`, `pages/` globales). Escala mal: una funcionalidad queda repartida en muchas carpetas.

### 2.2 Standalone, signals, `inject()` y control flow nuevo

- **Qué:**
  - Todos los componentes son *standalone* con `ChangeDetectionStrategy.OnPush`.
  - La aplicación es **zoneless** (sin zone.js, el valor por defecto de Angular 21).
  - El estado local usa `signal` y `computed`; las plantillas usan `@if`, `@for` y `@switch`; la inyección es con `inject()`.
- **Por qué:** es el modelo actual recomendado por Angular. Las signals indican exactamente qué cambió, sin depender de zone.js.
- **Descartado: NgModules y `*ngIf`/`*ngFor`.** Son APIs heredadas.

### 2.3 Estado con signals en las páginas, sin librería de estado

- **Qué:** cada página deriva su estado de signals. Las consultas se modelan como `Carga<T>`, una unión discriminada (`cargando` | `listo` | `error`), producida por el operador `conEstadoDeCarga()`.
- **Por qué:** con tres vistas y sin estado compartido entre ellas, una librería no aporta. La unión discriminada obliga a la plantilla a contemplar los tres casos (estado de carga, error y datos).
- **Descartado: NgRx / Signal Store.** Acciones, reducers y efectos para tres pantallas sería sobreingeniería.
- **Descartado: `httpResource`.** Es más conciso, pero su API es reciente y preferí construir sobre `HttpClient` + RxJS, que puedo explicar y probar con total seguridad.

### 2.4 Los filtros del listado viven en la URL

- **Qué:** `/polizas?tipo=COLECTIVA&estado=ACTIVA`. La página los recibe como `input()` gracias a `withComponentInputBinding()`, y al filtrar navega con nuevos *query params*.
- **Por qué:** el listado filtrado se puede compartir y marcar como favorito, y funciona con el botón Atrás. `switchMap` cancela la consulta anterior si el usuario cambia de filtro rápido.
- **Seguridad:** los valores de la URL se validan contra los enums. Un `?tipo=XX` manipulado se ignora en vez de enviarse al backend.
- **Descartado:** guardar los filtros en una signal local, que se pierden al recargar o compartir.

### 2.5 Después de cada acción se recarga el detalle desde el backend

- **Qué:** tras renovar, cancelar, agregar o cancelar un riesgo, el detalle se vuelve a consultar sin mostrar el spinner de página completa.
- **Por qué:** cancelar una póliza también cambia sus riesgos, y la fecha de actualización y la versión las calcula el backend. Recargar garantiza mostrar exactamente lo persistido.
- **Descartado: actualizaciones optimistas.** Habría que duplicar en el cliente el efecto de cada regla (p. ej. la cascada de cancelación) y revertir si falla.

## 3. Comunicación con la API

### 3.1 Tres interceptors funcionales con orden explícito

| Orden | Interceptor | Responsabilidad |
|---|---|---|
| 1 | `correlationIdInterceptor` | Genera un `X-Correlation-Id` (UUID) por petición |
| 2 | `apiKeyInterceptor` | Agrega `x-api-key` desde `environment` |
| 3 | `errorInterceptor` | Traduce el error a `ApiError` y muestra un toast con el código de seguimiento |

- **Las cabeceras solo se envían a nuestra API** (URLs que empiezan por `/api/`). Si algún día se llamara a un servicio de terceros, la API key no se filtraría. Hay una prueba que lo verifica.
- **Por qué se genera un correlationId en el cliente:** el mismo id aparece en el toast, en los logs del backend y en la llamada al CORE. Un usuario puede reportar "código abc-123" y soporte encuentra la traza completa. Si no hay respuesta del servidor (sin conexión), el toast muestra el id enviado.
- **UUID en contextos no seguros:** `crypto.randomUUID()` solo existe en HTTPS o `localhost`. Si la app se abre por HTTP desde otra IP, se genera un UUID v4 con `crypto.getRandomValues()`.

### 3.2 `ApiError`: un único tipo de error para las vistas

- **Qué:** el interceptor convierte cualquier `HttpErrorResponse` en `ApiError` (`status`, `titulo`, `mensaje`, `correlationId`, `erroresCampos`).
- **Mensajes por código:**
  - 404, 409 y 422 usan el `detail` del backend, que ya explica la regla en español ("No se puede renovar la póliza POL-000003 porque está cancelada").
  - 401 y 5xx usan mensajes propios que no exponen detalles técnicos.
  - Sin conexión (status 0) indica que el servidor no responde.
  - Los cuerpos que no son ProblemDetail (p. ej. el HTML de un 502 de nginx) se toleran.
- **Descartado: inspeccionar `HttpErrorResponse` en cada componente.** Duplica lógica y mensajes inconsistentes.

### 3.3 Toast automático, salvo que la vista muestre el error

- **Qué:** por defecto todo error genera un toast. Las consultas de las páginas (`listar`, `obtener`) marcan la petición con un `HttpContext` (`sinToastDeError()`), porque la página muestra su propio estado de error. Por ejemplo, el detalle muestra "Póliza no encontrada" ante un 404.
- **Por qué:** evita duplicar el mismo error en dos lugares.
- **Descartado:** que cada componente decida si mostrar toast, lo que lleva a olvidos e inconsistencias.

### 3.4 Proxy de desarrollo y nginx: mismo origen, sin CORS

- **Qué:** el navegador siempre llama a `/api`.
  - En desarrollo, `proxy.conf.js` lo reenvía a `BACKEND_URL` (por defecto `http://localhost:8080`).
  - En Docker, nginx lo reenvía al servicio `backend`, con la URL inyectada al iniciar el contenedor mediante los *templates* de la imagen oficial.
- **Por qué:** no hay puertos ni hosts en el código. El mismo build sirve en cualquier ambiente, y no se depende de la configuración CORS del backend (que igual existe para `localhost:4200`).
- **Descartado: `environment.apiUrl = 'http://localhost:8080'`.** Ata el bundle a un ambiente, obliga a recompilar para cambiarlo y depende de CORS.
- **Ambos proxies eliminan el header `Origin`:**
  - Chrome envía `Origin` incluso en los POST del mismo origen.
  - Si llega al backend, su filtro CORS rechaza con 403 cualquier origen distinto de `http://localhost:4200`. Por ejemplo, el contenedor publicado en otro puerto o en un dominio real: los GET funcionaban y **todas las escrituras fallaban**.
  - Para el navegador, el proxy *es* el mismo origen, así que CORS no aplica en ese tramo. Quitar el header no abre riesgo de CSRF, porque la API se autentica con un header (`x-api-key`) y no con cookies.
  - El backend accedido directamente sigue aplicando su política CORS.

### 3.5 El IPC se consulta al backend (`GET /parametros/renovacion`)

- **Qué:** el diálogo de renovación consulta el IPC vigente al abrirse y no permite confirmar hasta conocerlo.
- **Por qué:** una única fuente de verdad. Si se cambia el IPC en `application.yml`, la interfaz muestra el nuevo valor sin desplegar el frontend.
- **Descartado:** copiar el IPC en `environment.ts`. El usuario podría confirmar un porcentaje distinto al que realmente se aplica.

## 4. Formularios

### 4.1 Formularios reactivos tipados con un FormArray de riesgos

- **Qué:** `FormGroup<{ tipo: FormControl<TipoPoliza>; ...; riesgos: FormArray<RiesgoForm> }>` con `nonNullable`.
  - **INDIVIDUAL:** el arreglo queda fijo en 1 riesgo, sin botones de agregar ni quitar.
  - **COLECTIVA:** el usuario agrega y quita riesgos libremente (de 0 a n).
  - **Cambiar de COLECTIVA a INDIVIDUAL** conserva solo el primer riesgo diligenciado.
- **Por qué:** el tipado detecta en compilación errores como un nombre de campo mal escrito. El subformulario de riesgo (`RiesgoFormGroup` + `crearRiesgoForm()`) se reutiliza al crear la póliza y en el diálogo "Agregar riesgo".
- **Descartado: formularios por plantilla (`ngModel`).** Sin tipado y con la lógica de validación repartida en el HTML.

### 4.2 Prima estimada en el formulario

- **Qué:** se muestra `canon × meses` mientras el usuario escribe, con la etiqueta **"estimada, la calcula el sistema"**.
- **Por qué:** ayuda a decidir antes de crear. La etiqueta deja claro que el valor oficial es el que devuelve el backend, que es el que se muestra en el detalle.
- **Riesgo aceptado:** si la fórmula del backend cambiara, la estimación quedaría desactualizada hasta ajustar el frontend. Por eso se presenta como estimación y no como valor definitivo.
- **Descartado: no mostrarla**, que es más puro pero da peor experiencia de usuario.

### 4.3 Errores de campo reactivos con `control.events`

- **Qué:** `CampoError` y `RiesgoFormGroup` derivan su estado de `control.events` (API unificada de Angular para valor, estado y *touched*) convertido en signal.
- **Por qué:** con `OnPush` y sin zone.js, un componente hijo no se entera de que el padre ejecutó `markAllAsTouched()` o de que llegaron errores del servidor. Los eventos del control lo resuelven sin `ChangeDetectorRef` manual.

## 5. UX y accesibilidad

- **Diálogos con `<dialog>` nativo y `showModal()`:** el navegador atrapa el foco, inerta el fondo, cierra con Esc y devuelve el foco al botón que lo abrió. Mientras se procesa una acción, los botones se deshabilitan y Esc no cierra (evita dobles envíos). *Descartado: Angular Material / CDK*, una dependencia grande para un componente.
- **Acciones destructivas:** botón rojo, texto explícito ("Sí, cancelar póliza") y el foco inicial en "Volver". El diálogo de cancelación indica cuántos riesgos activos se cancelarán.
- **Accesibilidad:**
  - Toasts: los de error con `role="alert"` y los demás con `role="status"`.
  - Formularios: cada campo con `<label>`, `aria-invalid` y `aria-describedby` hacia su mensaje de error, y el foco va al primer campo con error al enviar.
  - Navegación: enlace "Saltar al contenido", `aria-current` en la navegación y tablas con `caption` y `scope`.
  - Los estados se comunican con texto, no solo con color.
  - ESLint aplica `templateAccessibility`.
- **Contraste AA verificado:** blanco sobre `primario-700` ≈ 6,6:1 y texto oscuro sobre `acento-400` ≈ 11:1. La paleta usa tonos verde y amarillo genéricos, sin logos ni marcas.
- **Responsive:** en móvil, la tabla oculta columnas secundarias y muestra el tipo debajo del número, y los filtros quedan en dos columnas.
- **Fechas (`fechaLocal`):** las fechas de vigencia son `LocalDate` (`"2026-01-01"`). El `DatePipe` las interpreta como medianoche UTC, y en Colombia (UTC-5) mostraría **31 de diciembre de 2025**. El pipe construye la fecha en la zona local. *Descartado: `DatePipe` directo*, que tiene ese error sutil.
- **Moneda (`moneda`):** pesos con el locale `es-CO`. Sin decimales si el valor es entero (`$ 1.500.000`) y con dos si hay centavos (`$ 1.000.000,50`).

## 6. Calidad y entrega

- **Pruebas unitarias con Vitest** (runner por defecto de Angular 21), sobre jsdom. jsdom no implementa `<dialog>.showModal()`, así que un *setup file* exclusivo de pruebas agrega un polyfill mínimo sin tocar el código productivo.
- **Pruebas e2e con Playwright** dentro del repositorio (`e2e/`), contra la aplicación y el backend reales. Cada prueba crea sus datos para ser repetible. *Descartado: Cypress*: Playwright es más rápido, soporta varios navegadores y su API de *locators* por rol favorece selectores accesibles.
- **Docker multi-etapa:** Node compila y nginx sirve los estáticos (la imagen final no contiene Node ni el código fuente).
  - La URL del backend se inyecta en tiempo de ejecución.
  - nginx agrega cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) y oculta su versión.
  - `index.html` no se cachea; los bundles con hash se cachean un año.
- **Sin warnings** en `ng build` de producción y lint limpio.

## 7. Hallazgos de la verificación de punta a punta

El recorrido con Playwright contra el backend real, tanto con `ng serve` como con la imagen Docker, encontró tres defectos que las pruebas unitarias no detectaban. Los tres quedaron corregidos y cubiertos:

| Hallazgo | Causa | Corrección |
|---|---|---|
| Tras un 409 al renovar, la vista seguía mostrando la póliza como "Activa" | El diálogo de renovación manejaba el error por su cuenta y solo cerraba; las demás acciones sí recargaban | El diálogo emite `rechazada` y la página recarga el estado real (prueba unitaria y e2e) |
| En Docker, renovar, cancelar y crear respondían 403 si el frontend no estaba en el puerto 4200 | El header `Origin` llegaba al filtro CORS del backend a través del proxy | nginx y `proxy.conf.js` eliminan `Origin` (§3.4) |
| En Docker, las fechas de auditoría aparecían 5 horas adelantadas | El contenedor del backend corría en UTC y `LocalDateTime` no lleva zona | `TZ=America/Bogota` en la imagen del backend |

Además se verificó que el código de seguimiento mostrado en el toast del 409 aparece en el log del backend asociado a ese mismo conflicto, es decir, que la trazabilidad funciona de punta a punta.

## 8. Mejoras fuera del alcance

1. **OAuth2/OIDC** en lugar de API key en el bundle (ver README).
2. **Content-Security-Policy** en nginx, ajustada a los estilos que genera Angular.
3. **Paginación** en el listado cuando el backend la exponga.
4. **Internacionalización** (`@angular/localize`) si se requieren otros idiomas.
5. **Pruebas e2e en CI** con `docker compose` y reporte HTML de Playwright como artefacto.
