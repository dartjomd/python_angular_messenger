import { inject, Injectable, Injector } from '@angular/core';
import { AuthService } from '../auth.service';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, Subject } from 'rxjs';
import { WsEvent } from '../../../interfaces/ws-events.interface';

@Injectable({
    providedIn: 'root'
})
export class WsManagerService {
    private socket$: WebSocketSubject<any> | null = null;
    
    // Генерируем внутренний распределитель событий
    private messageSubject$ = new Subject<WsEvent>();
    
    // Публичный поток «только для чтения» для других сервисов
    public ws_stream$: Observable<WsEvent> = this.messageSubject$.asObservable();

    private injector = inject(Injector); // Инжектируем глобальный инжектор вместо самого сервиса

    private getAuthService(): AuthService {
        return this.injector.get(AuthService); // Берем сервис лениво по требованию
    }

    public connect(): void {
        // Защита от повторного переподключения, если сокет уже открыт
        if (this.socket$) {
            return;
        }

        const token = this.getAuthService().accessToken;
        if (!token) {
            console.error('Невозможно подключить сокет: пользователь не авторизован');
            return;
        }

        const url = `ws://localhost:8000/ws/ws?token=${token}`;
        
        // Создаем сокет
        console.log('create websocket');
        
        this.socket$ = webSocket({
            url: url,
            // Добавим хук закрытия сокета, чтобы занулять переменную
            closeObserver: {
                next: () => {
                    console.log('Коннект с бэкендом закрыт');
                    this.socket$ = null;
                }
            }
        });

        // Подписываемся на сокет и перенаправляем данные в наш публичный поток
        this.socket$.subscribe({
            next: (msg: WsEvent) => this.messageSubject$.next(msg), // Проталкиваем сообщение в трубу
            error: (err) => {
                console.error('Ошибка WebSocket:', err);
                this.socket$ = null;
            },
            complete: () => {
                this.socket$ = null;
            }
        });
    }

    public disconnect() {
        this.socket$?.complete()
        this.socket$ = null
    }

    public send(msg: any): void {
        if (this.socket$) {
            this.socket$.next(msg);
        } else {
            console.error('Сокет не подключен! Лог отправки отклонён:', msg);
        }
    }
}