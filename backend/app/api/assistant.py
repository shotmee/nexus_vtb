from fastapi import APIRouter, HTTPException

from app import content
from app.schemas import AssistantRequest, AssistantResponse
from app.services import assistant
from app.services.bank import bank

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


@router.post("/chat", response_model=AssistantResponse)
def chat(req: AssistantRequest):
    if req.persona_id not in content.personas():
        raise HTTPException(404, f"Нет персонажа {req.persona_id}")
    return assistant.reply(bank.get(req.persona_id), req.message, req.history)
