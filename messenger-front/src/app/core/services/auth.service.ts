import { Injectable, inject, signal, computed, Signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router'; // <-- ДОБАВИЛИ ИМПОРТ
import { Observable, tap, of } from 'rxjs';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http: HttpClient = inject(HttpClient);
  private router: Router = inject(Router);
  private readonly API_URL: string = '/auth';

  private _accessToken = signal<string | null>(localStorage.getItem('access_token'));
  public isAuthenticated: Signal<boolean> = computed(() => !!this._accessToken());

  private _currentUser = signal<UserProfile | null>(null);
  public currentUser = this._currentUser.asReadonly();

  public get accessToken(): string | null {
    return this._accessToken();
  }

  private handleAuthResponse(source$: Observable<AuthResponse>): Observable<AuthResponse> {
    return source$.pipe(
      tap((response) => {
        if (response && response.access_token) {
          localStorage.setItem('access_token', response.access_token);
          this._accessToken.set(response.access_token);
          
          if (response.user) {
            this._currentUser.set(response.user);
          }
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, userData);
  }

  login(username: string, password: string): Observable<AuthResponse> {
    const body = new HttpParams()
      .set('username', username)
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    const login$ = this.http.post<AuthResponse>(`${this.API_URL}/login`, body.toString(), { headers });
    return this.handleAuthResponse(login$);
  }

  getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.API_URL}/me`).pipe(
      tap((user) => {
        this._currentUser.set(user);
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refresh$ = this.http.post<AuthResponse>(`${this.API_URL}/refresh`, {});
    return this.handleAuthResponse(refresh$);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.API_URL}/logout`, {}).pipe(
      tap({
        finalize: () => {
          this.clearLocalSession();
          this.redirectToLogin();
        }
      })
    );
  }

  logoutAllDevices(): Observable<any> {
    return this.http.post(`${this.API_URL}/logout-all`, {}).pipe(
      tap({
        finalize: () => {
          this.clearLocalSession();
          this.redirectToLogin();
        }
      })
    );
  }

  /**
   * Метод принудительного редиректа на страницу авторизации
   */
  public redirectToLogin(): void {
    this.router.navigate(['/login']);
  }

  private clearLocalSession(): void {
    localStorage.removeItem('access_token');
    this._accessToken.set(null);
    this._currentUser.set(null);
  }
}