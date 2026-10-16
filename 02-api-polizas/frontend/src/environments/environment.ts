/**
 * Configuración de la aplicación.
 *
 * apiUrl es relativa: en desarrollo la atiende el proxy de `ng serve` (proxy.conf.js)
 * y en Docker el proxy de nginx; ambos la reenvían al backend.
 *
 * IMPORTANTE: la API key en el frontend solo es aceptable para esta prueba técnica.
 * Todo lo que viaja en el bundle es público. En producción la autenticación sería
 * OAuth2/OIDC (tokens por usuario) validada en el API Gateway (ver README).
 */
export const environment = {
  apiUrl: '/api',
  apiKey: '123456',
};
