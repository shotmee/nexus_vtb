"""Цели и копилка, мост «Детский банк» → «Старт», витрина для «Пушкинской карты»."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_goal_deposit_moves_money_and_gives_xp_once():
    client.post("/api/personas/katya/reset")
    goal = client.get("/api/goals/katya").json()[0]
    assert goal["title"] == "Наушники"
    before = next(p for p in client.get("/api/personas").json() if p["id"] == "katya")["balance"]

    r = client.post(f"/api/goals/{goal['id']}/deposit", json={"persona_id": "katya", "amount": 1000}).json()
    assert r["goal"]["saved"] == goal["saved"] + 1000
    assert r["balance"] == before - 1000
    assert "+20 XP" in r["message"]

    again = client.post(f"/api/goals/{goal['id']}/deposit", json={"persona_id": "katya", "amount": 100}).json()
    assert "XP" not in again["message"]


def test_goal_deposit_cannot_exceed_balance():
    client.post("/api/personas/katya/reset")
    goal = client.get("/api/goals/katya").json()[0]
    r = client.post(f"/api/goals/{goal['id']}/deposit", json={"persona_id": "katya", "amount": 10_000_000})
    assert r.status_code == 422


def test_create_goal():
    client.post("/api/personas/lev/reset")
    g = client.post("/api/goals", json={"persona_id": "lev", "title": "Концерт", "target": 5000}).json()
    assert g["saved"] == 0 and any(x["id"] == g["id"] for x in client.get("/api/goals/lev").json())


def test_bridge_needs_parent_consent_and_keeps_goals_and_xp():
    client.post("/api/personas/sonya/reset")
    sonya = next(p for p in client.get("/api/personas").json() if p["id"] == "sonya")
    assert sonya["segment"] == "kids" and sonya["age"] == 13

    denied = client.post("/api/bridge/migrate", json={"persona_id": "sonya", "parent_consent": False})
    assert denied.status_code == 403

    r = client.post("/api/bridge/migrate", json={"persona_id": "sonya", "parent_consent": True}).json()
    assert r["persona"]["segment"] == "start" and r["persona"]["age"] == 14
    assert r["carried_goals"][0]["title"] == "Самокат" and r["carried_goals"][0]["saved"] == 3400
    assert r["carried_xp"] == 140 + 30  # опыт из «Детского банка» + бонус за переход
    assert r["carried_stories"] == 1

    twice = client.post("/api/bridge/migrate", json={"persona_id": "sonya", "parent_consent": True})
    assert twice.status_code == 409


def test_pushkin_holder_becomes_start_client():
    client.post("/api/personas/lev/reset")
    lev = next(p for p in client.get("/api/personas").json() if p["id"] == "lev")
    assert lev["segment"] == "pushkin" and lev["pushkin_balance"] == 2300

    r = client.post("/api/pushkin/lev/activate").json()
    assert r["persona"]["segment"] == "start" and r["offers"]
    assert client.post("/api/pushkin/lev/activate").status_code == 409


def test_new_scenarios_and_lev_pocket_money_is_not_flagged():
    client.post("/api/demo/lev/reset")
    client.post("/api/pushkin/lev/activate")
    state = client.post("/api/demo/lev/next").json()  # предлагают «выкупить» Пушкинскую карту
    assert state["step"]["id"] == "buyout" and state["step"]["expect"]["type"] == "pushkin_offer"
    assert any("Скупаю балансы" in m["text"] for m in state["chat_history"])
    state = client.post("/api/demo/lev/next").json()  # мама пополняет карту
    assert state["step"]["expect"]["action"] == "goal"
    mom = [t for t in client.get("/api/personas/lev/transactions").json() if t["counterparty"] == "Мама"]
    assert mom and not mom[-1]["flagged"]

    client.post("/api/demo/sonya/reset")
    steps = [client.post("/api/demo/sonya/next").json()["step"]["id"] for _ in range(3)]
    assert steps == ["bridge", "first_story", "done"]


def test_turned_14_opens_story_about_own_card():
    lesson = client.post("/api/events", json={"persona_id": "sonya", "type": "turned_14"}).json()["lesson"]
    assert lesson["id"] == "dont_share_card"
