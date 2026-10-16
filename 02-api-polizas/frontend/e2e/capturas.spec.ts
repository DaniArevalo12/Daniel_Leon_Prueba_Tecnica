import { Page, expect, test } from '@playwright/test';
import path from 'node:path';

import { cancelarPolizaPorApi, diligenciarDatosPoliza, diligenciarRiesgo } from './utilidades';

/**
 * Regenera las capturas del README (docs/capturas/). Usa los datos semilla de Flyway,
 * así que debe ejecutarse sobre un backend recién iniciado:
 *   npm run e2e:capturas
 */

const DESTINO = path.join(__dirname, '..', 'docs', 'capturas');

async function capturar(page: Page, nombre: string, paginaCompleta = false): Promise<void> {
  await page.screenshot({ path: path.join(DESTINO, `${nombre}.png`), fullPage: paginaCompleta });
}

test.describe.configure({ mode: 'serial' });

test('01 listado', async ({ page }) => {
  await page.goto('/polizas');
  await expect(page.getByTestId('fila-poliza')).toHaveCount(8);
  await capturar(page, '01-listado');
});

test('02 detalle', async ({ page }) => {
  await page.goto('/polizas/4');
  await expect(page.getByTestId('fila-riesgo')).toHaveCount(3);
  await capturar(page, '02-detalle');
});

test('03 creación colectiva', async ({ page }) => {
  await page.goto('/polizas/nueva');
  await page.getByRole('radio', { name: /Colectiva/ }).check();
  await diligenciarDatosPoliza(page, { canon: '3200000', meses: '12' });
  await page.getByLabel('Tomador').fill('Administraciones del Caribe Ltda.');
  await page.getByRole('button', { name: '+ Agregar riesgo' }).click();
  await diligenciarRiesgo(page, 1, {
    direccionInmueble: 'Calle 84 # 51B-20 Local 5, Barranquilla',
    arrendatario: 'Panadería La Esquina S.A.S.',
    arrendador: 'Administraciones del Caribe Ltda.',
  });
  await diligenciarRiesgo(page, 2, {
    direccionInmueble: 'Carrera 53 # 76-115 Apto 1002, Barranquilla',
    arrendatario: 'Valeria Montoya',
    arrendador: 'Administraciones del Caribe Ltda.',
  });
  await expect(page.getByTestId('prima-estimada')).toHaveText(/38\.400\.000/);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await capturar(page, '03-creacion-colectiva', true);
});

test('04 renovación', async ({ page }) => {
  await page.goto('/polizas/8');
  await page.getByTestId('accion-renovar').click();
  await page.getByRole('dialog', { name: 'Renovar póliza POL-000008' }).getByRole('button', { name: 'Renovar' }).click();
  await expect(page.getByRole('dialog', { name: 'Póliza renovada' })).toBeVisible();
  await capturar(page, '04-renovacion');
});

test('05 error 409', async ({ page, request }) => {
  await page.goto('/polizas/1');
  await expect(page.getByTestId('accion-renovar')).toBeEnabled();
  await cancelarPolizaPorApi(request, 1);
  await page.getByTestId('accion-renovar').click();
  await page.getByRole('dialog', { name: 'Renovar póliza POL-000001' }).getByRole('button', { name: 'Renovar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Operación no permitida' })).toBeVisible();
  await capturar(page, '05-error-409');
});
