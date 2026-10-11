import asyncio

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app import content
from app.schemas import DemoState, ScenarioInfo
from app.services.demo import engine

router = APIRouter(prefix="/api/demo", tags=["demo"])


def _check(scenario_id: str) -> None:
    if scenario_id not in content.scenario_ids():
        raise HTTPException(404, f"Нет сценария {scenario_id}")


@router.get("/scenarios", response_model=list[ScenarioInfo])
def scenarios():
    result = []
    for sid in content.scenario_ids():
        s = content.scenario(sid)
        result.append(ScenarioInfo(id=sid, persona=s["persona_id"], title=s["title"], steps_count=len(s["steps"])))
    return result


@router.get("/{scenario_id}", response_model=DemoState)
def state(scenario_id: str):
    _check(scenario_id)
    return engine.state(scenario_id)


@router.post("/{scenario_id}/reset", response_model=DemoState)
def reset(scenario_id: str):
    _check(scenario_id)
    engine.reset(scenario_id)
    engine.publish(scenario_id)
    return engine.state(scenario_id)


@router.post("/{scenario_id}/next", response_model=DemoState)
def next_step(scenario_id: str):
    _check(scenario_id)
    engine.next(scenario_id)
    engine.publish(scenario_id)
    return engine.state(scenario_id)


@router.get("/{scenario_id}/stream")
async def stream(scenario_id: str, request: Request):
    """SSE: новое состояние демо после каждого шага, перевода или действия в SOS."""
    _check(scenario_id)
    q = engine.subscribe(scenario_id)

    async def events():
        try:
            yield f"data: {engine.state(scenario_id).model_dump_json()}\n\n"
            while not await request.is_disconnected():
                try:
                    payload = await asyncio.wait_for(q.get(), timeout=15)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            engine.unsubscribe(scenario_id, q)

    return StreamingResponse(events(), media_type="text/event-stream")
