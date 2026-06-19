import { Injectable, inject, signal, computed, Signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

// Описываем, что именно нам вернет бэкенд при успешном входе
interface AuthResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root' // Сервис будет один на всё приложение
})
export class AuthService {
  // Внедряем HttpClient (инструмент для сетевых запросов)
  private http: HttpClient = inject(HttpClient);

  // URL нашего FastAPI бэкенда. Так как у нас WSL, пишем localhost
  private readonly API_URL: string = 'http://localhost:8000/auth';

  // Создаем приватный Сигнал. Он проверяет localStorage: если там есть токен,
  // приложение сразу поймет, что пользователь уже залогинен (например, после обновления страницы F5)
  private _accessToken = signal<string | null>(localStorage.getItem('access_token'));

  // Публичный вычисляемый сигнал (computed). Если токен есть — true, если null — false.
  // Гварды и страницы будут читать его, чтобы понять, пускать ли пользователя
  public isAuthenticated: Signal<boolean> = computed(() => !!this._accessToken());

  // Простой геттер, чтобы интерцептор мог в любой момент удобно взять строку токена
  public get accessToken(): string | null {
    return this._accessToken();
  }

  private handleAuthResponse(source$: Observable<AuthResponse>): Observable<AuthResponse> {
    return source$.pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access_token);
        this._accessToken.set(response.access_token);
      })
    );
  }

  /**
   * 1. Регистрация
   */
  register(userData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, userData);
  }

  /**
   * 2. Логин
   * Оператор tap() позволяет нам «подсмотреть» в успешный ответ бэкенда,
   * сохранить токен и обновить сигнал, не мешая компоненту формы получить этот же ответ.
   */
  login(username: string, password: string): Observable<any> {
    // 1. ПРЕВРАЩАЕМ ДАННЫЕ В FORM-DATA
    // OAuth2PasswordRequestForm на бэкенде ждет именно ключи "username" и "password"
    const body = new HttpParams()
      .set('username', username)
      .set('password', password);

    // 2. УКАЗЫВАЕМ ПРАВИЛЬНЫЙ ХЕДЕР
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    const login$ = this.http.post<AuthResponse>(`${this.API_URL}/login`, body.toString(), { headers });
    return this.handleAuthResponse(login$);
  }

  /**
   * 3. Обновление токена (Refresh)
   * 🚨 КРИТИЧЕСКИ ВАЖНО: { withCredentials: true } заставляет браузер 
   * прикрепить к этому запросу нашу HttpOnly куку refresh_token!
   */
  refreshToken(): Observable<AuthResponse> {
    const refresh$ = this.http.post<AuthResponse>(`${this.API_URL}/refresh`, {}, { withCredentials: true });
    return this.handleAuthResponse(refresh$);
  }

  /**
   * 4. Выход (Пока локальный)
   */
  logout(): void {
    // Отправляем запрос на бэкенд, чтобы удалить сессию из БД и стереть куку.
    // withCredentials обязателен, чтобы браузер отдал куку refresh_token бэкенду!
    this.http.post(`${this.API_URL}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => console.log('Сессия успешно удалена на бэкенде'),
      error: (err) => console.error('Ошибка при удалении сессии:', err)
    });

    // Независимо от ответа сети, мгновенно чистим фронтенд, чтобы не мариновать юзера
    localStorage.removeItem('access_token');
    this._accessToken.set(null);
  }

  logoutAll(): void {
    // Делаем запрос к защищенному эндпоинту. 
    // Интерцептор автоматически прикрепит Bearer токен, а withCredentials отдаст куку
    this.http.post(`${this.API_URL}/logout-all`, {}, { withCredentials: true }).subscribe({
      next: () => console.log('Все сессии успешно аннулированы в базе данных'),
      error: (err) => console.error('Ошибка при выходе со всех устройств:', err)
    });

    // Мгновенно зачищаем локальное хранилище текущего устройства
    localStorage.removeItem('access_token');
    this._accessToken.set(null);
  }
}