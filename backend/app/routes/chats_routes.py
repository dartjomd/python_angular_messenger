from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
# Важно: импортируем AsyncSession для асинхронной работы
from sqlalchemy.ext.asyncio import AsyncSession 

from app.db.database import get_db  # Твой асинхронный get_db
from app.security import get_current_user  # Твоя зависимость юзера
from app.db.models import Chat, ChatMember, ChatType, User
from app.schemas import ChatCreateResponse 

router = APIRouter(prefix="/chats", tags=["Chats"])

@router.post("/dialog/{recipient_id}", response_model=ChatCreateResponse)
async def get_or_create_dialog(
    recipient_id: int,
    db: AsyncSession = Depends(get_db), # <-- Меняем на AsyncSession
    current_user: User = Depends(get_current_user)
) -> ChatCreateResponse:
    
    if recipient_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Вы не можете создать чат с самим собой"
        )

    # 1. Асинхронно проверяем собеседника (добавили await и .scalars().first())
    recipient_stmt = select(User).where(User.id == recipient_id, User.is_active == True)
    recipient_result = await db.execute(recipient_stmt)
    recipient = recipient_result.scalars().first()
    
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Пользователь не найден или удален"
        )

    # 2. Ищем существующий DIRECT чат
    stmt = (
        select(ChatMember.chat_id)
        .join(Chat, ChatMember.chat_id == Chat.id)
        .where(
            Chat.chat_type == ChatType.DIRECT,
            ChatMember.user_id.in_([current_user.id, recipient_id])
        )
        .group_by(ChatMember.chat_id)
        .having(func.count(ChatMember.user_id) == 2)
    )
    
    # ВОТ ЗДЕСЬ БЫЛА ОШИБКА: добавляем await перед db.execute!
    result = await db.execute(stmt)
    existing_chat_id = result.scalar_one_or_none() # Теперь вызываем у результата, а не у корутины

    if existing_chat_id:
        return ChatCreateResponse(chat_id=existing_chat_id, message="Чат уже существует")

    # 3. Если чата нет — создаем новую комнату (добавляем await к flush)
    new_chat = Chat(
        chat_type=ChatType.DIRECT,
        creator_id=current_user.id
    )
    db.add(new_chat)
    await db.flush() # <-- Асинхронный flush! Получаем id нового чата

    # 4. Добавляем участников
    member1 = ChatMember(chat_id=new_chat.id, user_id=current_user.id)
    member2 = ChatMember(chat_id=new_chat.id, user_id=recipient_id)
    db.add_all([member1, member2])
    
    await db.commit() # <-- Асинхронный commit!

    return ChatCreateResponse(chat_id=new_chat.id, message="Новый чат успешно создан")