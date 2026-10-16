import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** Estructura común: enlace para saltar al contenido, encabezado con navegación y área principal. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow"
    >
      Saltar al contenido
    </a>

    <header class="bg-primario-700 text-white shadow">
      <div class="h-1 bg-acento-400" aria-hidden="true"></div>
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <a routerLink="/polizas" class="flex items-center gap-3 rounded">
          <span class="grid size-9 place-items-center rounded-lg bg-acento-400 text-lg font-bold text-primario-950" aria-hidden="true">P</span>
          <span>
            <span class="block text-base font-semibold leading-tight">Pólizas de arrendamiento</span>
            <span class="block text-xs text-primario-100">Gestión de pólizas y riesgos</span>
          </span>
        </a>
        <nav aria-label="Principal">
          <ul class="flex gap-1 text-sm font-medium">
            <li>
              <a
                routerLink="/polizas"
                routerLinkActive="bg-primario-800"
                [routerLinkActiveOptions]="{ exact: true }"
                ariaCurrentWhenActive="page"
                class="block rounded-md px-3 py-2 hover:bg-primario-800"
              >
                Pólizas
              </a>
            </li>
            <li>
              <a
                routerLink="/polizas/nueva"
                routerLinkActive
                ariaCurrentWhenActive="page"
                class="block rounded-md bg-acento-400 px-3 py-2 text-primario-950 hover:bg-acento-300"
              >
                + Nueva póliza
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>

    <main id="contenido" tabindex="-1" class="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <router-outlet />
    </main>
  `,
})
export class Shell {}
