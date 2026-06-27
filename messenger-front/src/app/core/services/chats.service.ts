import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface ChatMessage {
    chat_id: number;
    text: string;
    sender_id: number;
}

export interface ChatCreateResponse {
  chat_id: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatsService {
  private http = inject(HttpClient);
  // Наш относительный путь. Прокси на dev-сервере перенаправит его на http://localhost:8000/chats
  private apiUrl = '/api/chats';

  getChats(): Observable<ChatListElement[]> {
    return this.http.get<ChatListElement[]>(this.apiUrl);
  }

  getChatMessage(chat_id: number, offset:number = 0, limit: number = 10): Observable<ChatMessage[]> {
    const params = new HttpParams()
      .set('chat_id', chat_id)
      .set('offset', offset.toString())
      .set('limit', limit.toString())
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/dialog`, { params });
  }

  createOrGetDialog(recipientId: number): Observable<ChatCreateResponse> {
    return this.http.post<ChatCreateResponse>(`${this.apiUrl}/create_dialog/${recipientId}`, {});
  }
}