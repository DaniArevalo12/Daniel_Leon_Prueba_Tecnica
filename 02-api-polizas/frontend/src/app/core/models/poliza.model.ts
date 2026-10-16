/**
 * Contratos del backend (PolizaResponse, CrearPolizaRequest y CrearRiesgoRequest).
 * Los nombres de campos y los valores de los enums coinciden exactamente con la API.
 */

export const TIPOS_POLIZA = ['INDIVIDUAL', 'COLECTIVA'] as const;
export type TipoPoliza = (typeof TIPOS_POLIZA)[number];

export const ESTADOS_POLIZA = ['ACTIVA', 'RENOVADA', 'CANCELADA'] as const;
export type EstadoPoliza = (typeof ESTADOS_POLIZA)[number];

export const ESTADOS_RIESGO = ['ACTIVO', 'CANCELADO'] as const;
export type EstadoRiesgo = (typeof ESTADOS_RIESGO)[number];

/** Fecha sin hora ni zona (LocalDate en el backend), formato ISO yyyy-MM-dd. */
export type FechaIso = string;

/** Fecha y hora sin zona (LocalDateTime en el backend). */
export type FechaHoraIso = string;

export interface Poliza {
  id: number;
  numero: string;
  tipo: TipoPoliza;
  estado: EstadoPoliza;
  tomador: string;
  fechaInicioVigencia: FechaIso;
  fechaFinVigencia: FechaIso;
  mesesVigencia: number;
  valorCanon: number;
  valorPrima: number;
  version: number;
  fechaCreacion: FechaHoraIso;
  fechaActualizacion: FechaHoraIso;
}

export interface Riesgo {
  id: number;
  polizaId: number;
  direccionInmueble: string;
  arrendatario: string;
  arrendador: string;
  estado: EstadoRiesgo;
  fechaCreacion: FechaHoraIso;
  fechaActualizacion: FechaHoraIso;
}

export interface CrearRiesgoRequest {
  direccionInmueble: string;
  arrendatario: string;
  arrendador: string;
}

export interface CrearPolizaRequest {
  tipo: TipoPoliza;
  tomador: string;
  fechaInicioVigencia: FechaIso;
  mesesVigencia: number;
  valorCanon: number;
  riesgos: CrearRiesgoRequest[];
}

export interface FiltrosPoliza {
  tipo?: TipoPoliza | null;
  estado?: EstadoPoliza | null;
}

export interface ParametrosRenovacion {
  /** Fracción: 0.052 = 5,2 %. */
  ipc: number;
}
