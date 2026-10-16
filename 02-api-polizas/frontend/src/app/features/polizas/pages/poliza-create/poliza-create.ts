import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ApiError } from '../../../../core/http/api-error';
import { CrearPolizaRequest, TIPOS_POLIZA, TipoPoliza } from '../../../../core/models/poliza.model';
import { PolizasService } from '../../../../core/services/polizas.service';
import { CampoError } from '../../../../shared/components/campo-error/campo-error';
import { Spinner } from '../../../../shared/components/spinner/spinner';
import { aplicarErroresServidor, entero, maxDecimales, requeridoSinEspacios } from '../../../../shared/forms/validadores';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  RiesgoForm,
  RiesgoFormGroup,
  aRiesgoRequest,
  crearRiesgoForm,
} from '../../components/riesgo-form-group/riesgo-form-group';
import { ETIQUETAS_TIPO } from '../../polizas.etiquetas';

export type PolizaForm = FormGroup<{
  tipo: FormControl<TipoPoliza>;
  tomador: FormControl<string>;
  fechaInicioVigencia: FormControl<string>;
  mesesVigencia: FormControl<number | null>;
  valorCanon: FormControl<number | null>;
  riesgos: FormArray<RiesgoForm>;
}>;

@Component({
  selector: 'app-poliza-create',
  imports: [ReactiveFormsModule, RouterLink, CampoError, RiesgoFormGroup, Spinner, MonedaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/polizas" class="mb-4 inline-flex items-center gap-1 rounded text-sm font-medium text-primario-800 hover:underline">
      <span aria-hidden="true">←</span> Volver al listado
    </a>
    <h1 class="text-2xl font-bold text-gray-900">Nueva póliza</h1>
    <p class="mt-1 text-sm text-gray-600">Todos los campos son obligatorios. El número de póliza lo asigna el sistema.</p>

    <form [formGroup]="form" (ngSubmit)="guardar()" class="mt-6 flex flex-col gap-6" novalidate>
      <section class="rounded-lg bg-white p-6 shadow ring-1 ring-gray-200" aria-labelledby="titulo-datos">
        <h2 id="titulo-datos" class="text-lg font-semibold text-gray-900">Datos de la póliza</h2>

        <fieldset class="mt-4">
          <legend class="etiqueta">Tipo de póliza</legend>
          <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            @for (tipo of tipos; track tipo) {
              <label
                class="flex cursor-pointer items-start gap-3 rounded-lg p-4 ring-1 ring-gray-300 has-checked:bg-primario-50 has-checked:ring-2 has-checked:ring-primario-600"
              >
                <input type="radio" formControlName="tipo" [value]="tipo" class="mt-1 accent-primario-700" [attr.data-testid]="'tipo-' + tipo" />
                <span>
                  <span class="block text-sm font-semibold text-gray-900">{{ etiquetasTipo[tipo] }}</span>
                  <span class="block text-xs text-gray-600">{{ descripcionesTipo[tipo] }}</span>
                </span>
              </label>
            }
          </div>
        </fieldset>

        <div class="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div class="md:col-span-2">
            <label for="tomador" class="etiqueta">Tomador</label>
            <input id="tomador" class="campo" formControlName="tomador" maxlength="150" autocomplete="organization"
              [attr.aria-invalid]="invalido('tomador')" aria-describedby="tomador-error" />
            <app-campo-error [control]="form.controls.tomador" idError="tomador-error" />
          </div>
          <div>
            <label for="fechaInicioVigencia" class="etiqueta">Inicio de vigencia</label>
            <input id="fechaInicioVigencia" type="date" class="campo" formControlName="fechaInicioVigencia"
              [attr.aria-invalid]="invalido('fechaInicioVigencia')" aria-describedby="fecha-error" />
            <app-campo-error [control]="form.controls.fechaInicioVigencia" idError="fecha-error" />
          </div>
          <div>
            <label for="mesesVigencia" class="etiqueta">Meses de vigencia</label>
            <input id="mesesVigencia" type="number" class="campo" formControlName="mesesVigencia" min="1" max="120" step="1" inputmode="numeric"
              [attr.aria-invalid]="invalido('mesesVigencia')" aria-describedby="meses-error" />
            <app-campo-error [control]="form.controls.mesesVigencia" idError="meses-error" />
          </div>
          <div>
            <label for="valorCanon" class="etiqueta">Canon mensual (COP)</label>
            <input id="valorCanon" type="number" class="campo" formControlName="valorCanon" min="0.01" step="0.01" inputmode="decimal"
              [attr.aria-invalid]="invalido('valorCanon')" aria-describedby="canon-error" />
            <app-campo-error [control]="form.controls.valorCanon" idError="canon-error" />
          </div>
          <div class="flex flex-col justify-end rounded-md bg-primario-50 px-4 py-3" aria-live="polite">
            <span class="text-xs font-semibold uppercase tracking-wide text-primario-800">Prima estimada</span>
            <span class="text-lg font-semibold tabular-nums text-primario-900" data-testid="prima-estimada">
              {{ primaEstimada() !== null ? (primaEstimada() | moneda) : '—' }}
            </span>
            <span class="text-xs text-primario-800">estimada, la calcula el sistema</span>
          </div>
        </div>
      </section>

      <section class="rounded-lg bg-white p-6 shadow ring-1 ring-gray-200" aria-labelledby="titulo-riesgos">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="titulo-riesgos" class="text-lg font-semibold text-gray-900">Riesgos</h2>
            <p class="text-sm text-gray-600">
              @if (esIndividual()) {
                Una póliza individual asegura exactamente un inmueble.
              } @else {
                Una póliza colectiva puede crearse sin riesgos y recibirlos después.
              }
            </p>
          </div>
          @if (!esIndividual()) {
            <button type="button" class="btn btn-secundario" (click)="agregarRiesgo()">+ Agregar riesgo</button>
          }
        </div>

        <div class="mt-4 flex flex-col gap-4">
          @for (grupo of form.controls.riesgos.controls; track grupo; let i = $index) {
            <app-riesgo-form-group [grupo]="grupo" [indice]="i" [removible]="!esIndividual()" (quitar)="quitarRiesgo(i)" />
          } @empty {
            <p class="rounded-md border-2 border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-600">
              Sin riesgos por ahora.
            </p>
          }
        </div>
      </section>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <a routerLink="/polizas" class="btn btn-secundario">Cancelar</a>
        <button type="submit" class="btn btn-primario" [disabled]="enviando()">
          @if (enviando()) {
            <app-spinner texto="Guardando…" />
          }
          Crear póliza
        </button>
      </div>
    </form>
  `,
})
export class PolizaCreate {
  private readonly polizasService = inject(PolizasService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly tipos = TIPOS_POLIZA;
  protected readonly etiquetasTipo = ETIQUETAS_TIPO;
  protected readonly descripcionesTipo: Record<TipoPoliza, string> = {
    INDIVIDUAL: 'Un solo inmueble asegurado.',
    COLECTIVA: 'Varios inmuebles bajo una misma póliza.',
  };

  /** Restricciones de formato iguales a CrearPolizaRequest del backend. */
  readonly form: PolizaForm = new FormGroup({
    tipo: new FormControl<TipoPoliza>('INDIVIDUAL', { nonNullable: true, validators: Validators.required }),
    tomador: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, requeridoSinEspacios, Validators.maxLength(150)],
    }),
    fechaInicioVigencia: new FormControl('', { nonNullable: true, validators: Validators.required }),
    mesesVigencia: new FormControl<number | null>(12, [Validators.required, Validators.min(1), Validators.max(120), entero]),
    valorCanon: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01), maxDecimales(2)]),
    riesgos: new FormArray<RiesgoForm>([crearRiesgoForm()]),
  });

  protected readonly enviando = signal(false);

  private readonly valor = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly esIndividual = computed(() => this.valor().tipo === 'INDIVIDUAL');

  /** Solo informativa: el valor oficial lo calcula y devuelve el backend. */
  protected readonly primaEstimada = computed(() => {
    const { valorCanon, mesesVigencia } = this.valor();
    if (!valorCanon || !mesesVigencia || valorCanon <= 0 || mesesVigencia <= 0) {
      return null;
    }
    return Math.round(valorCanon * mesesVigencia * 100) / 100;
  });

  constructor() {
    this.form.controls.tipo.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((tipo) => this.ajustarRiesgosAlTipo(tipo));
  }

  protected invalido(campo: 'tomador' | 'fechaInicioVigencia' | 'mesesVigencia' | 'valorCanon'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }

  protected agregarRiesgo(): void {
    this.form.controls.riesgos.push(crearRiesgoForm());
  }

  protected quitarRiesgo(indice: number): void {
    this.form.controls.riesgos.removeAt(indice);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.enfocarPrimerError();
      return;
    }
    this.enviando.set(true);
    this.polizasService.crear(this.aRequest()).subscribe({
      next: (poliza) => {
        this.toast.exito('Póliza creada', `Se creó la póliza ${poliza.numero}.`);
        this.router.navigate(['/polizas', poliza.id]);
      },
      error: (error: ApiError) => {
        // El interceptor ya mostró el toast; aquí se marcan los campos que el backend rechazó
        if (aplicarErroresServidor(this.form, error.erroresCampos)) {
          this.enfocarPrimerError();
        }
        this.enviando.set(false);
      },
    });
  }

  /**
   * INDIVIDUAL: exactamente un riesgo (se conserva el primero si había varios).
   * COLECTIVA: se mantienen los riesgos ya diligenciados; el usuario puede agregar o quitar.
   */
  private ajustarRiesgosAlTipo(tipo: TipoPoliza): void {
    const riesgos = this.form.controls.riesgos;
    if (tipo === 'INDIVIDUAL') {
      while (riesgos.length > 1) {
        riesgos.removeAt(riesgos.length - 1);
      }
      if (riesgos.length === 0) {
        riesgos.push(crearRiesgoForm());
      }
    }
  }

  private aRequest(): CrearPolizaRequest {
    const valor = this.form.getRawValue();
    return {
      tipo: valor.tipo,
      tomador: valor.tomador.trim(),
      fechaInicioVigencia: valor.fechaInicioVigencia,
      mesesVigencia: Number(valor.mesesVigencia),
      valorCanon: Number(valor.valorCanon),
      riesgos: this.form.controls.riesgos.controls.map(aRiesgoRequest),
    };
  }

  /** Accesibilidad: lleva el foco al primer campo con error tras renderizar los mensajes. */
  private enfocarPrimerError(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }
}
