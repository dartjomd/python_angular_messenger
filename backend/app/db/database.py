from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# 1. Создаем асинхронный движок. 
# echo=True заставит SQL-запросы красиво печататься в логи докера (очень удобно для отладки)
engine = create_async_engine(settings.DATABASE_URL, echo=True)

# 2. Создаем фабрику асинхронных сессий
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# 3. Базовый класс для всех будущих моделей (таблиц)
class Base(DeclarativeBase):
    pass

# 4. Функция-зависимость (Dependency) для получения сессии БД в эндпоинтах FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session