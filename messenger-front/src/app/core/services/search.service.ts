import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from './auth.service'; // Переиспользуем твой интерфейс
import { inject, Injectable } from '@angular/core';

export interface UserSearchResult extends Omit<UserProfile, 'is_active'> {}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private http = inject(HttpClient);

  searchUsers(query: string): Observable<UserSearchResult[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<UserSearchResult[]>(`/search_users`, { params });
  }
}