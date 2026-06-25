from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func

# Важно: импортируем AsyncSession для асинхронной работы
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db  # Твой асинхронный get_db
from app.security import get_current_user  # Твоя зависимость юзера
from app.db.models import Chat, ChatMember, ChatType, User
from app.schemas import ChatCreateResponse, ChatListElementResponse

router = APIRouter(prefix="/chats", tags=["Chats"])

chat_with_himself_exception = HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Вы не можете создать чат с самим собой",
)

user_not_found_exception = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Пользователь не найден или удален",
)


@router.get("", response_model=List[ChatListElementResponse])
async def get_user_chats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[ChatListElementResponse]:
    
    # 1. Запрашиваем строго уникальные чаты, где текущий юзер есть в участниках
    stmt = (
        select(Chat)
        .join(ChatMember, Chat.id == ChatMember.chat_id)
        .where(ChatMember.user_id == current_user.id)
        .order_by(Chat.created_at.desc())
    )
    
    result = await db.execute(stmt)
    chats = result.scalars().all() # База вернет чистый список объектов Chat
    
    response_chats = []
    
    for chat in chats:
        # Получаем строковое значение типа чата
        chat_type_str = chat.chat_type.value if hasattr(chat.chat_type, 'value') else str(chat.chat_type)
        
        if chat_type_str == "DIRECT":
            # Ищем собеседника: перебираем участников чата в памяти и берем того, чей ID не наш
            recipient_member = next((m for m in chat.members if m.user_id != current_user.id), None)
            
            if recipient_member and recipient_member.user:
                username = recipient_member.user.username
                avatar_letter = username[0].upper() if username else "?"
                recipient_id = recipient_member.user.id
            else:
                username = "Удаленный пользователь"
                avatar_letter = "?"
                recipient_id = None
                
            last_seen = "15 минут назад" # Временная заглушка активности
        else:
            # Для GROUP чатов (задел на будущее)
            username = getattr(chat, 'title', None) or f"Группа #{chat.id}"
            avatar_letter = "👥"
            recipient_id = None
            last_seen = None

        # Заполняем схему ответа
        response_chats.append(
            ChatListElementResponse(
                id=chat.id,
                chat_type=chat_type_str,
                recipient_id=recipient_id,
                username=username,
                avatar_letter=avatar_letter,
                last_seen=last_seen,
                last_message="Привет! Это последнее тестовое сообщение...",
                last_message_time=chat.created_at
                # is_online=False и unread_count=0 подставятся из дефолтов Pydantic-схемы
            )
        )
        
    return response_chats



@router.post("/dialog/{recipient_id}", response_model=ChatCreateResponse)
async def get_or_create_dialog(
    recipient_id: int,
    db: AsyncSession = Depends(get_db),  # <-- Меняем на AsyncSession
    current_user: User = Depends(get_current_user),
) -> ChatCreateResponse:

    if recipient_id == current_user.id:
        raise chat_with_himself_exception

    # 1. Асинхронно проверяем собеседника (добавили await и .scalars().first())
    recipient_stmt = select(User).where(User.id == recipient_id, User.is_active == True)
    recipient_result = await db.execute(recipient_stmt)
    recipient = recipient_result.scalars().first()

    if not recipient:
        raise user_not_found_exception

    # 2. Ищем существующий DIRECT чат
    stmt = (
        select(ChatMember.chat_id)
        .join(Chat, ChatMember.chat_id == Chat.id)
        .where(
            Chat.chat_type == ChatType.DIRECT,
            ChatMember.user_id.in_([current_user.id, recipient_id]),
        )
        .group_by(ChatMember.chat_id)
        .having(func.count(ChatMember.user_id) == 2)
    )

    # ВОТ ЗДЕСЬ БЫЛА ОШИБКА: добавляем await перед db.execute!
    result = await db.execute(stmt)
    existing_chat_id = (
        result.scalar_one_or_none()
    )  # Теперь вызываем у результата, а не у корутины

    if existing_chat_id:
        return ChatCreateResponse(
            chat_id=existing_chat_id, message="Чат уже существует"
        )

    # 3. Если чата нет — создаем новую комнату (добавляем await к flush)
    new_chat = Chat(chat_type=ChatType.DIRECT, creator_id=current_user.id)
    db.add(new_chat)
    await db.flush()  # <-- Асинхронный flush! Получаем id нового чата

    # 4. Добавляем участников
    member1 = ChatMember(chat_id=new_chat.id, user_id=current_user.id)
    member2 = ChatMember(chat_id=new_chat.id, user_id=recipient_id)
    db.add_all([member1, member2])

    await db.commit()  # <-- Асинхронный commit!

    return ChatCreateResponse(chat_id=new_chat.id, message="Новый чат успешно создан")
