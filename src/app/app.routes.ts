import { Routes } from '@angular/router';
import { Home } from './home/home';

export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((module) => module.Dashboard),
  },
];
