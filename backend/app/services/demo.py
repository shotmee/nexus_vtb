"""Движок демо-сценариев: шаги из content/scenarios/*.json, состояние в памяти, SSE-подписчики."""
import asyncio
from dataclasses import dataclass, field

from app import content
from app.schemas import ChatMessage, DemoState, DemoStep
from app.services.bank import bank
from app.services.risk import live_risk


@dataclass
class _Run:
    scenario_id: str
    step_index: int = 0
    chat_history: list[ChatMessage] = field(default_factory=list)


class DemoEngine:
    def __init__(self) -> None:
        self._runs: dict[str, _Run] = {}
        self._subscribers: dict[str, set[asyncio.Queue]] = {}
        self._loops: dict[asyncio.Queue, asyncio.AbstractEventLoop] = {}

    def _steps(self, scenario_id: str) -> list[DemoStep]:
        return [DemoStep(**s) for s in content.scenario(scenario_id)["steps"]]

    def _persona_id(self, scenario_id: str) -> str:
        return content.scenario(scenario_id)["persona_id"]

    def _apply(self, run: _Run) -> None:
        step = self._steps(run.scenario_id)[run.step_index]
        run.chat_history.extend(step.chat)
        persona_id = self._persona_id(run.scenario_id)
        for ev in step.bank_events:
            if ev.type == "incoming" and ev.amount:
                bank.incoming(persona_id, ev.amount, ev.counterparty or "Неизвестный", ev.is_new_counterparty)
            elif ev.type == "outgoing" and ev.amount:
                bank.outgoing(
                    persona_id, ev.amount, ev.counterparty or "Неизвестный",
                    channel=ev.channel, category=ev.category or "transfers",
                )

    def state(self, scenario_id: str) -> DemoState:
        run = self._runs.get(scenario_id) or self.reset(scenario_id)
        steps = self._steps(scenario_id)
        account = bank.get(self._persona_id(scenario_id))
        return DemoState(
            scenario_id=scenario_id,
            persona=account.persona,
            step_index=run.step_index,
            steps_count=len(steps),
            step=steps[run.step_index],
            chat_history=run.chat_history,
            risk=live_risk(account),
        )

    def reset(self, scenario_id: str) -> _Run:
        bank.reset(self._persona_id(scenario_id))
        run = _Run(scenario_id=scenario_id)
        self._runs[scenario_id] = run
        self._apply(run)
        return run

    def next(self, scenario_id: str) -> None:
        run = self._runs.get(scenario_id) or self.reset(scenario_id)
        if run.step_index < len(self._steps(scenario_id)) - 1:
            run.step_index += 1
            self._apply(run)

    # ---- SSE ----
    def subscribe(self, scenario_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        # publish() вызывают синхронные эндпоинты из пула потоков — запоминаем цикл событий подписчика
        self._loops[q] = asyncio.get_running_loop()
        self._subscribers.setdefault(scenario_id, set()).add(q)
        return q

    def unsubscribe(self, scenario_id: str, q: asyncio.Queue) -> None:
        self._subscribers.get(scenario_id, set()).discard(q)
        self._loops.pop(q, None)

    def publish(self, scenario_id: str) -> None:
        payload = self.state(scenario_id).model_dump_json()
        for q in list(self._subscribers.get(scenario_id, set())):
            loop = self._loops.get(q)
            if loop and not loop.is_closed():
                # asyncio.Queue не потокобезопасна: кладём через цикл событий, иначе подписчик не проснётся
                loop.call_soon_threadsafe(q.put_nowait, payload)

    def publish_for_persona(self, persona_id: str) -> None:
        for scenario_id in list(self._runs):
            if self._persona_id(scenario_id) == persona_id:
                self.publish(scenario_id)


engine = DemoEngine()
