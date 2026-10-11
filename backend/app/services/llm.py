"""Клиент LLM. Провайдеры: none (только шаблоны), ollama (on-prem), gigachat (российская модель по API).

LLM только ОБЪЯСНЯЕТ решение модели. Если провайдер недоступен или ответ невалиден —
возвращаем None, и вызывающий код использует шаблон.
"""
import json
import re
import time
import uuid

import httpx

from app.config import settings

GIGACHAT_OAUTH = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
GIGACHAT_CHAT = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"

_gigachat_token: dict = {"value": None, "expires_at": 0.0}


def _parse_json(raw: str) -> dict | None:
    m = re.search(r"\{.*\}", raw.strip(), re.S)  # GigaChat иногда оборачивает JSON в ```
    try:
        answer = json.loads(m.group(0) if m else raw)
    except json.JSONDecodeError:
        return None
    return answer if isinstance(answer, dict) else None


def _verify():
    # TLS GigaChat — на сертификате Минцифры; если его нет в системе, путь задаётся в GIGACHAT_CA_BUNDLE
    return settings.gigachat_ca_bundle or True


def _gigachat_token_value(timeout: float) -> str:
    """OAuth по ключу авторизации; токен живёт ~30 минут — кэшируем с запасом в минуту."""
    if _gigachat_token["value"] and time.time() < _gigachat_token["expires_at"] - 60:
        return _gigachat_token["value"]
    r = httpx.post(
        GIGACHAT_OAUTH,
        headers={
            "Authorization": f"Basic {settings.gigachat_credentials}",
            "RqUID": str(uuid.uuid4()),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"scope": settings.gigachat_scope},
        timeout=timeout,
        verify=_verify(),
    )
    r.raise_for_status()
    body = r.json()
    _gigachat_token["value"] = body["access_token"]
    _gigachat_token["expires_at"] = body.get("expires_at", 0) / 1000 or time.time() + 1800
    return _gigachat_token["value"]


def _gigachat(system: str, user: str, timeout: float) -> dict | None:
    if not settings.gigachat_credentials:
        return None
    token = _gigachat_token_value(timeout)
    r = httpx.post(
        GIGACHAT_CHAT,
        headers={"Authorization": f"Bearer {token}"},
        json={
            "model": settings.gigachat_model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        },
        timeout=timeout,
        verify=_verify(),
    )
    r.raise_for_status()
    return _parse_json(r.json()["choices"][0]["message"]["content"])


def _ollama(system: str, user: str, timeout: float) -> dict | None:
    r = httpx.post(
        f"{settings.ollama_url}/api/chat",
        json={
            "model": settings.ollama_model,
            "format": "json",
            "stream": False,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        },
        timeout=timeout,
    )
    r.raise_for_status()
    return _parse_json(r.json()["message"]["content"])


def complete_json(system: str, user: str, timeout: float = 20.0) -> dict | None:
    providers = {"ollama": _ollama, "gigachat": _gigachat}
    call = providers.get(settings.llm_provider)
    if not call:
        return None
    try:
        return call(system, user, timeout)
    except (httpx.HTTPError, KeyError, ValueError):
        return None
