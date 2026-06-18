from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import get_db
from app.db.models import User, UserSession

# Схема авторизации
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Контекст для хэширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Исключение для невалидных access-токенов
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Не удалось валидировать учетные данные",
    headers={"WWW-Authenticate": "Bearer"},
)


def hash_password(password: str) -> str:
    """Хеширует чистый пароль"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет соответствие чистого пароля и хеша"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """Генерирует JWT access_token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET_KEY, 
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def generate_refresh_token(data: dict) -> str:
    """Генерирует JWT refresh_token с привязкой к session_id"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET_KEY, 
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_refresh_token(token: str, verify_exp: bool = True) -> dict:
    """Декодирует и проверяет валидность refresh_token"""
    try:
        # Передаем настройки валидации в jwt.decode
        options = {"verify_exp": verify_exp}
        
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM],
            options=options  # <-- Передали опции сюда
        )
        
        if payload.get("type") != "refresh":
            raise JWTError("Неверный тип токена")
            
        return payload
    except JWTError:
        raise JWTError("Ошибка валидации refresh токена")


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Зависимость (Depends) для получения текущего пользователя по access_token"""
    
    # 1. Декодируем и проверяем access_token
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        if payload.get("type") != "access":
            raise credentials_exception
            
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    # 2. Ищем пользователя в базе данных
    user = await db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise credentials_exception

    # 3. Обновление времени последней активности сессии и глобального статуса пользователя
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        query = select(UserSession).where(UserSession.refresh_token == refresh_token)
        result = await db.execute(query)
        session = result.scalar_one_or_none()
        
        if session:
            now = datetime.now(timezone.utc)
            # Защита от частой перезаписи: обновляем базу не чаще чем раз в 5 минут
            if not session.last_activity or (now - session.last_activity.replace(tzinfo=timezone.utc)) > timedelta(minutes=5):
                # Обновляем активность конкретного устройства
                session.last_activity = now
                
                # Обновляем глобальный статус пользователя для списка контактов
                user.last_seen = now
                
                await db.commit()

    return user