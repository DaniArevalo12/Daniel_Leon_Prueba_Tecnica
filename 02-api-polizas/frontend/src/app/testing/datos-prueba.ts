import { Poliza, Riesgo } from '../core/models/poliza.model';

/** Datos de prueba alineados con el seed de Flyway del backend (póliza 1 y su riesgo). */
export function unaPoliza(cambios: Partial<Poliza> = {}): Poliza {
  return {
    id: 1,
    numero: 'POL-000001',
    tipo: 'INDIVIDUAL',
    estado: 'ACTIVA',
    tomador: 'Inmobiliaria Andina S.A.S.',
    fechaInicioVigencia: '2026-01-01',
    fechaFinVigencia: '2027-01-01',
    mesesVigencia: 12,
    valorCanon: 1500000,
    valorPrima: 18000000,
    version: 0,
    fechaCreacion: '2026-10-15T20:43:29.576',
    fechaActualizacion: '2026-10-15T20:43:29.576',
    ...cambios,
  };
}

export function unRiesgo(cambios: Partial<Riesgo> = {}): Riesgo {
  return {
    id: 1,
    polizaId: 1,
    direccionInmueble: 'Calle 72 # 10-34 Apto 501, Bogotá',
    arrendatario: 'Laura Gómez',
    arrendador: 'Carlos Pérez',
    estado: 'ACTIVO',
    fechaCreacion: '2026-10-15T20:43:29.576',
    fechaActualizacion: '2026-10-15T20:43:29.576',
    ...cambios,
  };
}
