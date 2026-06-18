import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService); // Берем наш AuthService (наш менеджер авторизации)
  const router = inject(Router);           // Берем роутер Angular для перенаправлений

  // Читаем Сигнал авторизации. Если токен в localStorage/памяти есть — он вернет true
  if (authService.isAuthenticated()) {
    return true; // Всё отлично, пропускаем пользователя на секретный роут (в чаты)
  }

  // Если сигнал вернул false — пользователь "гость".
  // Перенаправляем его на страницу логина, чтобы он не смотрел на белый экран
  router.navigate(['/login']);
  
  return false; // Жестко блокируем доступ к текущему URL
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true; // Пользователь не залогинен? Отлично, пускаем его на форму логина/регистрации
  }

  // Если он ЗАЛОГИНЕН, но пытается зайти на /login — принудительно уводим его в чаты
  router.navigate(['/chats']);
  return false;
};