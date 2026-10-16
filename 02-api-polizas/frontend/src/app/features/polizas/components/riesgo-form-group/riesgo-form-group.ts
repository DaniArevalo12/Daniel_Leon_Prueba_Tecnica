import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith, switchMap } from 'rxjs';

import { CrearRiesgoRequest } from '../../../../core/models/poliza.model';
import { CampoError } from '../../../../shared/components/campo-error/campo-error';
import { requeridoSinEspacios } from '../../../../shared/forms/validadores';

export type RiesgoForm = FormGroup<{
  direccionInmueble: FormControl<string>;
  arrendatario: FormControl<string>;
  arrendador: FormControl<string>;
}>;

/** Mismas restricciones de formato que CrearRiesgoRequest en el backend (@NotBlank, @Size). */
export function crearRiesgoForm(): RiesgoForm {
  return new FormGroup({
    direccionInmueble: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, requeridoSinEspacios, Validators.maxLength(200)],
    }),
    arrendatario: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, requeridoSinEspacios, Validators.maxLength(150)],
    }),
    arrendador: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, requeridoSinEspacios, Validators.maxLength(150)],
    }),
  });
}

export function aRiesgoRequest(form: RiesgoForm): CrearRiesgoRequest {
  const { direccionInmueble, arrendatario, arrendador } = form.getRawValue();
  return { direccionInmueble: direccionInmueble.trim(), arrendatario: arrendatario.trim(), arrendador: arrendador.trim() };
}

let siguienteId = 0;

/** Campos de un riesgo. Presentacional: el FormGroup lo crea y lo dueña el formulario padre. */
@Component({
  selector: 'app-riesgo-form-group',
  imports: [ReactiveFormsModule, CampoError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset [formGroup]="grupo()" class="rounded-lg border border-gray-200 bg-gray-50/60 p-4" data-testid="riesgo-form">
      <legend class="sr-only">{{ titulo() }}</legend>
      <div class="flex min-h-8 items-center justify-between gap-3">
        <p class="text-sm font-semibold text-gray-900" aria-hidden="true">{{ titulo() }}</p>
        @if (removible()) {
          <button type="button" class="rounded-md px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50" (click)="quitar.emit()" [attr.aria-label]="'Quitar ' + titulo()">
            Quitar
          </button>
        }
      </div>
      <div class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="md:col-span-3">
          <label class="etiqueta" [for]="prefijo + '-direccion'">Dirección del inmueble</label>
          <input
            class="campo"
            [id]="prefijo + '-direccion'"
            formControlName="direccionInmueble"
            maxlength="200"
            autocomplete="street-address"
            [attr.aria-invalid]="invalidos().direccionInmueble"
            [attr.aria-describedby]="prefijo + '-direccion-error'"
          />
          <app-campo-error [control]="grupo().controls.direccionInmueble" [idError]="prefijo + '-direccion-error'" />
        </div>
        <div class="md:col-span-1">
          <label class="etiqueta" [for]="prefijo + '-arrendatario'">Arrendatario</label>
          <input
            class="campo"
            [id]="prefijo + '-arrendatario'"
            formControlName="arrendatario"
            maxlength="150"
            autocomplete="off"
            [attr.aria-invalid]="invalidos().arrendatario"
            [attr.aria-describedby]="prefijo + '-arrendatario-error'"
          />
          <app-campo-error [control]="grupo().controls.arrendatario" [idError]="prefijo + '-arrendatario-error'" />
        </div>
        <div class="md:col-span-2">
          <label class="etiqueta" [for]="prefijo + '-arrendador'">Arrendador (beneficiario)</label>
          <input
            class="campo"
            [id]="prefijo + '-arrendador'"
            formControlName="arrendador"
            maxlength="150"
            autocomplete="off"
            [attr.aria-invalid]="invalidos().arrendador"
            [attr.aria-describedby]="prefijo + '-arrendador-error'"
          />
          <app-campo-error [control]="grupo().controls.arrendador" [idError]="prefijo + '-arrendador-error'" />
        </div>
      </div>
    </fieldset>
  `,
})
export class RiesgoFormGroup {
  readonly grupo = input.required<RiesgoForm>();
  readonly indice = input(0);
  readonly removible = input(false);
  readonly quitar = output();

  protected readonly prefijo = `riesgo-${siguienteId++}`;
  protected readonly titulo = computed(() => `Riesgo ${this.indice() + 1}`);

  /** Se recalcula con cada evento del grupo (valor, estado, touched), incluido markAllAsTouched del padre. */
  private readonly cambios = toSignal(
    toObservable(this.grupo).pipe(switchMap((grupo) => grupo.events.pipe(startWith(null)))),
  );

  protected readonly invalidos = computed(() => {
    this.cambios();
    const { direccionInmueble, arrendatario, arrendador } = this.grupo().controls;
    return {
      direccionInmueble: invalido(direccionInmueble),
      arrendatario: invalido(arrendatario),
      arrendador: invalido(arrendador),
    };
  });
}

function invalido(control: AbstractControl): boolean {
  return control.invalid && control.touched;
}
