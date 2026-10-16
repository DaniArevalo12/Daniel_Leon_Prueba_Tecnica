import { APIRequestContext, Locator, Page, expect } from '@playwright/test';

/**
 * Helpers de las pruebas e2e. Los datos de partida se crean por API para que cada prueba
 * sea independiente y repetible sin reiniciar el backend.
 */

const CABECERAS = { 'x-api-key': '123456' };

export interface PolizaCreada {
  id: number;
  numero: string;
}

interface DatosRiesgo {
  direccionInmueble: string;
  arrendatario: string;
  arrendador: string;
}

export function unRiesgo(n = 1): DatosRiesgo {
  return {
    direccionInmueble: `Carrera ${10 + n} # ${20 + n}-${30 + n} Apto ${100 + n}, Bogotá`,
    arrendatario: `Arrendatario E2E ${n}`,
    arrendador: 'Inmobiliaria E2E S.A.S.',
  };
}

export async function crearPolizaPorApi(
  request: APIRequestContext,
  datos: { tipo: 'INDIVIDUAL' | 'COLECTIVA'; valorCanon?: number; mesesVigencia?: number; riesgos?: DatosRiesgo[] },
): Promise<PolizaCreada> {
  const respuesta = await request.post('/api/polizas', {
    headers: CABECERAS,
    data: {
      tipo: datos.tipo,
      tomador: 'Tomador E2E S.A.S.',
      fechaInicioVigencia: '2026-11-01',
      mesesVigencia: datos.mesesVigencia ?? 12,
      valorCanon: datos.valorCanon ?? 1000000,
      riesgos: datos.riesgos ?? (datos.tipo === 'INDIVIDUAL' ? [unRiesgo()] : []),
    },
  });
  expect(respuesta.status(), await respuesta.text()).toBe(201);
  return respuesta.json();
}

export async function cancelarPolizaPorApi(request: APIRequestContext, id: number): Promise<void> {
  const respuesta = await request.post(`/api/polizas/${id}/cancelar`, { headers: CABECERAS });
  expect(respuesta.status()).toBe(200);
}

/** Diligencia los campos de un riesgo dentro de su fieldset ("Riesgo 1", "Riesgo 2"...). */
export async function diligenciarRiesgo(contenedor: Page | Locator, indice: number, datos: DatosRiesgo): Promise<void> {
  const grupo = contenedor.getByRole('group', { name: `Riesgo ${indice}` });
  await grupo.getByLabel('Dirección del inmueble').fill(datos.direccionInmueble);
  await grupo.getByLabel('Arrendatario').fill(datos.arrendatario);
  await grupo.getByLabel('Arrendador (beneficiario)').fill(datos.arrendador);
}

export async function diligenciarDatosPoliza(page: Page, datos: { canon: string; meses: string }): Promise<void> {
  await page.getByLabel('Tomador').fill('Administraciones E2E Ltda.');
  await page.getByLabel('Inicio de vigencia').fill('2026-11-01');
  await page.getByLabel('Meses de vigencia').fill(datos.meses);
  await page.getByLabel('Canon mensual (COP)').fill(datos.canon);
}

/** Normaliza espacios (el locale es-CO usa espacio no separable entre "$" y la cifra). */
export function sinEspaciosEspeciales(texto: string | null): string {
  return (texto ?? '').replace(/\s+/g, ' ').trim();
}

/** Badge de estado de la póliza en el encabezado del detalle. */
export function estadoPoliza(page: Page): Locator {
  return page.locator('article header [data-estado]');
}
