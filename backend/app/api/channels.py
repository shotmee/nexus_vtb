"""Каналы роста «Старта»: цели и копилка, мост из «Детского банка» в 14 лет, витрина для «Пушкинской карты».

В демо всё живёт в памяти фейкового банка. В реальном ВТБ: копилка — накопительный счёт 14–25,
мост — API «Детского банка» + согласие родителя в его приложении, «Пушкинская карта» — витрина в ВТБ Онлайн.
"""
import uuid

from fastapi import APIRouter, HTTPException

from app import content
from app.api.learning import ACTION_XP
from app.schemas import (
    BridgeRequest,
    BridgeResponse,
    Goal,
    GoalCreate,
    GoalDeposit,
    GoalResponse,
    PushkinActivateResponse,
)
from app.services.bank import bank
from app.services.demo import engine

router = APIRouter(prefix="/api", tags=["channels"])

# Офферы витрины. «Молодёжь Плюс» (Яндекс Плюс, −50% на связь ВТБ Мобайл) — условия ВТБ с FINOPOLIS 2025
PUSHKIN_OFFERS = [
    "Карта «Старт» бесплатно: обслуживание и переводы без комиссии",
    "Яндекс Плюс — бесплатно в «Молодёжь Плюс»",
    "−50% на мобильную связь ВТБ Мобайл",
    "Копилка на накопительном счёте для 14–25 лет",
    "Защита от вербовки в дропы и «Безопасный выход»",
]


def _check(persona_id: str) -> None:
    if persona_id not in content.personas():
        raise HTTPException(404, f"Нет персонажа {persona_id}")


def _award(account, action: str) -> int:
    """XP один раз за действие — как в /api/progress."""
    key = f"action:{action}"
    if key in account.done:
        return 0
    account.done.add(key)
    account.xp += ACTION_XP.get(action, 0)
    return ACTION_XP.get(action, 0)


def _rub(x: float) -> str:
    return f"{x:,.0f} ₽".replace(",", " ")


# ---------- Цели и копилка ----------
@router.get("/goals/{persona_id}", response_model=list[Goal])
def goals(persona_id: str):
    _check(persona_id)
    return bank.get(persona_id).goals


@router.post("/goals", response_model=Goal)
def create_goal(req: GoalCreate):
    _check(req.persona_id)
    goal = Goal(id=uuid.uuid4().hex[:6], title=req.title, target=req.target)
    bank.get(req.persona_id).goals.append(goal)
    return goal


@router.post("/goals/{goal_id}/deposit", response_model=GoalResponse)
def deposit(goal_id: str, req: GoalDeposit):
    _check(req.persona_id)
    account = bank.get(req.persona_id)
    goal = next((g for g in account.goals if g.id == goal_id), None)
    if not goal:
        raise HTTPException(404, "Нет такой цели")
    if req.amount > bank.available(req.persona_id):
        raise HTTPException(422, "Недостаточно средств")
    account.persona.balance -= req.amount
    goal.saved += req.amount
    gained = _award(account, "first_goal_deposit")
    left = max(goal.target - goal.saved, 0)
    msg = f"В копилке «{goal.title}» {_rub(goal.saved)}"
    msg += " — цель достигнута!" if left == 0 else f", осталось {_rub(left)}"
    if gained:
        msg += f" · +{gained} XP"
    engine.publish_for_persona(req.persona_id)
    return GoalResponse(goal=goal, balance=account.balance, message=msg)


# ---------- Мост «Детский банк» → «Старт» ----------
@router.post("/bridge/migrate", response_model=BridgeResponse)
def bridge(req: BridgeRequest):
    """Ребёнку исполнилось 14: детский кабинет становится разделом «Старт» в одно касание.
    Цели, копилка, XP и пройденные истории сохраняются. Счёт 14–17 — только с согласия родителя (с 01.08.2025)."""
    _check(req.persona_id)
    account = bank.get(req.persona_id)
    if account.persona.segment != "kids":
        raise HTTPException(409, "Аккаунт уже в «Старте»")
    if not req.parent_consent:
        raise HTTPException(403, "Нужно согласие родителя: запрос приходит в его ВТБ Онлайн")
    account.persona.segment = "start"
    account.persona.age = max(account.persona.age, 14)
    _award(account, "bridge")
    stories = sum(1 for k in account.done if k.startswith("lesson:"))
    engine.publish_for_persona(req.persona_id)
    return BridgeResponse(
        persona=account.persona,
        carried_goals=account.goals,
        carried_xp=account.xp,
        carried_stories=stories,
        message="Добро пожаловать в «Старт»! Цели, копилка и опыт сохранены, карта теперь оформлена на вас.",
    )


# ---------- «Пушкинская карта» → «Старт» ----------
@router.get("/pushkin/offers", response_model=list[str])
def pushkin_offers():
    return PUSHKIN_OFFERS


@router.post("/pushkin/{persona_id}/activate", response_model=PushkinActivateResponse)
def pushkin_activate(persona_id: str):
    """Держатель «Пушкинской карты» ВТБ открывает карту «Старт» прямо из витрины."""
    _check(persona_id)
    account = bank.get(persona_id)
    if account.persona.segment != "pushkin":
        raise HTTPException(409, "Карта «Старт» уже оформлена")
    account.persona.segment = "start"
    _award(account, "pushkin_start")
    engine.publish_for_persona(persona_id)
    return PushkinActivateResponse(
        persona=account.persona,
        offers=PUSHKIN_OFFERS,
        message="Карта «Старт» оформлена. «Пушкинская карта» остаётся в приложении рядом.",
    )
