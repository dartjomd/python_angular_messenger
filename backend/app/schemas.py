from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

# Что мы ждем от пользователя при регистрации
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Уникальный никнейм")
    email: EmailStr = Field(..., description="Электронная почта")
    password: str = Field(..., min_length=6, max_length=50, description="Пароль (минимум 6 символов)")

# Что бэкенд вернет в ответ (пароль мы тут, естественно, уже не возвращаем!)
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool

    # Этот подкласс нужен SQLAlchemy 2.0 и Pydantic v2, 
    # чтобы Pydantic умел читать данные прямо из объектов базы данных
    class ConfigDict:
        from_attributes = True

class ErrorResponse(BaseModel):
    detail: str

# Что пользователь присылает для входа
class UserLogin(BaseModel):
    username_or_email: str = Field(..., description="Никнейм или Email пользователя")
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class RefreshResponse(BaseModel):
    access_token: str
    token_type: str

class UserSearchResponse(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True

class ChatCreateResponse(BaseModel):
    chat_id: int
    message: str

    class Config:
        from_attributes = True

class LogoutResponse(BaseModel):
    detail: str

class ChatListElementResponse(BaseModel):
    id: int
    chat_type: str
    
    # Данные собеседника (для DIRECT чатов)
    recipient_id: Optional[int] = None
    username: str
    avatar_letter: str
    
    # Заглушки на будущее (сейчас сделаем дефолтные значения)
    is_online: bool = False
    last_seen: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0

    class Config:
        from_attributes = True