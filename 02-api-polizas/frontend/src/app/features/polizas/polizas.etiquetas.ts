import { ESTADOS_POLIZA, EstadoPoliza, TIPOS_POLIZA, TipoPoliza } from '../../core/models/poliza.model';

export const ETIQUETAS_TIPO: Record<TipoPoliza, string> = {
  INDIVIDUAL: 'Individual',
  COLECTIVA: 'Colectiva',
};

export const ETIQUETAS_ESTADO_POLIZA: Record<EstadoPoliza, string> = {
  ACTIVA: 'Activa',
  RENOVADA: 'Renovada',
  CANCELADA: 'Cancelada',
};

/** Valida un valor de la URL: cualquier cosa fuera del enum se ignora en lugar de enviarse al backend. */
export function aTipoPoliza(valor: string | null | undefined): TipoPoliza | null {
  return (TIPOS_POLIZA as readonly string[]).includes(valor ?? '') ? (valor as TipoPoliza) : null;
}

export function aEstadoPoliza(valor: string | null | undefined): EstadoPoliza | null {
  return (ESTADOS_POLIZA as readonly string[]).includes(valor ?? '') ? (valor as EstadoPoliza) : null;
}
