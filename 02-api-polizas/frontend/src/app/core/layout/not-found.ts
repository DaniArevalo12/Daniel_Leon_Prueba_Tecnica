import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyState } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-not-found',
  imports: [EmptyState, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="sr-only">Página no encontrada</h1>
    <app-empty-state titulo="Página no encontrada" mensaje="La dirección que intentó abrir no existe.">
      <a routerLink="/polizas" class="rounded-md bg-primario-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primario-800">
        Ir al listado de pólizas
      </a>
    </app-empty-state>
  `,
})
export class NotFound {}
