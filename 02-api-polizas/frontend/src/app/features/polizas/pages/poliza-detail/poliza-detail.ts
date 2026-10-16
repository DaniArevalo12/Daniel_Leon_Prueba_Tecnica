import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, filter, finalize, forkJoin, of, switchMap } from 'rxjs';

import { ApiError } from '../../../../core/http/api-error';
import { Poliza, Riesgo } from '../../../../core/models/poliza.model';
import { PolizasService } from '../../../../core/services/polizas.service';
import { RiesgosService } from '../../../../core/services/riesgos.service';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Spinner } from '../../../../shared/components/spinner/spinner';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { FechaLocalPipe } from '../../../../shared/pipes/fecha-local.pipe';
import { aplicarErroresServidor } from '../../../../shared/forms/validadores';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { ToastService } from '../../../../shared/services/toast.service';
import { Carga, conEstadoDeCarga } from '../../../../shared/util/carga';
import { RenovacionDialog } from '../../components/renovacion-dialog/renovacion-dialog';
import { RiesgoFormGroup, aRiesgoRequest, crearRiesgoForm } from '../../components/riesgo-form-group/riesgo-form-group';
import { RiesgosTabla } from '../../components/riesgos-tabla/riesgos-tabla';
import { ETIQUETAS_TIPO } from '../../polizas.etiquetas';

export interface DetallePoliza {
  poliza: Poliza;
  riesgos: Riesgo[];
}

/** Un id no numérico en la URL no puede existir: se responde sin consultar al backend. */
const POLIZA_NO_ENCONTRADA: Carga<DetallePoliza> = {
  estado: 'error',
  error: new ApiError(404, 'No encontrado', 'El identificador de la póliza no es válido.', null),
};

