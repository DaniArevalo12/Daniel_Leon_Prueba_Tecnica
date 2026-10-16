import { expect, test } from '@playwright/test';

import {
  estadoPoliza,
  cancelarPolizaPorApi,
  crearPolizaPorApi,
  diligenciarDatosPoliza,
  diligenciarRiesgo,
  unRiesgo,
} from './utilidades';

/**
 * Flujos funcionales completos contra el backend real.
 * Cada prueba crea sus propias pólizas, por lo que se puede ejecutar varias veces seguidas.
 */

test.describe('Listado', () => {
  test('filtra por tipo y estado desde la URL', async ({ page }) => {
    await page.goto('/polizas');
    await expect(page.getByRole('heading', { name: 'Pólizas', level: 1 })).toBeVisible();
    await expect(page.getByTestId('fila-poliza').first()).toBeVisible();

    await page.getByLabel('Tipo').selectOption('COLECTIVA');
    await expect(page).toHaveURL(/tipo=COLECTIVA/);
    await page.getByLabel('Estado').selectOption('CANCELADA');
    await expect(page).toHaveURL(/estado=CANCELADA/);

    const filas = page.getByTestId('fila-poliza');
    await expect(filas.first()).toBeVisible();
    for (const fila of await filas.all()) {
      await expect(fila).toContainText('Colectiva');
      await expect(fila).toContainText('Cancelada');
    }

    await page.getByRole('button', { name: 'Limpiar filtros' }).first().click();
    await expect(page).not.toHaveURL(/tipo=/);
  });
});

