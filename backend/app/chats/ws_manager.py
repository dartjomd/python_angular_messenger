from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # Храним активные соединения: {user_id: [список_вебсокетов]}
        # Список нужен на случай, если пользователь открыл мессенджер в двух вкладках
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        """Отправить сообщение конкретному пользователю, если он онлайн"""
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Если сокет «протух», а мы не успели убрать
                    pass

    async def broadcast_to_chat(self, message: dict, member_ids: List[int]):
        """Разослать сообщение всем участникам чата, кто сейчас в сети"""
        for user_id in member_ids:
            await self.send_personal_message(message, user_id)

# Создаем единый экземпляр менеджера для всего приложения
manager = ConnectionManager()