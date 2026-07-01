import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { HeaderChatState, HeaderService } from '../../core/services/header.service';
import { ActivatedRoute } from '@angular/router';
import { WsChatsService } from '../../core/services/ws/ws-chat.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WsMessageData } from '../../interfaces/ws-events.interface';
import { ChatsService } from '../../core/services/chats.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  private headerService = inject(HeaderService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  public wsChatsService = inject(WsChatsService);
  public chatsService = inject(ChatsService);

  public currentChatId = signal<number | null>(null);
  public textInput = signal<string>('');
  public currentUserId = this.authService.currentUser()?.id;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const chatId = Number(params.get('id'));
      
      // ИСПРАВЛЕНО: Правильное условие вместо ошибочного return
      if (chatId) {
        this.currentChatId.set(chatId); // Фиксируем id в сигнале компонента
        this.wsChatsService.loadHistory(chatId);
        this.loadMetadata(chatId);
      }
    });
  }

  public send(): void {
    const text = this.textInput().trim();
    const chatId = this.currentChatId();
    if (!text || !chatId) return;

    this.wsChatsService.sendMessage(chatId, text);
    this.textInput.set('');
  }

  public loadMetadata(chatId: number): void {
    this.chatsService.getChatMetadata(chatId).subscribe({
      next: (metadata) => {
        this.setHeaderData({
          username: metadata.title,
          avatarLetter: metadata.avatar_letter,
          isGroup: metadata.chat_type === 'group',
          isOnline: metadata.direct_info?.is_online ?? false,
          lastSeen: metadata.direct_info?.last_seen 
            ? new Date(metadata.direct_info.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined
        });
      },
      error: (err) => {
        console.error('Ошибка при загрузке метаданных шапки:', err);
        // Дефолтный фолбэк при ошибке сети
        this.setHeaderData({
          username: 'Чат',
          avatarLetter: '?',
          isGroup: false,
          isOnline: false,
          lastSeen: undefined
        });
      }
    });
  }

  // Делаем метод private/protected, так как наружу его светить не обязательно
  protected setHeaderData(data: HeaderChatState): void {
    this.headerService.setChatMode(data);
  }

  ngOnDestroy(): void {
    this.headerService.resetToDefault();
  }
}