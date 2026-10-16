import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import {
  ESTADOS_POLIZA,
  EstadoPoliza,
  FiltrosPoliza,
  TIPOS_POLIZA,
  TipoPoliza,
} from '../../../../core/models/poliza.model';
import { ETIQUETAS_ESTADO_POLIZA, ETIQUETAS_TIPO, aEstadoPoliza, aTipoPoliza } from '../../polizas.etiquetas';

/** Filtros por tipo y estado. Componente presentacional: el estado vive en la URL (lo maneja la página). */
@Component({
  selector: 'app-poliza-filtros',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="grid grid-cols-2 gap-3 sm:flex sm:items-end" role="search" aria-label="Filtrar pólizas" (submit)="$event.preventDefault()">
      <div class="flex flex-col gap-1">
        <label for="filtro-tipo" class="text-sm font-medium text-gray-700">Tipo</label>
        <select
          id="filtro-tipo"
          class="w-full rounded-md border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-gray-300 sm:w-auto"
          (change)="cambiarTipo($any($event.target).value)"
        >
          <option value="" [selected]="!tipo()">Todos</option>
          @for (t of tipos; track t) {
            <option [value]="t" [selected]="t === tipo()">{{ etiquetasTipo[t] }}</option>
          }
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="filtro-estado" class="text-sm font-medium text-gray-700">Estado</label>
        <select
          id="filtro-estado"
          class="w-full rounded-md border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-gray-300 sm:w-auto"
          (change)="cambiarEstado($any($event.target).value)"
        >
          <option value="" [selected]="!estado()">Todos</option>
          @for (e of estados; track e) {
            <option [value]="e" [selected]="e === estado()">{{ etiquetasEstado[e] }}</option>
          }
        </select>
      </div>
      @if (tipo() || estado()) {
        <button
          type="button"
          class="col-span-2 rounded-md px-3 py-2 text-sm font-medium text-primario-800 hover:bg-primario-50"
          (click)="cambio.emit({ tipo: null, estado: null })"
        >
          Limpiar filtros
        </button>
      }
    </form>
  `,
})
export class PolizaFiltros {
  readonly tipo = input<TipoPoliza | null>(null);
  readonly estado = input<EstadoPoliza | null>(null);
  readonly cambio = output<FiltrosPoliza>();

  protected readonly tipos = TIPOS_POLIZA;
  protected readonly estados = ESTADOS_POLIZA;
  protected readonly etiquetasTipo = ETIQUETAS_TIPO;
  protected readonly etiquetasEstado = ETIQUETAS_ESTADO_POLIZA;

  protected cambiarTipo(valor: string): void {
    this.cambio.emit({ tipo: aTipoPoliza(valor), estado: this.estado() });
  }

  protected cambiarEstado(valor: string): void {
    this.cambio.emit({ tipo: this.tipo(), estado: aEstadoPoliza(valor) });
  }
}
