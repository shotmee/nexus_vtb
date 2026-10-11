from fastapi import APIRouter, HTTPException

from app.schemas import ShieldRequest, ShieldResponse
from app.services import shield

router = APIRouter(prefix="/api/shield", tags=["shield"])


@router.post("/check", response_model=ShieldResponse)
def check(req: ShieldRequest):
    if not req.text and not req.image_base64:
        raise HTTPException(422, "Нужен text или image_base64")
    try:
        return shield.check(req.text, req.image_base64)
    except shield.OcrUnavailable as e:
        raise HTTPException(503, str(e))
    except ValueError:
        raise HTTPException(422, "Не удалось прочитать картинку")
