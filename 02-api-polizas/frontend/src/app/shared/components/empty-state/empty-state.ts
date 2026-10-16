import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Estado vacío con acciones proyectadas (p. ej. "Crear póliza"). */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-10 text-center">
      <p class="text-base font-semibold text-gray-900">{{ titulo() }}</p>
      <p class="mt-1 text-sm text-gray-600">{{ mensaje() }}</p>
      <div class="mt-4 flex justify-center gap-3">
        <ng-content />
      </div>
    </div>
  `,
})
export class EmptyState {
  readonly titulo = input.required<string>();
  readonly mensaje = input('');
}
