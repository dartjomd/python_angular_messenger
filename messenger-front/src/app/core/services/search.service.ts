import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from './auth.service'; // Переиспользуем твой интерфейс
import { inject, Injectable } from '@angular/core';

export interface UserSearchResult extends Omit<UserProfile, 'is_active'> {}

export interface ChatCreateResponse {
  chat_id: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private http = inject(HttpClient);
  
  // Наши прокси-пути
  private searchApiUrl = '/api/search/users';
  private chatsApiUrl = '/api/chats';

  // Твой текущий метод поиска
  searchUsers(query: string, offset: number = 0, limit: number = 10): Observable<UserSearchResult[]> {
    const params = new HttpParams()
      .set('query', query)
      .set('offset', offset.toString())
      .set('limit', limit.toString());

    return this.http.get<UserSearchResult[]>(this.searchApiUrl, { params });
  }

  // НОВЫЙ МЕТОД: Создать или получить существующий диалог
  // Запрос отправляется методом POST, а id собеседника подставляется прямо в URL
  createOrGetDialog(recipientId: number): Observable<ChatCreateResponse> {
    return this.http.post<ChatCreateResponse>(`${this.chatsApiUrl}/dialog/${recipientId}`, {});
  }
}