from typing import Any, Dict, Union
from fastapi import status
from app.schemas import ErrorResponse

# Явно объявляем тип для словарей Swagger-ответов
REGISTRATION_RESPONSES: Dict[Union[int, str], Dict[str, Any]] = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorResponse,
        "description": "Пользователь с таким именем или email уже существует",
        "content": {
            "application/json": {
                "example": {"detail": "Пользователь с таким именем или email уже существует"}
            }
        }
    }
}

LOGIN_RESPONSES: Dict[Union[int, str], Dict[str, Any]] = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorResponse,
        "description": "Неверное имя пользователя/email или пароль",
        "content": {
            "application/json": {
                "example": {"detail": "Неверное имя пользователя/email или пароль"}
            }
        }
    }
}

REFRESH_RESPONSES: Dict[Union[int, str], Dict[str, Any]] = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorResponse,
        "description": "Недействительная или истекшая сессия (требуется повторный вход)",
        "content": {
            "application/json": {
                "example": {"detail": "Недействительный refresh токен"}
            }
        }
    }
}