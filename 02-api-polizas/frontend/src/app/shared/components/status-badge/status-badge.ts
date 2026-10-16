import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EstadoPoliza, EstadoRiesgo } from '../../../core/models/poliza.model';

type Estado = EstadoPoliza | EstadoRiesgo;

const ESTILOS: Record<Estado, string> = {
  ACTIVA: 'bg-primario-100 text-primario-900 ring-primario-600/30',
  ACTIVO: 'bg-primario-100 text-primario-900 ring-primario-600/30',
  RENOVADA: 'bg-acento-100 text-amber-900 ring-acento-500/50',
  CANCELADA: 'bg-red-50 text-red-800 ring-red-600/30',
  CANCELADO: 'bg-red-50 text-red-800 ring-red-600/30',
};

const ETIQUETAS: Record<Estado, string> = {
  ACTIVA: 'Activa',
  ACTIVO: 'Activo',
  RENOVADA: 'Renovada',
  CANCELADA: 'Cancelada',
  CANCELADO: 'Cancelado',
};

/** Badge de estado. El estado se comunica con texto, no solo con color (accesibilidad). */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset {{ estilo() }}"
      [attr.data-estado]="estado()"
    >
      <span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
      {{ etiqueta() }}
    </span>
  `,
})
export class StatusBadge {
  readonly estado = input.required<Estado>();

  protected readonly estilo = computed(() => ESTILOS[this.estado()]);
  protected readonly etiqueta = computed(() => ETIQUETAS[this.estado()]);
}
