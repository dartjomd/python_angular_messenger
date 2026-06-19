import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'chats' },

  // Авторизация
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },

//   // ПРИВАТНАЯ ЗОНА (Раздельные экраны, как в ТГ на телефоне)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'chats',
        loadComponent: () => import('./pages/chat-list/chat-list.component').then(m => m.ChatListComponent)
      },
      // {
      //   path: 'chats/:id',
      //   loadComponent: () => import('./pages/chat-window/chat-window.component').then(m => m.ChatWindowComponent)
      // },
      {
        path: 'profile', // <-- ПОМЕНЯЛИ ЗДЕСЬ
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];