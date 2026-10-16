import { Routes } from '@angular/router';

/** Cada página se descarga solo al navegar a ella (lazy loading). */
export const POLIZAS_ROUTES: Routes = [
  {
    path: '',
    title: 'Pólizas',
    loadComponent: () => import('./pages/poliza-list/poliza-list').then((m) => m.PolizaList),
  },
  {
    // Antes de ':id' para que "nueva" no se interprete como un id
    path: 'nueva',
    title: 'Nueva póliza',
    loadComponent: () => import('./pages/poliza-create/poliza-create').then((m) => m.PolizaCreate),
  },
  {
    path: ':id',
    title: 'Detalle de póliza',
    loadComponent: () => import('./pages/poliza-detail/poliza-detail').then((m) => m.PolizaDetail),
  },
];
