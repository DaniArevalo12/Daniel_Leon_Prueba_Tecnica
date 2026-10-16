import { HttpContext, HttpContextToken } from '@angular/common/http';
import { InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

/** URL base de la API. Token inyectable para poder sustituirla en pruebas. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});

/** API key enviada en cada petición (ver advertencia en environment.ts). */
export const API_KEY = new InjectionToken<string>('API_KEY', {
  providedIn: 'root',
  factory: () => environment.apiKey,
});

/**
 * Marca una petición cuyo error lo presenta la propia vista (p. ej. un 404 en el detalle
 * se muestra como estado "no encontrada"), para que el interceptor no duplique el aviso con un toast.
 */
export const SILENCIAR_TOAST_ERROR = new HttpContextToken<boolean>(() => false);

export function sinToastDeError(): HttpContext {
  return new HttpContext().set(SILENCIAR_TOAST_ERROR, true);
}
