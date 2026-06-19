import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core'; // <-- Импортируем Zoneless
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Включаем чистый Zoneless! Теперь нам не нужен zone.js
    provideZonelessChangeDetection(), 
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};