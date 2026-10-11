"""Таблицы PostgreSQL.

Состояние фейкового банка храним снимком на аккаунт (JSONB): структура аккаунта в демо меняется часто,
а снимок не требует миграций. В пилоте с реальными данными операции переедут в отдельные таблицы.
"""
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class AccountState(Base):
    __tablename__ = "account_state"

    persona_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    state: Mapped[dict] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
