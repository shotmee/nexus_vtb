"""Загрузка контента (сценарии, уроки, юр. тексты) из папки content/."""
import json
from functools import lru_cache
from pathlib import Path

from app.config import settings


def _read(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


@lru_cache
def personas() -> dict:
    return {p["id"]: p for p in _read(settings.content_dir / "personas.json")}


@lru_cache
def scenario(scenario_id: str) -> dict:
    return _read(settings.content_dir / "scenarios" / f"{scenario_id}.json")


def scenario_ids() -> list[str]:
    return sorted(p.stem for p in (settings.content_dir / "scenarios").glob("*.json"))


@lru_cache
def legal() -> dict:
    return {item["id"]: item for item in _read(settings.content_dir / "legal.json")["items"]}


@lru_cache
def sos_branches() -> list[dict]:
    return _read(settings.content_dir / "sos" / "branches.json")


@lru_cache
def report_templates() -> dict:
    return _read(settings.content_dir / "sos" / "report_templates.json")


@lru_cache
def lesson(lesson_id: str) -> dict:
    return _read(settings.content_dir / "lessons" / f"{lesson_id}.json")


@lru_cache
def lesson_triggers() -> list[dict]:
    return _read(settings.content_dir / "lessons" / "triggers.json")


@lru_cache
def quest(quest_id: str) -> dict:
    return _read(settings.content_dir / "quest" / f"{quest_id}.json")


def lessons() -> list[dict]:
    items = [lesson(p.stem) for p in (settings.content_dir / "lessons").glob("*.json") if p.stem != "triggers"]
    return sorted(items, key=lambda x: x.get("order", 99))