@Component({
  selector: 'app-poliza-detail',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    StatusBadge,
    Spinner,
    EmptyState,
    ErrorState,
    ConfirmDialog,
    RiesgosTabla,
    RiesgoFormGroup,
    RenovacionDialog,
    MonedaPipe,
    FechaLocalPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/polizas" class="mb-4 inline-flex items-center gap-1 rounded text-sm font-medium text-primario-800 hover:underline">
      <span aria-hidden="true">←</span> Volver al listado
    </a>

    @switch (carga().estado) {
      @case ('cargando') {
        <div class="flex justify-center py-12 text-primario-700">
          <app-spinner texto="Cargando póliza…" [textoVisible]="true" />
        </div>
      }
      @case ('error') {
        @if (noEncontrada()) {
          <app-error-state titulo="Póliza no encontrada" [mensaje]="errorMensaje()" [reintentable]="false">
            <a routerLink="/polizas" class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-red-900 ring-1 ring-red-300 hover:bg-red-100">
              Ir al listado
            </a>
          </app-error-state>
        } @else {
          <app-error-state [mensaje]="errorMensaje()" [correlationId]="errorCorrelationId()" (reintentar)="recargar()" />
        }
      }
      @case ('listo') {
        @if (detalle(); as d) {
          <article class="flex flex-col gap-6">
            <header class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div class="flex flex-wrap items-center gap-3">
                  <h1 class="text-2xl font-bold text-gray-900">Póliza {{ d.poliza.numero }}</h1>
                  <app-status-badge [estado]="d.poliza.estado" />
                </div>
                <p class="mt-1 text-sm text-gray-600">{{ etiquetasTipo[d.poliza.tipo] }} · {{ d.poliza.tomador }}</p>
              </div>
              <div class="flex flex-wrap gap-2" role="group" aria-label="Acciones de la póliza">
                <button
                  type="button"
                  class="btn btn-primario"
                  [disabled]="polizaCancelada()"
                  [attr.aria-describedby]="polizaCancelada() ? 'motivo-sin-acciones' : null"
                  (click)="abrir('renovar')"
                  data-testid="accion-renovar"
                >
                  Renovar
                </button>
                @if (!polizaCancelada()) {
                  <button type="button" class="btn btn-peligro" (click)="abrir('cancelar')" data-testid="accion-cancelar">
                    Cancelar póliza
                  </button>
                }
              </div>
            </header>
            @if (polizaCancelada()) {
              <p id="motivo-sin-acciones" class="-mt-3 rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700">
                Esta póliza está cancelada: no admite renovación ni cambios en sus riesgos.
              </p>
            }

            <section aria-labelledby="titulo-datos" class="rounded-lg bg-white p-6 shadow ring-1 ring-gray-200">
              <h2 id="titulo-datos" class="sr-only">Datos de la póliza</h2>
              <dl class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Tomador</dt>
                  <dd class="mt-1 text-gray-900">{{ d.poliza.tomador }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</dt>
                  <dd class="mt-1 text-gray-900">{{ etiquetasTipo[d.poliza.tipo] }}</dd>
                </div>
                <div class="sm:col-span-2">
                  <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Vigencia</dt>
                  <dd class="mt-1 text-gray-900" data-testid="vigencia">
                    {{ d.poliza.fechaInicioVigencia | fechaLocal }} – {{ d.poliza.fechaFinVigencia | fechaLocal }}
                    <span class="text-gray-600">({{ d.poliza.mesesVigencia }} meses)</span>
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Canon mensual</dt>
                  <dd class="mt-1 text-lg font-semibold tabular-nums text-gray-900" data-testid="canon">{{ d.poliza.valorCanon | moneda }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Prima</dt>
                  <dd class="mt-1 text-lg font-semibold tabular-nums text-primario-800" data-testid="prima">{{ d.poliza.valorPrima | moneda }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Creada</dt>
                  <dd class="mt-1 text-gray-900">{{ d.poliza.fechaCreacion | date: 'd MMM y, h:mm a' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Última actualización</dt>
                  <dd class="mt-1 text-gray-900">{{ d.poliza.fechaActualizacion | date: 'd MMM y, h:mm a' }}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="titulo-riesgos" class="flex flex-col gap-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titulo-riesgos" class="text-lg font-semibold text-gray-900">Riesgos ({{ d.riesgos.length }})</h2>
                @if (puedeAgregarRiesgo()) {
                  <button type="button" class="btn btn-secundario" (click)="abrirAgregarRiesgo()" data-testid="accion-agregar-riesgo">
                    + Agregar riesgo
                  </button>
                }
              </div>
              @if (d.riesgos.length === 0) {
                <app-empty-state titulo="Sin riesgos" mensaje="Esta póliza aún no tiene inmuebles asegurados." />
              } @else {
                <app-riesgos-tabla
                  [riesgos]="d.riesgos"
                  [accionesHabilitadas]="!polizaCancelada()"
                  (cancelar)="abrirCancelarRiesgo($event)"
                />
              }
            </section>
          </article>

          <app-renovacion-dialog
            [poliza]="d.poliza"
            [abierto]="dialogo() === 'renovar'"
            (renovada)="recargar(true)"
            (rechazada)="recargar(true)"
            (cerrado)="cerrarDialogo()"
          />

          <app-confirm-dialog
            [abierto]="dialogo() === 'cancelar'"
            [titulo]="'Cancelar póliza ' + d.poliza.numero"
            textoConfirmar="Sí, cancelar póliza"
            textoCancelar="Volver"
            tono="peligro"
            [procesando]="procesando()"
            (confirmar)="cancelarPoliza(d.poliza)"
            (cancelar)="cerrarDialogo()"
          >
            <p>
              Se cancelará la póliza y <strong>todos sus riesgos activos ({{ riesgosActivos() }})</strong>.
              Esta acción no se puede deshacer.
            </p>
          </app-confirm-dialog>

          <app-confirm-dialog
            [abierto]="dialogo() === 'agregar-riesgo'"
            titulo="Agregar riesgo"
            textoConfirmar="Agregar riesgo"
            [procesando]="procesando()"
            (confirmar)="agregarRiesgo(d.poliza)"
            (cancelar)="cerrarDialogo()"
          >
            <form [formGroup]="formRiesgo" (ngSubmit)="agregarRiesgo(d.poliza)" novalidate>
              <app-riesgo-form-group [grupo]="formRiesgo" [indice]="d.riesgos.length" />
            </form>
          </app-confirm-dialog>

          <app-confirm-dialog
            [abierto]="dialogo() === 'cancelar-riesgo'"
            titulo="Cancelar riesgo"
            textoConfirmar="Sí, cancelar riesgo"
            textoCancelar="Volver"
            tono="peligro"
            [procesando]="procesando()"
            (confirmar)="cancelarRiesgo()"
            (cancelar)="cerrarDialogo()"
          >
            <p>
              Se cancelará el riesgo del inmueble
              <strong>{{ riesgoSeleccionado()?.direccionInmueble }}</strong>. La póliza conservará su estado.
            </p>
          </app-confirm-dialog>
        }
      }
    }
  `,
})
export class PolizaDetail {
  private readonly polizasService = inject(PolizasService);
  private readonly riesgosService = inject(RiesgosService);
  private readonly toast = inject(ToastService);

  /** Parámetro de ruta :id, enlazado por withComponentInputBinding. */
  readonly id = input.required<string>();

  /** silenciosa: recarga tras una acción sin volver a mostrar el spinner de página completa. */
  private readonly recarga = signal({ n: 0, silenciosa: false });
  protected readonly etiquetasTipo = ETIQUETAS_TIPO;

  protected readonly carga = toSignal(
    toObservable(computed(() => ({ id: Number(this.id()), recarga: this.recarga() }))).pipe(
      switchMap(({ id, recarga }) =>
        !Number.isInteger(id) || id <= 0
          ? of(POLIZA_NO_ENCONTRADA)
          : forkJoin({
              poliza: this.polizasService.obtener(id),
              riesgos: this.polizasService.listarRiesgos(id),
            }).pipe(
              conEstadoDeCarga(),
              filter((c) => !(recarga.silenciosa && c.estado === 'cargando')),
            ),
      ),
    ),
    { initialValue: { estado: 'cargando' } as Carga<DetallePoliza> },
  );

  protected readonly detalle = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.datos : null;
  });
  protected readonly polizaCancelada = computed(() => this.detalle()?.poliza.estado === 'CANCELADA');
  protected readonly noEncontrada = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' && carga.error.status === 404;
  });
  protected readonly errorMensaje = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error.mensaje : '';
  });
  protected readonly errorCorrelationId = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error.correlationId : null;
  });

  // ---------- Acciones ----------
  // La UI solo oculta/deshabilita lo que el backend rechazaría; si aun así responde 409/422
  // (p. ej. otro usuario cambió la póliza), el interceptor muestra el toast y se recarga el estado real.

  protected readonly dialogo = signal<Dialogo | null>(null);
  protected readonly procesando = signal(false);
  protected readonly riesgoSeleccionado = signal<Riesgo | null>(null);
  protected readonly formRiesgo = crearRiesgoForm();

  protected readonly puedeAgregarRiesgo = computed(
    () => this.detalle()?.poliza.tipo === 'COLECTIVA' && !this.polizaCancelada(),
  );
  protected readonly riesgosActivos = computed(
    () => this.detalle()?.riesgos.filter((r) => r.estado === 'ACTIVO').length ?? 0,
  );

  protected abrir(dialogo: Dialogo): void {
    this.dialogo.set(dialogo);
  }

  protected abrirAgregarRiesgo(): void {
    this.formRiesgo.reset();
    this.abrir('agregar-riesgo');
  }

  protected abrirCancelarRiesgo(riesgo: Riesgo): void {
    this.riesgoSeleccionado.set(riesgo);
    this.abrir('cancelar-riesgo');
  }

  protected cerrarDialogo(): void {
    this.dialogo.set(null);
  }

  protected cancelarPoliza(poliza: Poliza): void {
    this.ejecutar(this.polizasService.cancelar(poliza.id), () =>
      this.toast.exito('Póliza cancelada', `La póliza ${poliza.numero} y sus riesgos fueron cancelados.`),
    );
  }

  protected agregarRiesgo(poliza: Poliza): void {
    if (this.formRiesgo.invalid) {
      this.formRiesgo.markAllAsTouched();
      return;
    }
    this.ejecutar(
      this.polizasService.agregarRiesgo(poliza.id, aRiesgoRequest(this.formRiesgo)),
      () => this.toast.exito('Riesgo agregado', `Se agregó el riesgo a la póliza ${poliza.numero}.`),
      (error) => aplicarErroresServidor(this.formRiesgo, error.erroresCampos),
    );
  }

  protected cancelarRiesgo(): void {
    const riesgo = this.riesgoSeleccionado();
    if (!riesgo) {
      return;
    }
    this.ejecutar(this.riesgosService.cancelar(riesgo.id), () =>
      this.toast.exito('Riesgo cancelado', `Se canceló el riesgo de ${riesgo.direccionInmueble}.`),
    );
  }

  protected recargar(silenciosa = false): void {
    this.recarga.update(({ n }) => ({ n: n + 1, silenciosa }));
  }

  /**
   * Flujo común de una acción: deshabilita el diálogo mientras procesa; al terminar lo cierra y recarga
   * el detalle desde el backend (sin actualizaciones optimistas).
   * Un 400 con errores por campo deja el diálogo abierto para corregirlos.
   */
  private ejecutar<T>(accion: Observable<T>, alExito: () => void, alErrorValidacion?: (e: ApiError) => boolean): void {
    this.procesando.set(true);
    accion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        alExito();
        this.cerrarDialogo();
        this.recargar(true);
      },
      error: (error: ApiError) => {
        if (error.status === 400 && alErrorValidacion?.(error)) {
          return;
        }
        this.cerrarDialogo();
        this.recargar(true);
      },
    });
  }
}

type Dialogo = 'renovar' | 'cancelar' | 'agregar-riesgo' | 'cancelar-riesgo';
