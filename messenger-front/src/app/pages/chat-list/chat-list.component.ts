import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatListElement, ChatsService } from '../../core/services/chats.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-list.component.html',
  styleUrl: './chat-list.component.scss'
})
export class ChatListComponent implements OnInit {
  private chatsService = inject(ChatsService);
  private router = inject(Router)
  
  // Здесь будем хранить массив чатов, полученных от бэкенда
  chats = signal<ChatListElement[]>([]);
  // ID выбранного в данный момент чата, чтобы подсвечивать его в списке

  ngOnInit(): void {
    this.loadChats();
  }

  loadChats(): void {
    this.chatsService.getChats().subscribe({
      next: (data) => {
        this.chats.set(data);
      },
      error: (err) => {
        console.error('Ошибка при загрузке чатов:', err);
      }
    });
  }

  selectChat(chatId: number): void {
    this.router.navigate(['/chats', chatId]);
  }
}