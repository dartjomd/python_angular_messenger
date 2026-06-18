import enum
from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import (
    Integer,
    String,
    Boolean,
    Text,
    ForeignKey,
    DateTime,
    Enum,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base
from sqlalchemy.sql import func


# Перечисление для типов чатов
class ChatType(str, enum.Enum):
    DIRECT = "direct"
    GROUP = "group"


# --- ДОБАВЛЯЕМ: Перечисление для типов сообщений ---
class MessageType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    VOICE = "voice"
    SYSTEM = "system"


# ==========================================
# 1. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
# ==========================================
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    # Поле для защищенного пароля (хеша)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),  # База будет сама обновлять время при любом апдейте юзера
    )

class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", on_delete="CASCADE"), nullable=False)
    
    # Сам refresh-токен (хэшировать не обязательно, но это уникальная строка)
    refresh_token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    
    # Метаданные для отображения пользователю "Ваши активные сессии"
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    
    # Тайминги
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    last_activity: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc)
    )


# ==========================================
# 2. ТАБЛИЦА ЧАТОВ
# ==========================================
class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_type: Mapped[ChatType] = mapped_column(
        Enum(ChatType), default=ChatType.DIRECT, nullable=False
    )
    creator_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# ==========================================
# 3. УЧАСТНИКИ ЧАТОВ
# ==========================================
class ChatMember(Base):
    __tablename__ = "chat_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    chat_id: Mapped[int] = mapped_column(
        ForeignKey("chats.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (UniqueConstraint("user_id", "chat_id", name="uq_user_chat"),)


# ==========================================
# 4. ТАБЛИЦА СООБЩЕНИЙ (Обновленная)
# ==========================================
class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(
        ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Текст сообщения, либо путь к файлу/картинке
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # --- ДОБАВЛЯЕМ: Тип сообщения ---
    message_type: Mapped[MessageType] = mapped_column(
        Enum(MessageType), default=MessageType.TEXT, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    reply_to_id: Mapped[Optional[int]] = mapped_column(ForeignKey("messages.id", on_delete="SET NULL"), nullable=True, index=True)


# ==========================================
# 5. ТАБЛИЦА СЕССИЙ
# ==========================================
# class Session(Base):
#     __tablename__ = "sessions"

#     id: Mapped[int] = mapped_column(primary_key=True)
#     user_id: Mapped[int] = mapped_column(
#         ForeignKey("users.id", ondelete="CASCADE"), nullable=False
#     )
#     token: Mapped[str] = mapped_column(
#         String(255), unique=True, nullable=False, index=True
#     )
#     device: Mapped[str] = mapped_column(String(255), nullable=False)
#     created_at: Mapped[datetime] = mapped_column(
#         DateTime(timezone=True), server_default=func.now()
#     )