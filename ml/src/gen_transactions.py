"""Генератор синтетических транзакций.

Профили: normal_teen, student_parttime, self_employed, drop_newbie, drop_active.
label = 1 только у транзитных переводов дропа (переслал дальше чужие деньги), остальное 0.

В выборку специально заложены «трудные» легальные случаи, похожие на дропов:
сбор денег на подарок (много незнакомых отправителей → один перевод дальше),
перепродажа билетов, самозанятые с потоком оплат от новых клиентов.
Без них модель выучит «незнакомец + перевод дальше = дроп» и будет раздражать честных клиентов.

    python src/gen_transactions.py --clients 3000 --days 60 --out data/transactions.parquet
    python src/gen_transactions.py --seed-personas          # история демо-персонажей → content/personas.json
"""
import argparse
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

PROFILES = ["normal_teen", "student_parttime", "self_employed", "drop_newbie", "drop_active"]
WEIGHTS = [0.45, 0.25, 0.10, 0.12, 0.08]
START = datetime(2026, 7, 1)

MERCHANTS = ["Продукты", "Кофейня", "Транспорт", "Столовая", "Аптека", "Одежда", "Доставка еды",
             "Кино", "Книжный", "Фастфуд", "Спорттовары", "Электроника", "Маркетплейс", "Такси", "Канцтовары"]
FRIEND_NAMES = ["Саша", "Лиза", "Никита", "Даня", "Вика", "Миша", "Аня", "Егор", "Полина", "Тимур", "Соня", "Кирилл"]
PERSONAS_PATH = Path(__file__).resolve().parents[2] / "content" / "personas.json"


@dataclass
class Tx:
    client_id: int
    ts: datetime
    amount: float
    direction: str          # in | out
    counterparty: str
    channel: str            # sbp | card | cash | salary
    label: int = 0
    is_new_counterparty: bool = False
    tx_id: str = ""


