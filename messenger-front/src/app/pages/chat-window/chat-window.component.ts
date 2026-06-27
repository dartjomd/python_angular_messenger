import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { HeaderService } from '../../core/services/header.service';
import { ActivatedRoute } from '@angular/router';
import { WsChatService } from '../../core/services/ws/ws-chat.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  private headerService = inject(HeaderService);
  private route = inject(ActivatedRoute)
  private authService = inject(AuthService)
  public chatService = inject(WsChatService) 

  public currentChatId = signal<number | null>(null)
  public textInput = signal<string>('')
  public currentUserId = 1;

  ngOnInit(): void {
    // Включаем режим чата в глобальном хедере
    this.headerService.setChatMode({
      username: 'Иван Иванов',
      avatarLetter: 'И',
      isOnline: false, // проверим режим офлайна
      isGroup: false,
      lastSeen: '15 минут назад' // передаем время активности!
    });

    this.route.paramMap.subscribe(params => {
      const chatId = Number(params.get('id'));
      if (chatId) {
        this.currentChatId.set(chatId);
        this.chatService.loadHistory(chatId);
      }
    });
  }

  public send(): void {
    const text = this.textInput().trim();
    const chatId = this.currentChatId();
    
    if (!text || !chatId) return;

    this.chatService.sendMessage(chatId, text);
    this.textInput.set('');
  }

  ngOnDestroy() {
    // Когда пользователь закрывает чат, хедер возвращается в дефолтное состояние (логотип + кнопки)
    this.headerService.resetToDefault();
  }
}
