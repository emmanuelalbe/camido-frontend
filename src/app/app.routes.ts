import { Routes } from '@angular/router';
import { authGuard } from './features/auth/auth.guard';

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
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'bienvenida',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/bienvenida/bienvenida').then((m) => m.Bienvenida),
  },
];
