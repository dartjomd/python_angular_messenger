import { inject, Injectable, signal } from "@angular/core";
import { WsManagerService } from "./ws-manager.service";
import { ChatMessage, ChatsService } from "../chats.service";
import { filter, map } from "rxjs";
import { WsEvent, WsMessageData, WsSendMessagePayload } from "../../../interfaces/ws-events.interface";
import { AuthService } from "../auth.service";

@Injectable({
    providedIn: 'root'
})
export class WsChatService {
    private wsService = inject(WsManagerService);
    private chatsService = inject(ChatsService);
    private authService = inject(AuthService)

    // Храним ID текущего активного чата прямо в сервисе
    private activeChatId: number | null = null;

    public messageList = signal<WsMessageData[]>([]);

    /**
     * Метод вызывается из Компонента Страницы, который сам знает свой chatId из URL
     */
    public loadHistory(chatId: number) {
        // Запоминаем, какой чат сейчас открыт на экране
        this.activeChatId = chatId;
        
        // Очищаем экран перед загрузкой нового чата
        this.messageList.set([]);

        // Передаем chatId, который нам прокинул компонент
        this.chatsService.getChatMessage(chatId, 0, 50).subscribe({
            next: (history) => this.messageList.set(history),
            error: (err) => console.error('Ошибка при получении истории сообщений: ', err)
        });
    }

    public constructor() {
        this.wsService.ws_stream$.pipe(
            filter((event: WsEvent) => event && event.type === 'message' && event.data.chat_id === this.activeChatId),
            map((event: WsEvent) => {
                if (event.type === 'message') return event.data
                throw new Error('Unexpected event type')
            })
        ).subscribe({
            next: (msg: WsMessageData) => {
                const newMessage: WsMessageData = {
                    chat_id: msg.chat_id,
                    text: msg.text,
                    sender_id: msg.sender_id
                };
                
                this.messageList.update(currentList => [...currentList, newMessage]);
            }
        });

        this.authService.logout$.subscribe(() => {
            this.clearState();
        });
    }

    public sendMessage(chatId: number, text: string) {
        const payload: WsSendMessagePayload = {
            action: 'send_message',
            data: {
                chat_id: chatId,
                text: text
            }
        };
        this.wsService.send(payload);
    }

    public clearState(): void {
        this.messageList.set([]); 
        this.activeChatId = null; 
    }
}