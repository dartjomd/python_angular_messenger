import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from './auth.service'; // Переиспользуем твой интерфейс
import { inject, Injectable } from '@angular/core';

export interface UserSearchResult extends Omit<UserProfile, 'is_active'> {}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private readonly API_URL = '/users'; // Прокси перенаправит на http://127.0.0.1:8000/users

  searchUsers(query: string): Observable<UserSearchResult[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<UserSearchResult[]>(`${this.API_URL}/search`, { params });
  }
}