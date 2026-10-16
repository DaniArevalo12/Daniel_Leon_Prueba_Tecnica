import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

import { Spinner } from '../spinner/spinner';

let siguienteId = 0;

/**
 * Diálogo de confirmación sobre el elemento nativo <dialog> con showModal():
 * el navegador atrapa el foco, inerta el fondo y cierra con Esc, sin librerías adicionales.
 *
 * Es controlado: el padre decide si está abierto (`abierto`) y reacciona a `confirmar` / `cancelar`.
 * Mientras `procesando` es verdadero no se puede cerrar ni confirmar dos veces.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialogo
      class="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 shadow-2xl backdrop:bg-gray-900/50"
      [attr.aria-labelledby]="tituloId"
      (cancel)="alPresionarEscape($event)"
    >
      <div class="p-6">
        <h2 [id]="tituloId" class="text-lg font-semibold text-gray-900">{{ titulo() }}</h2>
        <div class="mt-3 text-sm text-gray-700">
          <ng-content />
        </div>
      </div>
      <div class="flex flex-col-reverse gap-3 rounded-b-xl bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
        @if (mostrarCancelar()) {
          <button
            type="button"
            class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 hover:bg-gray-100 disabled:opacity-50"
            [disabled]="procesando()"
            (click)="cancelar.emit()"
            autofocus
          >
            {{ textoCancelar() }}
          </button>
        }
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          [class]="tono() === 'peligro' ? 'bg-red-700 hover:bg-red-800' : 'bg-primario-700 hover:bg-primario-800'"
          [disabled]="procesando() || confirmarDeshabilitado()"
          (click)="confirmar.emit()"
          data-testid="confirmar"
        >
          @if (procesando()) {
            <app-spinner texto="Procesando…" />
          }
          {{ textoConfirmar() }}
        </button>
      </div>
    </dialog>
  `,
})
export class ConfirmDialog {
  readonly abierto = input.required<boolean>();
  readonly titulo = input.required<string>();
  readonly textoConfirmar = input('Confirmar');
  readonly textoCancelar = input('Cancelar');
  readonly tono = input<'primario' | 'peligro'>('primario');
  readonly procesando = input(false);
  readonly confirmarDeshabilitado = input(false);
  readonly mostrarCancelar = input(true);

  readonly confirmar = output();
  readonly cancelar = output();

  protected readonly tituloId = `confirm-dialog-titulo-${siguienteId++}`;
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    effect(() => {
      const dialogo = this.dialogo().nativeElement;
      if (this.abierto() && !dialogo.open) {
        dialogo.showModal();
      } else if (!this.abierto() && dialogo.open) {
        dialogo.close();
      }
    });
  }

  /** Esc: se trata como "cancelar" para que el estado del padre siga siendo la fuente de verdad. */
  protected alPresionarEscape(evento: Event): void {
    evento.preventDefault();
    if (!this.procesando()) {
      this.cancelar.emit();
    }
  }
}
