import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Riesgo } from '../../../../core/models/poliza.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';

/**
 * Riesgos de una póliza. Solo ofrece "Cancelar" en riesgos ACTIVOS y cuando la póliza lo permite;
 * el backend sigue siendo quien valida (un 409 se mostraría en un toast).
 */
@Component({
  selector: 'app-riesgos-tabla',
  imports: [StatusBadge, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto rounded-lg bg-white shadow ring-1 ring-gray-200">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <caption class="sr-only">Riesgos de la póliza</caption>
        <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th scope="col" class="px-4 py-3">Inmueble</th>
            <th scope="col" class="hidden px-4 py-3 sm:table-cell">Arrendatario</th>
            <th scope="col" class="hidden px-4 py-3 md:table-cell">Arrendador (beneficiario)</th>
            <th scope="col" class="hidden px-4 py-3 lg:table-cell">Registrado</th>
            <th scope="col" class="px-4 py-3">Estado</th>
            @if (accionesHabilitadas()) {
              <th scope="col" class="px-4 py-3"><span class="sr-only">Acciones</span></th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (riesgo of riesgos(); track riesgo.id) {
            <tr data-testid="fila-riesgo">
              <td class="px-4 py-3">
                <span class="font-medium text-gray-900">{{ riesgo.direccionInmueble }}</span>
                <span class="block text-xs text-gray-600 sm:hidden">{{ riesgo.arrendatario }}</span>
              </td>
              <td class="hidden px-4 py-3 sm:table-cell">{{ riesgo.arrendatario }}</td>
              <td class="hidden px-4 py-3 md:table-cell">{{ riesgo.arrendador }}</td>
              <td class="hidden whitespace-nowrap px-4 py-3 lg:table-cell">{{ riesgo.fechaCreacion | date: 'd MMM y, h:mm a' }}</td>
              <td class="px-4 py-3"><app-status-badge [estado]="riesgo.estado" /></td>
              @if (accionesHabilitadas()) {
                <td class="px-4 py-3 text-right">
                  @if (riesgo.estado === 'ACTIVO') {
                    <button
                      type="button"
                      class="rounded-md px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                      [attr.aria-label]="'Cancelar riesgo ' + riesgo.direccionInmueble"
                      (click)="cancelar.emit(riesgo)"
                    >
                      Cancelar
                    </button>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class RiesgosTabla {
  readonly riesgos = input.required<Riesgo[]>();
  readonly accionesHabilitadas = input(true);
  readonly cancelar = output<Riesgo>();
}
