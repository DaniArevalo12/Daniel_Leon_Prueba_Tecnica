import { PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';

import { Poliza } from '../../../../core/models/poliza.model';
import { ParametrosService } from '../../../../core/services/parametros.service';
import { PolizasService } from '../../../../core/services/polizas.service';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Spinner } from '../../../../shared/components/spinner/spinner';
import { FechaLocalPipe } from '../../../../shared/pipes/fecha-local.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';

type Paso =
  | { readonly tipo: 'confirmar' }
  | { readonly tipo: 'resultado'; readonly anterior: Poliza; readonly renovada: Poliza };

/**
 * Renovación en dos pasos:
 *  1. Confirmar, mostrando el IPC vigente consultado al backend (única fuente de verdad).
 *  2. Resultado: canon y prima anteriores frente a los nuevos devueltos por el backend.
 */
@Component({
  selector: 'app-renovacion-dialog',
  imports: [ConfirmDialog, Spinner, MonedaPipe, FechaLocalPipe, PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (paso().tipo) {
      @case ('confirmar') {
        <app-confirm-dialog
          [abierto]="abierto()"
          [titulo]="'Renovar póliza ' + poliza().numero"
          textoConfirmar="Renovar"
          textoCancelar="Volver"
          [procesando]="procesando()"
          [confirmarDeshabilitado]="ipc() === null"
          (confirmar)="renovar()"
          (cancelar)="cerrar()"
        >
          @if (cargandoIpc()) {
            <app-spinner texto="Consultando IPC vigente…" [textoVisible]="true" />
          } @else if (ipc() === null) {
            <p class="text-red-800" role="alert">No fue posible consultar el IPC vigente. Cierre e intente de nuevo.</p>
          } @else {
            <p>
              Se aplicará un IPC de
              <strong class="text-primario-800" data-testid="ipc">{{ ipc() | percent: '1.2-2' }}</strong>
              al canon mensual y se recalculará la prima para una nueva vigencia de {{ poliza().mesesVigencia }} meses.
            </p>
            <p class="mt-2 text-gray-600">Canon actual: <span class="font-medium tabular-nums">{{ poliza().valorCanon | moneda }}</span></p>
          }
        </app-confirm-dialog>
      }
      @case ('resultado') {
        @if (resultado(); as r) {
          <app-confirm-dialog
            [abierto]="abierto()"
            titulo="Póliza renovada"
            textoConfirmar="Entendido"
            [mostrarCancelar]="false"
            (confirmar)="cerrar()"
            (cancelar)="cerrar()"
          >
            <p>
              La póliza {{ r.renovada.numero }} quedó vigente del
              {{ r.renovada.fechaInicioVigencia | fechaLocal }} al {{ r.renovada.fechaFinVigencia | fechaLocal }}.
            </p>
            <table class="mt-4 w-full text-sm" data-testid="comparacion-renovacion">
              <caption class="sr-only">Valores antes y después de la renovación</caption>
              <thead class="text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" class="py-2"><span class="sr-only">Concepto</span></th>
                  <th scope="col" class="py-2 text-right">Anterior</th>
                  <th scope="col" class="py-2 text-right">Nuevo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 tabular-nums">
                <tr>
                  <th scope="row" class="py-2 text-left font-medium">Canon mensual</th>
                  <td class="py-2 text-right text-gray-600">{{ r.anterior.valorCanon | moneda }}</td>
                  <td class="py-2 text-right font-semibold text-primario-800">{{ r.renovada.valorCanon | moneda }}</td>
                </tr>
                <tr>
                  <th scope="row" class="py-2 text-left font-medium">Prima</th>
                  <td class="py-2 text-right text-gray-600">{{ r.anterior.valorPrima | moneda }}</td>
                  <td class="py-2 text-right font-semibold text-primario-800">{{ r.renovada.valorPrima | moneda }}</td>
                </tr>
              </tbody>
            </table>
          </app-confirm-dialog>
        }
      }
    }
  `,
})
export class RenovacionDialog {
  private readonly polizasService = inject(PolizasService);
  private readonly parametrosService = inject(ParametrosService);

  readonly poliza = input.required<Poliza>();
  readonly abierto = input.required<boolean>();
  /** Se emite al terminar (renovada o no) para que la página cierre el diálogo. */
  readonly cerrado = output();
  /** Se emite en cuanto el backend confirma la renovación, para que la página se actualice. */
  readonly renovada = output<Poliza>();
  /** El backend rechazó la renovación (p. ej. 409): la página debe recargar el estado real. */
  readonly rechazada = output();

  protected readonly paso = signal<Paso>({ tipo: 'confirmar' });
  protected readonly ipc = signal<number | null>(null);
  protected readonly cargandoIpc = signal(false);
  protected readonly procesando = signal(false);

  protected readonly resultado = computed(() => {
    const paso = this.paso();
    return paso.tipo === 'resultado' ? paso : null;
  });

  constructor() {
    // Cada vez que se abre, se reinicia el flujo y se consulta el IPC vigente
    effect(() => {
      if (this.abierto()) {
        untracked(() => this.iniciar());
      }
    });
  }

  protected renovar(): void {
    const anterior = this.poliza();
    this.procesando.set(true);
    this.polizasService.renovar(anterior.id).subscribe({
      next: (renovada) => {
        this.procesando.set(false);
        this.paso.set({ tipo: 'resultado', anterior, renovada });
        this.renovada.emit(renovada);
      },
      error: () => {
        // El toast con el detalle (p. ej. 409 si la póliza fue cancelada) lo muestra el interceptor
        this.procesando.set(false);
        this.rechazada.emit();
        this.cerrar();
      },
    });
  }

  protected cerrar(): void {
    this.cerrado.emit();
  }

  private iniciar(): void {
    this.paso.set({ tipo: 'confirmar' });
    this.ipc.set(null);
    this.cargandoIpc.set(true);
    this.parametrosService.renovacion().subscribe({
      next: ({ ipc }) => {
        this.ipc.set(ipc);
        this.cargandoIpc.set(false);
      },
      error: () => this.cargandoIpc.set(false),
    });
  }
}
