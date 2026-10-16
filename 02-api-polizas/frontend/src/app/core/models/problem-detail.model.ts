/**
 * Respuesta de error del backend (RFC 9457 – Problem Details).
 * `errores` solo viene en los 400 de validación: campo → mensaje.
 */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  timestamp?: string;
  correlationId?: string;
  errores?: Record<string, string>;
}
