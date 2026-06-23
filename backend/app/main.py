from contextlib import asynccontextmanager
from fastapi import FastAPI

# 1. Импортируем engine и Base для создания таблиц в lifespan
from app.db.database import engine, Base
# 2. Обязательно импортируем файл моделей, чтобы Base знал, какие таблицы создавать
from app.db import models 
from fastapi.middleware.cors import CORSMiddleware  # <-- Импортируем middleware

# 3. ИМПОРТИРУЕМ НАШ РОУТЕР
from app.routes.auth_routes import router as auth_router
from app.routes.search_routes import router as search_router
from app.routes.chats_routes import router as chats_router

origins = [
    "http://localhost:4200",  # Наш Angular фронтенд
    "http://127.0.0.1:4200",
]

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Разрешаем наш Angular порт
    allow_credentials=True,           # Разрешаем передачу кук / авторизационных заголовков
    allow_methods=["*"],              # Разрешаем все методы (GET, POST, PUT, DELETE)
    allow_headers=["*"],              # Разрешаем любые заголовки (Content-Type, Authorization и т.д.)
)

# 4. ПОДКЛЮЧАЕМ РОУТЕР К ПРИЛОЖЕНИЮ
app.include_router(auth_router)
app.include_router(search_router)
app.include_router(chats_router)

# Твой тестовый эндпоинт (можно оставить или удалить)
@app.get("/")
async def root():
    return {"message": "Messenger API работает!"}