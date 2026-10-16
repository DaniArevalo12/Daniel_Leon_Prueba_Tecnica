import { Routes } from '@angular/router';

import { Shell } from './core/layout/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'polizas' },
      {
        path: 'polizas',
        loadChildren: () => import('./features/polizas/polizas.routes').then((m) => m.POLIZAS_ROUTES),
      },
      {
        path: '**',
        title: 'Página no encontrada',
        loadComponent: () => import('./core/layout/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
