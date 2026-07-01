
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.db.database import AsyncSessionLocal, get_db
from app.db.models import ChatMember, Message, User
from app.security import get_current_user, get_current_user_ws
from app.chats.ws_manager import manager
from app.schemas import WsMessageData, WsMessageEventResponse



router = APIRouter(prefix='/ws', tags=["WebSocket"])

@router.websocket("/ws")
async def handle_chat_message(
    websocket: WebSocket,
    token: str | None = Query(None)
):
    current_user = await get_current_user_ws(token)
    if current_user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(user_id=current_user.id, websocket=websocket)

    try:
        while True:
            payload = await websocket.receive_json()

            data_block = payload.get('data', {})
            chat_id_raw = data_block.get('chat_id')
            text = data_block.get('text')

            if chat_id_raw is None or text is None:
                continue

            chat_id = int(chat_id_raw)

            async with AsyncSessionLocal() as db:
                validate_user_stmp = select(ChatMember).where(
                    ChatMember.user_id == current_user.id,
                    ChatMember.chat_id == chat_id
                )
                validate_user_result = await db.execute(validate_user_stmp)
                validated_user = validate_user_result.scalar_one_or_none()

                if validated_user is None:
                    manager.disconnect(user_id=current_user.id, websocket=websocket)
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                    return

                new_message = Message(
                    chat_id=chat_id,
                    user_id=current_user.id,
                    message=text
                )

                db.add(new_message)
                await db.commit()
                await db.refresh(new_message) 

                chat_members_stmp = select(ChatMember.user_id).where(
                    ChatMember.chat_id == chat_id
                )
                chat_members_result = await db.execute(chat_members_stmp)
                chat_members = list(chat_members_result.scalars().all())

            message_data = WsMessageData(
                id=new_message.id,
                chat_id=new_message.chat_id,
                text=new_message.message,
                sender_id=new_message.user_id,
                created_at=new_message.created_at
            )
            
            response_event = WsMessageEventResponse(
                type="message",
                data=message_data
            )

            broadcast_payload = response_event.model_dump(mode='json')

            # 6. Рассылаем всем участникам чата
            await manager.broadcast_to_chat(message=broadcast_payload, member_ids=chat_members)
    except WebSocketDisconnect:
        manager.disconnect(user_id=current_user.id, websocket=websocket)
        return False
    
