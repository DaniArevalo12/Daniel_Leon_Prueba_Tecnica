import { HttpErrorResponse } from '@angular/common/http';

import { ProblemDetail } from '../models/problem-detail.model';

export const HEADER_CORRELATION_ID = 'X-Correlation-Id';

/**
 * Error de la API ya traducido para la interfaz. Las vistas trabajan con este tipo
 * en lugar de inspeccionar HttpErrorResponse o el ProblemDetail crudo.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly titulo: string,
    readonly mensaje: string,
    readonly correlationId: string | null,
    /** Errores de validación por campo (solo en 400). */
    readonly erroresCampos: Readonly<Record<string, string>> = {},
  ) {
    super(mensaje);
    this.name = 'ApiError';
  }

  static desde(error: HttpErrorResponse, correlationIdEnviado: string | null): ApiError {
    const problema = esProblemDetail(error.error) ? error.error : {};
    const correlationId =
      problema.correlationId ?? error.headers?.get(HEADER_CORRELATION_ID) ?? correlationIdEnviado;
    const { titulo, mensaje } = traducir(error.status, problema);
    return new ApiError(error.status, titulo, mensaje, correlationId, problema.errores ?? {});
  }
}

function esProblemDetail(cuerpo: unknown): cuerpo is ProblemDetail {
  return typeof cuerpo === 'object' && cuerpo !== null && ('status' in cuerpo || 'detail' in cuerpo);
}

/**
 * Traduce el código HTTP a un mensaje para el usuario. Para 404, 409 y 422 se usa el `detail`
 * del backend, que ya viene en español y explica la regla de negocio concreta.
 */
function traducir(status: number, problema: ProblemDetail): { titulo: string; mensaje: string } {
  switch (status) {
    case 0:
      return {
        titulo: 'Sin conexión',
        mensaje: 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.',
      };
    case 400:
      return {
        titulo: 'Datos inválidos',
        mensaje: problema.errores
          ? 'Revise los campos marcados en el formulario.'
          : (problema.detail ?? 'La solicitud no es válida.'),
      };
    case 401:
      return {
        titulo: 'No autorizado',
        mensaje: 'La aplicación no está autorizada para usar la API. Verifique la API key configurada.',
      };
    case 404:
      return { titulo: 'No encontrado', mensaje: problema.detail ?? 'El recurso solicitado no existe.' };
    case 409:
      return {
        titulo: 'Operación no permitida',
        mensaje: problema.detail ?? 'La operación no es posible en el estado actual. Actualice la página.',
      };
    case 422:
      return {
        titulo: 'Regla de negocio',
        mensaje: problema.detail ?? 'La operación no cumple las reglas de negocio.',
      };
    default:
      return status >= 500
        ? {
            titulo: 'Error del servidor',
            mensaje: 'Ocurrió un error inesperado. Si persiste, reporte el código de seguimiento.',
          }
        : { titulo: 'Error', mensaje: problema.detail ?? 'Ocurrió un error inesperado.' };
  }
}