class Client:
    def __init__(self, cid: int, profile: str, rng: np.random.Generator, days: int):
        self.id, self.profile, self.rng, self.days = cid, profile, rng, days
        self.txs: list[Tx] = []
        self._strangers = 0
        r = rng
        if profile == "normal_teen":
            self.age, self.card_age = int(r.integers(14, 18)), float(r.integers(1, 1500))
        elif profile == "student_parttime":
            self.age, self.card_age = int(r.integers(18, 23)), float(r.integers(100, 1800))
        elif profile == "self_employed":
            self.age, self.card_age = int(r.integers(19, 23)), float(r.integers(200, 1800))
        elif profile == "drop_newbie":
            self.age, self.card_age = int(r.integers(14, 21)), float(r.integers(5, 1500))
        else:
            self.age, self.card_age = int(r.integers(16, 23)), float(r.integers(1, 900))
        self.friends = [f"{n} (друг)" for n in r.choice(FRIEND_NAMES, size=int(r.integers(3, 8)), replace=False)]
        self.merchants = list(r.choice(MERCHANTS, size=int(r.integers(5, 10)), replace=False))

    # ---- примитивы ----
    def stranger(self) -> str:
        self._strangers += 1
        return f"Незнакомец-{self.id}-{self._strangers}"

    def at(self, day: int, hour: float | None = None) -> datetime:
        if hour is None:
            # днём чаще, ночью редко
            hour = float(self.rng.choice([self.rng.uniform(8, 23), self.rng.uniform(0, 8)], p=[0.93, 0.07]))
        return START + timedelta(days=day, hours=hour)

    def add(self, ts, amount, direction, counterparty, channel, label=0):
        if ts < START + timedelta(days=self.days):
            self.txs.append(Tx(self.id, ts, round(float(amount), 0), direction, counterparty, channel, label))

    def lognorm(self, median: float, sigma: float = 0.6) -> float:
        return max(50.0, float(self.rng.lognormal(np.log(median), sigma)))

    # ---- повседневная жизнь ----
    def daily_spend(self, day: int, lam: float, median: float):
        for _ in range(self.rng.poisson(lam)):
            self.add(self.at(day), self.lognorm(median), "out", str(self.rng.choice(self.merchants)), "card")

    def teen_life(self, day: int):
        r = self.rng
        self.daily_spend(day, 1.3, 300)
        if day % 7 == self.id % 7:
            self.add(self.at(day, r.uniform(9, 21)), r.integers(5, 31) * 100, "in", str(r.choice(["Мама", "Папа"])), "sbp")
        if r.random() < 0.2:
            self.add(self.at(day), self.lognorm(300), "out", str(r.choice(self.friends)), "sbp")
        if r.random() < 0.12:
            self.add(self.at(day), self.lognorm(300), "in", str(r.choice(self.friends)), "sbp")
        if r.random() < 0.02:  # новый знакомый, небольшая сумма
            name = f"Знакомый-{self.id}-{day}"
            self.friends.append(name)
            self.add(self.at(day), self.lognorm(250), "out", name, "sbp")

    def student_life(self, day: int):
        r = self.rng
        self.daily_spend(day, 2.0, 450)
        dom = (START + timedelta(days=day)).day
        if dom in (5, 20):
            self.add(self.at(day, r.uniform(9, 12)), self.lognorm(15000, 0.3), "in", "Работодатель", "salary")
        if dom == 10:
            self.add(self.at(day), self.lognorm(5000, 0.4), "in", "Мама", "sbp")
            self.add(self.at(day, r.uniform(12, 22)), self.lognorm(9000, 0.3), "out", "Арендодатель", "sbp")
        if r.random() < 0.15:  # репетиторство, фриланс: оплата от нового человека
            self.add(self.at(day), self.lognorm(1500, 0.5), "in", self.stranger(), "sbp")
        if r.random() < 0.15:
            self.add(self.at(day), self.lognorm(500), "out", str(r.choice(self.friends)), "sbp")
        if r.random() < 0.04:  # покупка с рук
            self.add(self.at(day), self.lognorm(2500), "out", f"Продавец-{self.id}-{day}", "sbp")
        if r.random() < 0.01:
            self.add(self.at(day), r.integers(10, 51) * 100, "out", "Банкомат", "cash")

    def self_employed_life(self, day: int):
        r = self.rng
        self.daily_spend(day, 2.0, 500)
        income_today = 0.0
        for _ in range(r.poisson(0.7)):
            amount = self.lognorm(5000, 0.5)
            payer = self.stranger() if r.random() < 0.7 else str(r.choice(self.friends))
            self.add(self.at(day), amount, "in", payer, "sbp")
            income_today += amount
        if income_today and r.random() < 0.5:  # оплата поставщику, иногда сразу
            supplier = f"Поставщик-{self.id}-{int(r.integers(0, 6))}"
            self.add(self.at(day, r.uniform(18, 23.9)), income_today * r.uniform(0.3, 0.9), "out", supplier, "sbp")
        if day % 7 == 0:
            self.add(self.at(day, 22), self.lognorm(6000, 0.5), "out", "Свой накопительный счёт", "sbp")

    # ---- трудные легальные случаи ----
    def gift_collection(self, day: int):
        r = self.rng
        t0, total = self.at(day, r.uniform(10, 16)), 0.0
        for k in range(int(r.integers(4, 11))):
            amount = r.integers(2, 11) * 100
            self.add(t0 + timedelta(minutes=float(r.uniform(0, 240))), amount, "in", self.stranger(), "sbp")
            total += amount
        delay = float(r.uniform(10, 120)) if r.random() < 0.4 else float(r.uniform(240, 1800))
        self.add(t0 + timedelta(minutes=240 + delay), total * r.uniform(0.9, 1.0), "out", f"Магазин подарков-{self.id}-{day}", "sbp")

    def relay_family(self, day: int):
        """Родственник впервые переводит деньги, чтобы передать маме: незнакомец → почти всё дальше, быстро."""
        r = self.rng
        t0 = self.at(day, r.uniform(9, 22))
        amount = self.lognorm(8000, 0.6)
        self.add(t0, amount, "in", self.stranger(), "sbp")
        self.add(t0 + timedelta(minutes=float(r.uniform(3, 90))), amount, "out", str(r.choice(["Мама", "Папа", "Бабушка"])), "sbp")

    def resale(self, day: int):
        r = self.rng
        t0 = self.at(day, r.uniform(10, 20))
        amount = self.lognorm(4000, 0.4)
        self.add(t0, amount, "in", self.stranger(), "sbp")
        self.add(t0 + timedelta(minutes=float(r.uniform(20, 600))), amount * r.uniform(0.6, 0.95), "out", f"Продавец билетов-{self.id}-{day}", "sbp")

    # ---- дропы ----
    def drop_episode(self, day: int, senders: int, median_amount: float, recipients: list[str], night: float):
        r = self.rng
        hour = float(r.uniform(0, 6)) if r.random() < night else float(r.uniform(9, 23))
        t, total = self.at(day, hour), 0.0
        for _ in range(senders):
            amount = self.lognorm(median_amount, 0.5)
            self.add(t, amount, "in", self.stranger(), "sbp")
            total += amount
            t += timedelta(minutes=float(r.uniform(1, 40)))
        # задержка до пересылки: обычно минуты, иногда часы
        delay = float(r.lognormal(np.log(12), 0.9)) if r.random() < 0.75 else float(r.uniform(60, 900))
        t += timedelta(minutes=delay)
        if r.random() < 0.25:  # часть снимают наличными
            cash = total * r.uniform(0.2, 0.5)
            self.add(t, cash, "out", "Банкомат", "cash")
            total -= cash
            t += timedelta(minutes=float(r.uniform(5, 40)))
        forward = total * r.uniform(0.5, 0.97)
        parts = int(r.integers(1, 4))
        for p in range(parts):
            to = str(r.choice(recipients)) if recipients and r.random() < 0.25 else f"Получатель-{self.id}-{day}-{p}"
            recipients.append(to)
            self.add(t, forward / parts, "out", to, "sbp", label=1)
            t += timedelta(minutes=float(r.uniform(1, 15)))

    def generate(self) -> list[Tx]:
        r, days = self.rng, self.days
        life = {"normal_teen": self.teen_life, "student_parttime": self.student_life,
                "self_employed": self.self_employed_life}
        base = self.profile
        if base == "drop_newbie":
            base = "normal_teen" if self.age < 18 else "student_parttime"
        elif base == "drop_active":
            base = "normal_teen" if self.age < 18 else "student_parttime"
        for day in range(days):
            life[base](day)
        if r.random() < 0.5:
            for _ in range(int(r.integers(1, 3))):
                self.gift_collection(int(r.integers(0, days)))
        if self.profile in ("student_parttime", "self_employed") and r.random() < 0.35:
            for _ in range(int(r.integers(1, 4))):
                self.resale(int(r.integers(0, days)))
        if r.random() < 0.2:
            self.relay_family(int(r.integers(0, days)))

        recipients: list[str] = []
        if self.profile == "drop_newbie":
            d0 = int(r.integers(15, days - 3))
            for k in range(int(r.integers(1, 4))):
                self.drop_episode(min(days - 1, d0 + k * int(r.integers(1, 4))), 1, 20000, recipients, night=0.1)
        elif self.profile == "drop_active":
            day = int(r.integers(0, 5))
            while day < days:
                self.drop_episode(day, int(r.integers(1, 6)), 15000, recipients, night=0.25)
                day += int(r.integers(1, 4))
        return self.finalize()

    def finalize(self) -> list[Tx]:
        self.txs.sort(key=lambda t: t.ts)
        seen: set[str] = set()
        for i, t in enumerate(self.txs):
            t.is_new_counterparty = t.counterparty not in seen
            seen.add(t.counterparty)
            t.tx_id = f"{self.id}-{i}"
        return self.txs


