from datetime import datetime, timedelta, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import delete, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.responses import (
    LOGIN_RESPONSES,
    REFRESH_RESPONSES,
    REGISTRATION_RESPONSES,
)  # <-- Импортируем словари
from app.config import settings
from app.db.database import get_db
from app.db.models import User, UserSession
from app.schemas import Token, UserCreate, UserLogin, UserResponse
from app.security import (
    create_access_token,
    decode_refresh_token,
    generate_refresh_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

 # Cookie settings from app configuration
COOKIE_SECURE = settings.COOKIE_SECURE
COOKIE_SAMESITE = settings.COOKIE_SAMESITE

# --- ПЕРЕИСПОЛЬЗУЕМЫЕ ИСКЛЮЧЕНИЯ ---

username_exists_exception = HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Пользователь с таким именем уже существует",
)

credentials_exception = HTTPException(
    status_code=status.HTTP_410_GONE if False else status.HTTP_401_UNAUTHORIZED,
    detail="Неверное имя пользователя/email или пароль",
    headers={"WWW-Authenticate": "Bearer"},
)

refresh_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Недействительный или истекший сессия обновления. Войдите заново.",
    headers={"WWW-Authenticate": "Bearer"},
)

email_exists_exception = HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Пользователь с таким email уже существует",
)

# --- ЭНДПОИНТЫ ---


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses=REGISTRATION_RESPONSES,
)
async def register_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # 1. Проверяем уникальность
    query = select(User).where(
        or_(User.email == user_data.email, User.username == user_data.username)
    )
    result = await db.execute(query)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.username == user_data.username:
            raise username_exists_exception

        if existing_user.email == user_data.email:
            raise email_exists_exception

    # 2. Хешируем пароль
    hashed_pwd = hash_password(user_data.password)

    # 3. Создаем объект модели
    new_user = User(
        username=user_data.username, email=user_data.email, hashed_password=hashed_pwd
    )

    # 4. Сохраняем в базу
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.post("/login", response_model=Token, responses=LOGIN_RESPONSES)
async def login(
    request: Request,
    response: Response,
    # ВМЕСТО user_data: UserLogin используем форму OAuth2
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # 1. Ищем пользователя
    # ВАЖНО: В OAuth2PasswordRequestForm поле всегда называется "username",
    # даже если пользователь вводит туда свой Email. Мы проверяем совпадение и там, и там.
    query = select(User).where(
        or_(
            User.username == form_data.username,
            User.email == form_data.username,
        )
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise credentials_exception

    # 2. Генерируем токены
    access_token = create_access_token(data={"sub": str(user.id)})

    # Создаем сессию
    new_session = UserSession(
        user_id=user.id,
        refresh_token="temporary",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        user_agent=request.headers.get("user-agent", "Unknown"),
        ip_address=request.client.host if request.client else "Unknown",
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    # Генерируем правильный refresh_token с session_id
    refresh_token = generate_refresh_token(
        data={"sub": str(user.id), "session_id": str(new_session.id)}
    )

    # Перезаписываем заглушку реальным токеном
    new_session.refresh_token = refresh_token
    user.is_active = True
    await db.commit()

    # Записываем Refresh Token в HttpOnly куку
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=30 * 24 * 60 * 60,
    )

    # Возвращаем access_token для Swagger/Фронтенда
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh", response_model=Token, responses=REFRESH_RESPONSES)
async def refresh_tokens(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
):
    # 1. Достаем refresh_token из кук браузера
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise refresh_exception

    # 2. Ищем сессию в базе данных по текущему токену
    query = select(UserSession).where(UserSession.refresh_token == refresh_token)
    result = await db.execute(query)
    session = result.scalar_one_or_none()

    # 🚨 РАЗДЕЛЯЕМ ОБРАБОТКУ: Если токена нет в базе
    if not session:
        try:
            payload = decode_refresh_token(refresh_token)
            user_id = payload.get("sub")
            session_id = payload.get("session_id")

            if user_id and session_id:
                # 🛠️ ИСПРАВЛЕНИЕ: Преобразуем строку в uuid.UUID вместо int!
                session_uuid = uuid.UUID(session_id)
                
                check_query = select(UserSession).where(UserSession.id == session_uuid)
                check_result = await db.execute(check_query)
                existing_session = check_result.scalar_one_or_none()

                if existing_session:
                    # Тут user_id у тебя в модели остался int, так что его можно оставить как int(user_id)
                    alert_query = delete(UserSession).where(UserSession.user_id == int(user_id))
                    await db.execute(alert_query)
                    await db.commit()
                    
                    response.delete_cookie("refresh_token", httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE)
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Атака обнаружена! Повторное использование токена. Все сессии сброшены."
                    )
            raise refresh_exception

        except Exception as e:
            # Если хочешь подстраховаться и увидеть, если упадет что-то еще:
            raise refresh_exception

    # 3. Валидация: если срок жизни сессии истек
    if session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        await db.delete(session)
        await db.commit()
        raise refresh_exception

    # 4. Проверка на User-Agent (Anti-Hijacking)
    current_user_agent = request.headers.get("user-agent", "Unknown")
    if session.user_agent != current_user_agent:
        await db.delete(session)
        await db.commit()
        raise refresh_exception

    # 5. Ротация токенов: генерируем новые
    new_access_token = create_access_token(data={"sub": str(session.user_id)})

    # В refresh_token теперь обязательно зашиваем и user_id, и id самой сессии!
    new_refresh_token = generate_refresh_token(
        data={"sub": str(session.user_id), "session_id": str(session.id)}
    )

    # 6. Обновляем сессию в базе данных
    session.refresh_token = new_refresh_token
    session.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    session.ip_address = request.client.host if request.client else "Unknown"

    await db.commit()

    # 7. Отдаем куку
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=30 * 24 * 60 * 60,
    )

    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
):
    # 1. Достаем refresh_token из кук
    refresh_token = request.cookies.get("refresh_token")

    if refresh_token:
        # 2. Ищем и удаляем сессию из базы данных
        query = select(UserSession).where(UserSession.refresh_token == refresh_token)
        result = await db.execute(query)
        session = result.scalar_one_or_none()

        if session:
            await db.delete(session)
            await db.commit()

    # 3. Стираем куку на фронтенде
    # Метод delete_cookie просто ставит дату протухания куки в прошлое,
    # и браузер моментально её уничтожает.
    response.delete_cookie(
        key="refresh_token", httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE
    )

    return {"detail": "Успешный выход из системы"}


@router.post("/logout-all")
async def logout_from_all_devices(
    response: Response,
    current_user: User = Depends(
        get_current_user
    ),  # <-- Защищаем роут, требуя Access Token
    db: AsyncSession = Depends(get_db),
):
    # 1. Берем id текущего залогиненного пользователя
    user_id = current_user.id
    #  ставить is_active = False !!!!!
    # 2. Удаляем ИЗ БАЗЫ абсолютно ВСЕ сессии этого пользователя
    # Больше ни одно его устройство (включая текущее) не сможет обновить токен.
    query = delete(UserSession).where(UserSession.user_id == user_id)
    await db.execute(query)
    await db.commit()

    # 3. Стираем куку refresh_token на текущем устройстве,
    # чтобы у пользователя сразу очистился браузер
    response.delete_cookie(
        key="refresh_token", httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE
    )

    return {"detail": "Успешный выход со всех устройств. Все сессии аннулированы."}
