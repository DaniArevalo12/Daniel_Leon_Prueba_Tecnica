import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ToastService } from '../../shared/services/toast.service';
import { API_BASE_URL, API_KEY, SILENCIAR_TOAST_ERROR } from './api-config';
import { ApiError, HEADER_CORRELATION_ID } from './api-error';

export const HEADER_API_KEY = 'x-api-key';

/** Generador de ids de correlación, inyectable para que las pruebas sean deterministas. */
export const GENERAR_CORRELATION_ID = new InjectionToken<() => string>('GENERAR_CORRELATION_ID', {
  providedIn: 'root',
  factory: () => generarUuid,
});

/**
 * crypto.randomUUID solo existe en contextos seguros (https o localhost). Si la app se abre por
 * http desde otra IP, se genera un UUID v4 con getRandomValues, disponible en cualquier contexto.
 */
export function generarUuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Solo las peticiones a nuestra API llevan credenciales y cabeceras propias (no se filtran a terceros). */
function esPeticionApi(req: HttpRequest<unknown>, apiBaseUrl: string): boolean {
  return req.url === apiBaseUrl || req.url.startsWith(`${apiBaseUrl}/`);
}

/** Envía un X-Correlation-Id por petición para rastrearla en los logs del backend. */
export const correlationIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (!esPeticionApi(req, inject(API_BASE_URL)) || req.headers.has(HEADER_CORRELATION_ID)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { [HEADER_CORRELATION_ID]: inject(GENERAR_CORRELATION_ID)() } }));
};

/** Agrega la API key exigida por el backend. */
export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!esPeticionApi(req, inject(API_BASE_URL))) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { [HEADER_API_KEY]: inject(API_KEY) } }));
};

/**
 * Traduce cualquier error HTTP a ApiError y lo muestra en un toast con el código de seguimiento,
 * salvo que la petición indique que la vista presentará el error (SILENCIAR_TOAST_ERROR).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      const apiError = ApiError.desde(error, req.headers.get(HEADER_CORRELATION_ID));
      if (!req.context.get(SILENCIAR_TOAST_ERROR)) {
        toast.error(apiError.titulo, apiError.mensaje, apiError.correlationId);
      }
      return throwError(() => apiError);
    }),
  );
};

/** Orden: el correlationId se asigna primero para que el interceptor de errores lo conozca. */
export const API_INTERCEPTORS = [correlationIdInterceptor, apiKeyInterceptor, errorInterceptor];
