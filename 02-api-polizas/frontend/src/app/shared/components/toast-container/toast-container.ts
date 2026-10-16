import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService, TipoToast } from '../../services/toast.service';

const ESTILOS: Record<TipoToast, string> = {
  exito: 'border-primario-600 bg-primario-50 text-primario-900',
  info: 'border-sky-600 bg-sky-50 text-sky-900',
  error: 'border-red-600 bg-red-50 text-red-900',
};

/**
 * Notificaciones flotantes. Los errores usan role="alert" para que el lector de pantalla
 * los anuncie de inmediato; los demás se anuncian de forma no intrusiva (aria-live="polite").
 */
@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 p-4 sm:items-end"
      aria-live="polite"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto w-full max-w-sm rounded-lg border-l-4 p-4 shadow-lg {{ estilos[toast.tipo] }}"
          [attr.role]="toast.tipo === 'error' ? 'alert' : 'status'"
          data-testid="toast"
        >
          <div class="flex items-start gap-3">
            <div class="flex-1">
              <p class="font-semibold">{{ toast.titulo }}</p>
              <p class="mt-1 text-sm">{{ toast.mensaje }}</p>
              @if (toast.correlationId) {
                <p class="mt-2 text-xs opacity-80">
                  Código de seguimiento:
                  <code class="select-all font-mono" data-testid="toast-correlation-id">{{ toast.correlationId }}</code>
                </p>
              }
            </div>
            <button
              type="button"
              class="rounded p-1 text-lg leading-none opacity-70 hover:opacity-100"
              aria-label="Cerrar notificación"
              (click)="toastService.cerrar(toast.id)"
            >
              &times;
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);
  protected readonly estilos = ESTILOS;
}
