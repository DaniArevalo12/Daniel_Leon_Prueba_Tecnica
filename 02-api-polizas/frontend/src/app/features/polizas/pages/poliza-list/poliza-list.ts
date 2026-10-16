import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { FiltrosPoliza } from '../../../../core/models/poliza.model';
import { PolizasService } from '../../../../core/services/polizas.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Spinner } from '../../../../shared/components/spinner/spinner';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { FechaLocalPipe } from '../../../../shared/pipes/fecha-local.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { Carga, conEstadoDeCarga } from '../../../../shared/util/carga';
import { PolizaFiltros } from '../../components/poliza-filtros/poliza-filtros';
import { ETIQUETAS_TIPO, aEstadoPoliza, aTipoPoliza } from '../../polizas.etiquetas';

@Component({
  selector: 'app-poliza-list',
  imports: [RouterLink, PolizaFiltros, StatusBadge, Spinner, EmptyState, ErrorState, MonedaPipe, FechaLocalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Pólizas</h1>
          <p class="text-sm text-gray-600">Consulte y gestione las pólizas de arrendamiento.</p>
        </div>
        <app-poliza-filtros [tipo]="filtros().tipo ?? null" [estado]="filtros().estado ?? null" (cambio)="filtrar($event)" />
      </div>

      @switch (carga().estado) {
        @case ('cargando') {
          <div class="flex justify-center py-12 text-primario-700">
            <app-spinner texto="Cargando pólizas…" [textoVisible]="true" />
          </div>
        }
        @case ('error') {
          <app-error-state
            [mensaje]="errorMensaje()"
            [correlationId]="errorCorrelationId()"
            (reintentar)="recargar()"
          />
        }
        @case ('listo') {
          @if (polizas().length === 0) {
            @if (hayFiltros()) {
              <app-empty-state titulo="Sin resultados" mensaje="No hay pólizas que coincidan con los filtros seleccionados.">
                <button type="button" class="rounded-md bg-white px-4 py-2 text-sm font-semibold ring-1 ring-gray-300 hover:bg-gray-50" (click)="filtrar({})">
                  Limpiar filtros
                </button>
              </app-empty-state>
            } @else {
              <app-empty-state titulo="Aún no hay pólizas" mensaje="Cree la primera póliza para comenzar.">
                <a routerLink="/polizas/nueva" class="rounded-md bg-primario-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primario-800">
                  Crear póliza
                </a>
              </app-empty-state>
            }
          } @else {
            <p class="text-sm text-gray-600" aria-live="polite">
              {{ polizas().length }} {{ polizas().length === 1 ? 'póliza' : 'pólizas' }}
            </p>
            <div class="overflow-x-auto rounded-lg bg-white shadow ring-1 ring-gray-200">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <caption class="sr-only">Listado de pólizas</caption>
                <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <tr>
                    <th scope="col" class="px-4 py-3">Número</th>
                    <th scope="col" class="hidden px-4 py-3 sm:table-cell">Tipo</th>
                    <th scope="col" class="hidden px-4 py-3 md:table-cell">Tomador</th>
                    <th scope="col" class="hidden px-4 py-3 lg:table-cell">Vigencia</th>
                    <th scope="col" class="hidden px-4 py-3 text-right sm:table-cell">Canon</th>
                    <th scope="col" class="px-4 py-3 text-right">Prima</th>
                    <th scope="col" class="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (poliza of polizas(); track poliza.id) {
                    <tr class="hover:bg-primario-50/50" data-testid="fila-poliza">
                      <td class="whitespace-nowrap px-4 py-3 font-medium">
                        <a [routerLink]="['/polizas', poliza.id]" class="text-primario-800 underline-offset-2 hover:underline">
                          {{ poliza.numero }}
                        </a>
                        <span class="block text-xs font-normal text-gray-600 sm:hidden">{{ etiquetasTipo[poliza.tipo] }}</span>
                      </td>
                      <td class="hidden px-4 py-3 sm:table-cell">{{ etiquetasTipo[poliza.tipo] }}</td>
                      <td class="hidden px-4 py-3 md:table-cell">{{ poliza.tomador }}</td>
                      <td class="hidden whitespace-nowrap px-4 py-3 lg:table-cell">
                        {{ poliza.fechaInicioVigencia | fechaLocal }} – {{ poliza.fechaFinVigencia | fechaLocal }}
                      </td>
                      <td class="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums sm:table-cell">{{ poliza.valorCanon | moneda }}</td>
                      <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums">{{ poliza.valorPrima | moneda }}</td>
                      <td class="whitespace-nowrap px-4 py-3"><app-status-badge [estado]="poliza.estado" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </div>
  `,
})
export class PolizaList {
  private readonly polizasService = inject(PolizasService);
  private readonly router = inject(Router);

  /** Query params de la URL (?tipo=&estado=), enlazados por withComponentInputBinding. */
  readonly tipo = input<string>();
  readonly estado = input<string>();

  private readonly intento = signal(0);

  protected readonly filtros = computed<FiltrosPoliza>(() => ({
    tipo: aTipoPoliza(this.tipo()),
    estado: aEstadoPoliza(this.estado()),
  }));
  protected readonly hayFiltros = computed(() => !!(this.filtros().tipo || this.filtros().estado));
  protected readonly etiquetasTipo = ETIQUETAS_TIPO;

  /** Cada cambio de filtros (o reintento) cancela la consulta anterior y lanza una nueva. */
  protected readonly carga = toSignal(
    toObservable(computed(() => ({ filtros: this.filtros(), intento: this.intento() }))).pipe(
      switchMap(({ filtros }) => this.polizasService.listar(filtros).pipe(conEstadoDeCarga())),
    ),
    { initialValue: { estado: 'cargando' } as Carga<never> },
  );

  protected readonly polizas = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.datos : [];
  });
  protected readonly errorMensaje = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error.mensaje : '';
  });
  protected readonly errorCorrelationId = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error.correlationId : null;
  });

  protected filtrar(filtros: FiltrosPoliza): void {
    this.router.navigate([], {
      queryParams: { tipo: filtros.tipo ?? null, estado: filtros.estado ?? null },
      queryParamsHandling: 'merge',
    });
  }

  protected recargar(): void {
    this.intento.update((n) => n + 1);
  }
}
