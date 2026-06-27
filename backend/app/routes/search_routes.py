from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.db.models import User
from app.schemas import UserSearchResponse
from app.security import get_current_user

router = APIRouter(prefix='/search', tags=["Search"])

@router.get("/users", response_model=List[UserSearchResponse])
async def search_users(
    query: str = Query(..., min_length=1),
    offset: int = Query(0, ge=0),          
    limit: int = Query(10, ge=1, le=50),   
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[UserSearchResponse]:
    stmt = (
        select(User)
        .where(
            and_(
                or_(
                    User.username.ilike(f"%{query}%"),
                    User.email.ilike(f"%{query}%")
                ),
                User.id != current_user.id,
                User.is_active == True  # Гарантируем, что удаленные аккаунты не попадут в поиск
            )
        )
        .order_by(User.username) 
        .offset(offset)          
        .limit(limit)            
    )
    
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    response_users = []
    
    # Проходимся циклом по найденным пользователям
    for user in users:
        # Генерируем букву для аватарки
        avatar_letter = user.username.strip()[0].upper() if user.username else "?"
        
        # Собираем схему ответа вручную, подкидывая новое поле
        response_users.append(
            UserSearchResponse(
                id=user.id,
                username=user.username,
                email=user.email,
            )
        )
    
    return response_users