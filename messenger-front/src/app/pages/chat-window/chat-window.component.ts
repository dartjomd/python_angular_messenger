import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { HeaderService } from '../../core/services/header.service';

@Component({
  selector: 'app-chat-window',
  imports: [],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  private headerService = inject(HeaderService);

  ngOnInit() {
    // Включаем режим чата в глобальном хедере
    this.headerService.setChatMode({
      username: 'Иван Иванов',
      avatarLetter: 'И',
      isOnline: false, // проверим режим офлайна
      lastSeen: '15 минут назад' // передаем время активности!
    });
  }

  ngOnDestroy() {
    // Когда пользователь закрывает чат, хедер возвращается в дефолтное состояние (логотип + кнопки)
    this.headerService.resetToDefault();
  }
}