def generate(clients: int, days: int, seed: int = 42) -> tuple[pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(seed)
    profiles = rng.choice(PROFILES, size=clients, p=WEIGHTS)
    txs, info = [], []
    for cid, profile in enumerate(profiles):
        c = Client(cid, str(profile), rng, days)
        txs.extend(asdict(t) for t in c.generate())
        info.append({"client_id": cid, "profile": c.profile, "age": c.age, "card_age_days": c.card_age})
    return pd.DataFrame(txs), pd.DataFrame(info)


# ---- демо-персонажи ----
PERSONA_PROFILES = {"artem": "normal_teen", "dima": "normal_teen", "katya": "student_parttime"}


def seed_personas(days: int = 30, seed: int = 7) -> None:
    """Дописывает в content/personas.json правдоподобную историю за `days` дней.

    Ручные записи (Мама, Кофейня у школы…) сохраняются; сгенерированные помечены "generated": true
    и при повторном запуске заменяются. Без незнакомцев и подписок, чтобы не ломать сценарии.
    """
    personas = json.loads(PERSONAS_PATH.read_text(encoding="utf-8"))
    rng = np.random.default_rng(seed)
    end = START + timedelta(days=days)
    for p in personas:
        profile = PERSONA_PROFILES.get(p["id"])
        if not profile:
            continue
        c = Client(0, profile, rng, days)
        c.age = p["age"]
        life = c.teen_life if profile == "normal_teen" else c.student_life
        for day in range(days):
            life(day)
        manual = [h for h in p.get("history", []) if not h.get("generated")]
        generated = []
        for t in c.finalize():
            if t.counterparty.startswith(("Незнакомец", "Знакомый", "Продавец")) or t.channel == "salary":
                continue  # незнакомцы и зарплата есть в сценариях — в фоновой истории не нужны
            generated.append({
                "days_ago": round((end - t.ts).total_seconds() / 86400, 2),
                "amount": t.amount, "direction": t.direction, "counterparty": t.counterparty,
                "channel": t.channel, "generated": True,
            })
        p["history"] = sorted(manual + generated, key=lambda h: -h["days_ago"])
    PERSONAS_PATH.write_text(json.dumps(personas, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"История персонажей обновлена: {PERSONAS_PATH}")


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser()
    p.add_argument("--clients", type=int, default=3000)
    p.add_argument("--days", type=int, default=60)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--out", default="data/transactions.parquet")
    p.add_argument("--seed-personas", action="store_true", help="только обновить историю демо-персонажей")
    args = p.parse_args()
    if args.seed_personas:
        seed_personas()
    else:
        tx, clients = generate(args.clients, args.days, args.seed)
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        tx.to_parquet(out, index=False)
        clients.to_parquet(out.with_name("clients.parquet"), index=False)
        pos = tx[tx.label == 1]
        print(f"{len(tx)} операций, {len(clients)} клиентов, транзитных переводов дропов: {len(pos)}")
        print(clients.profile.value_counts().to_string())
