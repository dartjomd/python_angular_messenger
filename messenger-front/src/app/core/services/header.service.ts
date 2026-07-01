import { Injectable, signal } from '@angular/core';

export interface HeaderChatState {
  username: string;
  avatarLetter: string;
  isOnline: boolean;
  isGroup: boolean;
  lastSeen?: string; // Время последней активности (опционально)
}

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  // Сигнал хранит состояние чата. Если null — показываем обычное меню мессенджера
  chatState = signal<HeaderChatState | null>(null);

  setChatMode(state: HeaderChatState) {
    this.chatState.set(state);
  }

  resetToDefault() {
    this.chatState.set(null);
  }
}