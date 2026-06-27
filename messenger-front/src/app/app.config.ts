import { ApplicationConfig, provideZonelessChangeDetection, provideAppInitializer, inject } from '@angular/core'; // <-- Импортируем provideAppInitializer
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { catchError, of, tap } from 'rxjs';
import { WsManagerService } from './core/services/ws/ws-manager.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(), 
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    
    // Вместо старого объекта с { provide, useFactory, multi }
    // Используем современную функцию инициализации:
    provideAppInitializer(() => {
      const authService = inject(AuthService); // Внедряем сервис прямо внутрь функции
      const wsManager = inject(WsManagerService);

      // Логика осталась железно той же:
      if (authService.accessToken) {
        return authService.getMe().pipe(
          tap(() => {
            console.log('Сессия восстановлена, запускаем WebSocket...');
            wsManager.connect(); // <-- Включаем сокет, токен железно валидный!
          }),
          catchError((err) => {
            console.error('Ошибка автоматического восстановления сессии:', err);
            authService.logout().subscribe(); // Чистим фронтенд, если токен сдох
            return of(null); // Разрешаем Angular запуститься дальше
          })
        );
      }
      
      // Если токена нет, возвращаем пустой промис, чтобы не держать загрузку
      return Promise.resolve();
    })
  ]
};