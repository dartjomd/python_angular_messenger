import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // 1. Берем текущий access_token из нашего сервиса
  const token = authService.accessToken;

  // 2. Если токен есть в памяти, клонируем запрос и добавляем заголовок Authorization
  let clonedReq = req;
  if (token) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // 3. Отправляем запрос дальше в сеть и вешаем "ловушку" catchError для перехвата ошибок ответов
  return next(clonedReq).pipe(
    catchError((error: any) => {
      // Нас интересует только ошибка 401 Unauthorized (протухший токен)
      // И мы проверяем, чтобы это не были запросы логина или рефреша, иначе уйдем в бесконечный цикл
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/login')
      ) {
        console.warn('🚨 Access-токен протух (401). Пытаюсь незаметно обновить сессию...');

        // switchMap переключает поток со старого упавшего запроса на выполнение refreshToken()
        return authService.refreshToken().pipe(
          switchMap((newTokens) => {
            console.log('🔄 Токен успешно обновлен! Повторяю старый запрос.');
            
            // Если рефреш прошел успешно, берем СТАРЫЙ запрос,
            // вшиваем в него уже НОВЫЙ полученный токен и отправляем в сеть заново
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newTokens.access_token}`
              }
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            // Если упал даже /refresh (например, кука тоже просрочена) — сессия полностью умерла
            console.error('❌ Сессия полностью истекла. Выбрасываем пользователя на вход.');
            authService.logout(); // Очистит локальные данные и обнулит сигналы
            return throwError(() => refreshErr);
          })
        );
      }

      // Если это любая другая ошибка (500, 404) — просто пробрасываем её дальше
      return throwError(() => error);
    })
  );
};