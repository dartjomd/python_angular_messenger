from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.db.models import User
from app.schemas import UserSearchResponse
from app.security import get_current_user

# Создаем отдельный роутер. 
# Префикс "/auth" мы НЕ пишем здесь, его лучше указать при include_router в main.py,
# чтобы эндпоинты этого файла красиво дополняли модуль Auth.
router = APIRouter(tags=["Search"])

@router.get("/search_users", response_model=List[UserSearchResponse])
async def search_users(
    query: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Защищаем эндпоинт авторизацией
):
    stmt = (
        select(User)
        .where(
            or_(
                User.username.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%")
            )
        )
        .where(User.id != current_user.id) 
        .limit(20)  # Ограничиваем выдачу первыми 20 совпадениями
    )
    
    result = await db.execute(stmt)
    users = result.scalars().all()
    return users