import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ToastService } from '../../shared/services/toast.service';
import { sinToastDeError } from './api-config';
import { ApiError } from './api-error';
import { API_INTERCEPTORS, GENERAR_CORRELATION_ID, generarUuid } from './interceptors';

describe('Interceptors HTTP', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors(API_INTERCEPTORS)),
        provideHttpClientTesting(),
        { provide: GENERAR_CORRELATION_ID, useValue: () => 'cid-fijo' },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => backend.verify());

  function capturarError(url: string, opciones = {}): { error?: ApiError } {
    const resultado: { error?: ApiError } = {};
    http.get(url, opciones).subscribe({ error: (e: ApiError) => (resultado.error = e) });
    return resultado;
  }

  describe('cabeceras', () => {
    it('agrega la API key y el X-Correlation-Id a las peticiones de la API', () => {
      http.get('/api/polizas').subscribe();

      const req = backend.expectOne('/api/polizas');
      expect(req.request.headers.get('x-api-key')).toBe('123456');
      expect(req.request.headers.get('X-Correlation-Id')).toBe('cid-fijo');
      req.flush([]);
    });

    it('no envía la API key a dominios externos', () => {
      http.get('https://externo.com/api/datos').subscribe();
      http.get('/apiotra/recurso').subscribe();

      const externa = backend.expectOne('https://externo.com/api/datos');
      const prefijoParecido = backend.expectOne('/apiotra/recurso');
      expect(externa.request.headers.has('x-api-key')).toBe(false);
      expect(externa.request.headers.has('X-Correlation-Id')).toBe(false);
      expect(prefijoParecido.request.headers.has('x-api-key')).toBe(false);
    });

    it('respeta un X-Correlation-Id ya presente', () => {
      http.get('/api/polizas', { headers: { 'X-Correlation-Id': 'propio' } }).subscribe();

      expect(backend.expectOne('/api/polizas').request.headers.get('X-Correlation-Id')).toBe('propio');
    });
  });

  describe('errores', () => {
    it('traduce un 409 con el detail del backend y lo muestra con su código de seguimiento', () => {
      const resultado = capturarError('/api/polizas/3/renovar');

      backend.expectOne('/api/polizas/3/renovar').flush(
        { status: 409, title: 'Conflicto de estado', detail: 'No se puede renovar la póliza POL-000003 porque está cancelada', correlationId: 'cid-backend' },
        { status: 409, statusText: 'Conflict' },
      );

      expect(resultado.error).toBeInstanceOf(ApiError);
      expect(resultado.error?.status).toBe(409);
      expect(resultado.error?.correlationId).toBe('cid-backend');
      expect(toast.toasts()).toEqual([
        expect.objectContaining({
          tipo: 'error',
          titulo: 'Operación no permitida',
          mensaje: 'No se puede renovar la póliza POL-000003 porque está cancelada',
          correlationId: 'cid-backend',
        }),
      ]);
    });

    it('conserva los errores por campo de un 400', () => {
      const resultado = capturarError('/api/polizas');

      backend.expectOne('/api/polizas').flush(
        { status: 400, detail: 'Uno o más campos no son válidos.', errores: { tomador: 'no debe estar vacío' } },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(resultado.error?.erroresCampos).toEqual({ tomador: 'no debe estar vacío' });
      expect(resultado.error?.mensaje).toBe('Revise los campos marcados en el formulario.');
    });

    it.each([
      [401, 'No autorizado'],
      [404, 'No encontrado'],
      [422, 'Regla de negocio'],
      [500, 'Error del servidor'],
      [418, 'Error'],
    ])('traduce el estado %i a "%s"', (status, titulo) => {
      const resultado = capturarError('/api/x');

      backend.expectOne('/api/x').flush({ status }, { status, statusText: 'x' });

      expect(resultado.error?.titulo).toBe(titulo);
    });

    it('sin conexión usa el correlationId enviado porque no hay respuesta del backend', () => {
      const resultado = capturarError('/api/polizas');

      backend.expectOne('/api/polizas').error(new ProgressEvent('error'), { status: 0 });

      expect(resultado.error?.titulo).toBe('Sin conexión');
      expect(resultado.error?.correlationId).toBe('cid-fijo');
    });

    it('tolera cuerpos que no son ProblemDetail (p. ej. HTML de un proxy)', () => {
      const resultado = capturarError('/api/polizas');

      backend.expectOne('/api/polizas').flush('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' });

      expect(resultado.error?.titulo).toBe('Error del servidor');
    });

    it('no muestra toast si la vista presenta el error', () => {
      const resultado = capturarError('/api/polizas/999', { context: sinToastDeError() });

      backend.expectOne('/api/polizas/999').flush({ status: 404, detail: 'No existe' }, { status: 404, statusText: 'Not Found' });

      expect(resultado.error?.status).toBe(404);
      expect(toast.toasts()).toEqual([]);
    });
  });

  it('generarUuid produce un UUID v4 válido', () => {
    expect(generarUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('generarUuid funciona sin crypto.randomUUID (contexto no seguro)', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(generarUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
