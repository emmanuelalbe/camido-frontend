import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: 'verificar-email',
    loadComponent: () =>
      import('./features/auth/verificar-email/verificar-email').then((m) => m.VerificarEmail),
  },
];
