from contextlib import asynccontextmanager
from fastapi import FastAPI

# 1. Импортируем engine и Base для создания таблиц в lifespan
from app.db.database import engine, Base
# 2. Обязательно импортируем файл моделей, чтобы Base знал, какие таблицы создавать
from app.db import models 

# 3. ИМПОРТИРУЕМ НАШ РОУТЕР
from app.routers import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # До открытия сервера: создаем таблицы
    print("=== Инициализация базы данных... ===")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("=== База данных успешно подготовлена! ===")
    yield
    # После закрытия сервера: тут будет очистка ресурсов

app = FastAPI(lifespan=lifespan)

# 4. ПОДКЛЮЧАЕМ РОУТЕР К ПРИЛОЖЕНИЮ
app.include_router(auth_router)

# Твой тестовый эндпоинт (можно оставить или удалить)
@app.get("/")
async def root():
    return {"message": "Messenger API работает!"}