// 1. Специфичные данные для каждого типа события
export interface WsMessageData {
    id: number;          // Добавили
    chat_id: number;
    text: string;
    sender_id: number | null;
    created_at: string;  // Добавили (прилетает как ISO-строка даты)
}

export interface WsNotificationData {
  notification_id: number;
  title: string;
  body: string;
  type: 'like' | 'system' | 'invite';
}

export interface WsStatusData {
  user_id: number;
  is_online: boolean;
}

// 2. Единый тип-дискриминант (конверт)
export type WsEvent =
  | { type: 'message'; data: WsMessageData }
  | { type: 'notification'; data: WsNotificationData }
  | { type: 'user_status'; data: WsStatusData };


export interface WsSendMessagePayload {
  action: 'send_message'; // Дискриминатор действия для бэкенда
  data: {
    chat_id: number;
    text: string;
  };
}