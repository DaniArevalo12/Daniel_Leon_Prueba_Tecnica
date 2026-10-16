import { Injectable, signal } from '@angular/core';

export type TipoToast = 'exito' | 'error' | 'info';

export interface Toast {
  id: number;
  tipo: TipoToast;
  titulo: string;
  mensaje: string;
  /** Código de seguimiento para soporte (correlationId del backend). */
  correlationId?: string | null;
}

/** Los errores permanecen más tiempo: el usuario puede necesitar copiar el código de seguimiento. */
const DURACION_MS: Record<TipoToast, number> = { exito: 4000, info: 5000, error: 10000 };

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  private siguienteId = 1;

  readonly toasts = this._toasts.asReadonly();

  exito(titulo: string, mensaje: string): void {
    this.mostrar({ tipo: 'exito', titulo, mensaje });
  }

  info(titulo: string, mensaje: string): void {
    this.mostrar({ tipo: 'info', titulo, mensaje });
  }

  error(titulo: string, mensaje: string, correlationId?: string | null): void {
    this.mostrar({ tipo: 'error', titulo, mensaje, correlationId });
  }

  cerrar(id: number): void {
    this._toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  private mostrar(toast: Omit<Toast, 'id'>): void {
    const id = this.siguienteId++;
    this._toasts.update((toasts) => [...toasts, { ...toast, id }]);
    setTimeout(() => this.cerrar(id), DURACION_MS[toast.tipo]);
  }
}
