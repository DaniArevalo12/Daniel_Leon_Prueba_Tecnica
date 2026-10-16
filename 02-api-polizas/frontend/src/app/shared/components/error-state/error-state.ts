import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Estado de error de una vista, con opción de reintentar y código de seguimiento. */
@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center" role="alert">
      <p class="text-base font-semibold text-red-900">{{ titulo() }}</p>
      <p class="mt-1 text-sm text-red-800">{{ mensaje() }}</p>
      @if (correlationId()) {
        <p class="mt-2 text-xs text-red-700">
          Código de seguimiento: <code class="select-all font-mono">{{ correlationId() }}</code>
        </p>
      }
      <div class="mt-4 flex justify-center gap-3">
        @if (reintentable()) {
          <button
            type="button"
            class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-red-900 shadow-sm ring-1 ring-red-300 hover:bg-red-100"
            (click)="reintentar.emit()"
          >
            Reintentar
          </button>
        }
        <ng-content />
      </div>
    </div>
  `,
})
export class ErrorState {
  readonly titulo = input('No fue posible cargar la información');
  readonly mensaje = input('');
  readonly correlationId = input<string | null>(null);
  readonly reintentable = input(true);
  readonly reintentar = output();
}
