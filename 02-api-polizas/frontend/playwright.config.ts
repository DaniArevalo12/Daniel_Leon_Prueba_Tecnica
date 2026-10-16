import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas end-to-end contra la aplicación y el backend reales (deben estar en ejecución).
 *   npm run e2e            → flujos funcionales
 *   npm run e2e:capturas   → regenera las capturas de docs/capturas/
 */
export default defineConfig({
  testDir: './e2e',
  // Un solo worker: el backend es compartido y la salida queda en orden legible
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4200',
    locale: 'es-CO',
    // Zona horaria de Colombia: valida que las fechas de vigencia no se corran un día
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /capturas\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'capturas',
      testMatch: /capturas\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
});
