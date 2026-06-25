import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Описываем интерфейс элемента списка чатов в строгом соответствии с бэкендом
export interface ChatListElement {
  id: number;
  chat_type: 'DIRECT' | 'GROUP';
  recipient_id: number | null;
  username: string;
  avatar_letter: string;
  is_online: boolean;
  last_seen: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatsService {
  private http = inject(HttpClient);
  // Наш относительный путь. Прокси на dev-сервере перенаправит его на http://localhost:8000/chats
  private apiUrl = '/api/chats';

  /**
   * Получить список всех чатов текущего пользователя
   */
  getChats(): Observable<ChatListElement[]> {
    return this.http.get<ChatListElement[]>(this.apiUrl);
  }
}