test.describe('Creación', () => {
  test('crea una póliza INDIVIDUAL con exactamente un riesgo', async ({ page }) => {
    await page.goto('/polizas/nueva');
    await expect(page.getByRole('radio', { name: /Individual/ })).toBeChecked();
    await expect(page.getByRole('button', { name: '+ Agregar riesgo' })).toHaveCount(0);

    await diligenciarDatosPoliza(page, { canon: '1800000', meses: '12' });
    await expect(page.getByTestId('prima-estimada')).toHaveText(/21\.600\.000/);
    await diligenciarRiesgo(page, 1, unRiesgo(1));
    await page.getByRole('button', { name: 'Crear póliza' }).click();

    await expect(page).toHaveURL(/\/polizas\/\d+$/);
    await expect(page.getByRole('status').filter({ hasText: 'Póliza creada' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Póliza POL-\d{6}/);
    await expect(page.getByTestId('prima')).toHaveText(/21\.600\.000/);
    // timezone America/Bogota: el 1 de noviembre no debe mostrarse como 31 de octubre
    await expect(page.getByTestId('vigencia')).toContainText('1 nov 2026 – 1 nov 2027');
    await expect(page.getByTestId('fila-riesgo')).toHaveCount(1);
    await expect(page.getByTestId('accion-agregar-riesgo')).toHaveCount(0);
  });

  test('crea una póliza COLECTIVA con varios riesgos', async ({ page }) => {
    await page.goto('/polizas/nueva');
    await page.getByRole('radio', { name: /Colectiva/ }).check();
    await diligenciarDatosPoliza(page, { canon: '2500000', meses: '6' });
    await page.getByRole('button', { name: '+ Agregar riesgo' }).click();
    await diligenciarRiesgo(page, 1, unRiesgo(1));
    await diligenciarRiesgo(page, 2, unRiesgo(2));
    await page.getByRole('button', { name: 'Crear póliza' }).click();

    await expect(page).toHaveURL(/\/polizas\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Riesgos (2)' })).toBeVisible();
    await expect(page.getByTestId('prima')).toHaveText(/15\.000\.000/);
  });

  test('muestra los errores de validación sin llamar al backend', async ({ page }) => {
    await page.goto('/polizas/nueva');
    await page.getByRole('button', { name: 'Crear póliza' }).click();

    await expect(page).toHaveURL(/\/polizas\/nueva$/);
    await expect(page.getByLabel('Tomador')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Tomador')).toBeFocused();
  });
});

test.describe('Riesgos', () => {
  test('agrega un riesgo a una póliza COLECTIVA', async ({ page, request }) => {
    const poliza = await crearPolizaPorApi(request, { tipo: 'COLECTIVA' });
    await page.goto(`/polizas/${poliza.id}`);
    await expect(page.getByRole('heading', { name: 'Riesgos (0)' })).toBeVisible();

    await page.getByTestId('accion-agregar-riesgo').click();
    const dialogo = page.getByRole('dialog', { name: 'Agregar riesgo' });
    await diligenciarRiesgo(dialogo, 1, unRiesgo(7));
    await dialogo.getByRole('button', { name: 'Agregar riesgo' }).click();

    await expect(dialogo).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: 'Riesgo agregado' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Riesgos (1)' })).toBeVisible();
    await expect(page.getByTestId('fila-riesgo')).toContainText(unRiesgo(7).direccionInmueble);
  });

  test('cancela un riesgo con confirmación sin cambiar el estado de la póliza', async ({ page, request }) => {
    const poliza = await crearPolizaPorApi(request, { tipo: 'COLECTIVA', riesgos: [unRiesgo(1), unRiesgo(2)] });
    await page.goto(`/polizas/${poliza.id}`);

    await page.getByRole('button', { name: `Cancelar riesgo ${unRiesgo(1).direccionInmueble}` }).click();
    const dialogo = page.getByRole('dialog', { name: 'Cancelar riesgo' });
    await expect(dialogo).toContainText(unRiesgo(1).direccionInmueble);
    await dialogo.getByRole('button', { name: 'Sí, cancelar riesgo' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Riesgo cancelado' })).toBeVisible();
    await expect(page.getByTestId('fila-riesgo').first().locator('[data-estado]')).toHaveText('Cancelado');
    await expect(page.getByTestId('fila-riesgo').nth(1).locator('[data-estado]')).toHaveText('Activo');
    await expect(estadoPoliza(page)).toHaveText('Activa');
  });
});

test.describe('Renovación y cancelación', () => {
  test('renueva mostrando el IPC y los valores anteriores frente a los nuevos', async ({ page, request }) => {
    const poliza = await crearPolizaPorApi(request, { tipo: 'INDIVIDUAL', valorCanon: 1000000, mesesVigencia: 12 });
    await page.goto(`/polizas/${poliza.id}`);

    await page.getByTestId('accion-renovar').click();
    const confirmacion = page.getByRole('dialog', { name: `Renovar póliza ${poliza.numero}` });
    await expect(confirmacion.getByTestId('ipc')).toHaveText('5,20%');
    await confirmacion.getByRole('button', { name: 'Renovar' }).click();

    const resultado = page.getByRole('dialog', { name: 'Póliza renovada' });
    const tabla = resultado.getByTestId('comparacion-renovacion');
    await expect(tabla.getByRole('row', { name: /Canon mensual/ })).toContainText(/1\.000\.000.*1\.052\.000/);
    await expect(tabla.getByRole('row', { name: /Prima/ })).toContainText(/12\.000\.000.*12\.624\.000/);
    await expect(resultado).toContainText('1 nov 2027 al 1 nov 2028');
    await resultado.getByRole('button', { name: 'Entendido' }).click();

    await expect(estadoPoliza(page)).toHaveText('Renovada');
    await expect(page.getByTestId('canon')).toHaveText(/1\.052\.000/);
  });

  test('cancela la póliza y todos sus riesgos', async ({ page, request }) => {
    const poliza = await crearPolizaPorApi(request, { tipo: 'COLECTIVA', riesgos: [unRiesgo(1), unRiesgo(2)] });
    await page.goto(`/polizas/${poliza.id}`);

    await page.getByTestId('accion-cancelar').click();
    const dialogo = page.getByRole('dialog', { name: `Cancelar póliza ${poliza.numero}` });
    await expect(dialogo).toContainText('todos sus riesgos activos (2)');
    await dialogo.getByRole('button', { name: 'Sí, cancelar póliza' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Póliza cancelada' })).toBeVisible();
    await expect(estadoPoliza(page)).toHaveText('Cancelada');
    for (const fila of await page.getByTestId('fila-riesgo').all()) {
      await expect(fila.locator('[data-estado]')).toHaveText('Cancelado');
    }
    await expect(page.getByTestId('accion-renovar')).toBeDisabled();
    await expect(page.getByTestId('accion-cancelar')).toHaveCount(0);
    await expect(page.getByTestId('accion-agregar-riesgo')).toHaveCount(0);
  });

  test('renovar una póliza cancelada por otro usuario muestra el error 409 con su código de seguimiento', async ({ page, request }) => {
    const poliza = await crearPolizaPorApi(request, { tipo: 'INDIVIDUAL' });
    await page.goto(`/polizas/${poliza.id}`);
    await expect(page.getByTestId('accion-renovar')).toBeEnabled();

    // Otro usuario cancela la póliza mientras esta pantalla sigue abierta con el estado anterior
    await cancelarPolizaPorApi(request, poliza.id);

    await page.getByTestId('accion-renovar').click();
    await page
      .getByRole('dialog', { name: `Renovar póliza ${poliza.numero}` })
      .getByRole('button', { name: 'Renovar' })
      .click();

    const toast = page.getByRole('alert').filter({ hasText: 'Operación no permitida' });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(`No se puede renovar la póliza ${poliza.numero} porque está cancelada`);
    await expect(toast.getByTestId('toast-correlation-id')).toHaveText(/^[0-9a-f-]{36}$/);

    // La vista se recarga con el estado real
    await expect(estadoPoliza(page)).toHaveText('Cancelada');
    await expect(page.getByTestId('accion-renovar')).toBeDisabled();
  });
});

test('una póliza inexistente muestra "no encontrada"', async ({ page }) => {
  await page.goto('/polizas/999999');
  await expect(page.getByRole('alert')).toContainText('Póliza no encontrada');
});
