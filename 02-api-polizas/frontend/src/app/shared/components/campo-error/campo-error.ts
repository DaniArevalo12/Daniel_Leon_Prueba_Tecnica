import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { startWith, switchMap } from 'rxjs';

/**
 * Muestra el primer error de un control una vez que el usuario lo tocó.
 * Se suscribe a `control.events` (API unificada de Angular) para reaccionar a cambios de valor,
 * de estado y de "touched", incluidos los errores asignados desde el servidor.
 */
@Component({
  selector: 'app-campo-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mensaje()) {
      <p class="mt-1 text-sm text-red-700" [id]="idError()">{{ mensaje() }}</p>
    }
  `,
})
export class CampoError {
  readonly control = input.required<AbstractControl>();
  /** id del mensaje, para enlazarlo desde el campo con aria-describedby. */
  readonly idError = input.required<string>();

  private readonly cambios = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control.events.pipe(startWith(null)))),
  );

  protected readonly mensaje = computed(() => {
    this.cambios();
    const control = this.control();
    return control.touched && control.errors ? mensajeDeError(control.errors) : null;
  });
}

export function mensajeDeError(errores: ValidationErrors): string {
  if (errores['servidor']) {
    return errores['servidor'];
  }
  if (errores['required']) {
    return 'Este campo es obligatorio.';
  }
  if (errores['maxlength']) {
    return `Máximo ${errores['maxlength'].requiredLength} caracteres.`;
  }
  if (errores['min']) {
    return `Debe ser mayor o igual a ${errores['min'].min}.`;
  }
  if (errores['max']) {
    return `Debe ser menor o igual a ${errores['max'].max}.`;
  }
  if (errores['maxDecimales']) {
    return `Máximo ${errores['maxDecimales'].maximo} decimales.`;
  }
  if (errores['entero']) {
    return 'Debe ser un número entero.';
  }
  return 'Valor inválido.';
}
