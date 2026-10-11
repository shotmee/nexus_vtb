"""Сравнение LLM для объяснений Щита (PLAN.md, §9.3): задержка, валидность JSON, нарушения правил, понятность.

LLM только объясняет вердикт классификатора. Берём 30 мошеннических сообщений, прогоняем через
бэкендовский classify() и тот же системный промпт, что в app/services/shield.py, и сравниваем модели.

    python src/eval_llm.py --ollama qwen2.5:7b-instruct qwen2.5:3b-instruct
    python src/eval_llm.py --gigachat            # нужен GIGACHAT_CREDENTIALS (ключ авторизации из личного кабинета)
    python src/eval_llm.py --summarize           # после ручной оценки понятности в CSV

Результаты: reports/llm_answers.csv (ответы; столбец clarity_1_5 заполняем вручную) и reports/llm_comparison.md.
"""
import argparse
import csv
import json
import os
import re
import statistics
import sys
import time
import uuid
from pathlib import Path

import httpx
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / "backend"))

from app.services.shield import SYSTEM_PROMPT, classify  # noqa: E402

DATA, REPORTS = ROOT / "data", ROOT / "reports"
ANSWERS, SUMMARY = REPORTS / "llm_answers.csv", REPORTS / "llm_comparison.md"
BACKEND_TIMEOUT_S = 20  # столько ждёт бэкенд (app/services/llm.py), дальше — шаблон
N_EXAMPLES, SEED = 30, 42

# Правила из промпта: не придумывать статьи законов, суммы, номера телефонов; без эмодзи
RULES = {
    "статья закона": re.compile(r"\bст(\.|атья|атьи|атье)\s*\d+|\bУК\b|\bГК\b|\bКоАП\b|\d+-ФЗ", re.I),
    "номер телефона": re.compile(r"(\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}"),
    "сумма": re.compile(r"\d[\d\s]*(₽|руб)", re.I),
    "эмодзи": re.compile(r"[\U0001F300-\U0001FAFF☀-➿]"),
    "на «ты»": re.compile(r"\b(тебе|тебя|твой|твою|твои|ты)\b", re.I),
}


def examples() -> pd.DataFrame:
    """15 вербовок + 15 других схем. Если есть ручной тест команды — берём из него, иначе из синтетики."""
    files = sorted(DATA.glob("messages_test_manual_*.csv"))
    df = pd.concat([pd.read_csv(f) for f in files], ignore_index=True) if files else pd.DataFrame()
    source = "ручной тест"
    enough = not df.empty and all((df.label == lab).sum() >= N_EXAMPLES // 2 for lab in ("drop_recruitment", "other_fraud"))
    if not enough:
        df, source = pd.read_csv(DATA / "messages.csv"), "синтетика"
    parts = [df[df.label == lab].sample(N_EXAMPLES // 2, random_state=SEED) for lab in ("drop_recruitment", "other_fraud")]
    out = pd.concat(parts, ignore_index=True)
    out["source"] = source
    return out


def call_ollama(model: str, user: str, url: str = "http://localhost:11434") -> str:
    r = httpx.post(f"{url}/api/chat", timeout=180, json={
        "model": model, "format": "json", "stream": False,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}],
    })
    r.raise_for_status()
    return r.json()["message"]["content"]


class GigaChat:
    """GigaChat API: OAuth по ключу авторизации → chat/completions. TLS — сертификат Минцифры
    (если не установлен в системе, укажи путь в GIGACHAT_CA_BUNDLE)."""

    def __init__(self, credentials: str, scope: str = "GIGACHAT_API_PERS"):
        verify = os.environ.get("GIGACHAT_CA_BUNDLE", True)
        self.client = httpx.Client(verify=verify, timeout=60)
        r = self.client.post(
            "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
            headers={"Authorization": f"Basic {credentials}", "RqUID": str(uuid.uuid4()),
                     "Content-Type": "application/x-www-form-urlencoded"},
            data={"scope": scope},
        )
        r.raise_for_status()
        self.token = r.json()["access_token"]

    def __call__(self, user: str) -> str:
        r = self.client.post(
            "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"model": "GigaChat", "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


def parse(raw: str) -> dict | None:
    raw = raw.strip()
    m = re.search(r"\{.*\}", raw, re.S)  # GigaChat иногда оборачивает JSON в ```
    try:
        answer = json.loads(m.group(0) if m else raw)
    except json.JSONDecodeError:
        return None
    if isinstance(answer.get("explanation"), str) and isinstance(answer.get("advice"), list):
        return answer
    return None


def run(models: dict) -> None:
    ex = examples()
    rows = []
    if ANSWERS.exists():
        rows = [r for r in csv.DictReader(ANSWERS.open(encoding="utf-8")) if r["model"] not in models]
    for name, fn in models.items():
        fn("Сообщение: привет\nТип схемы: safe\nПризнаки: []")  # прогрев: загрузка модели в память не должна портить замер
        for i, r in ex.iterrows():
            scheme, _, flags = classify(r.text)
            user = f"Сообщение: {r.text}\nТип схемы: {scheme}\nПризнаки: {flags}"
            t0 = time.perf_counter()
            try:
                raw, err = fn(user), ""
            except Exception as e:  # сеть, таймаут, авторизация
                raw, err = "", type(e).__name__
            latency = time.perf_counter() - t0
            answer = parse(raw) if raw else None
            text = (answer["explanation"] + " " + " ".join(map(str, answer["advice"]))) if answer else ""
            broken = [rule for rule, rx in RULES.items() if rx.search(text)]
            rows.append({
                "id": i, "model": name, "label": r.label, "scheme": scheme, "message": r.text,
                "latency_s": f"{latency:.1f}", "valid_json": int(answer is not None), "error": err,
                "rule_violations": "; ".join(broken),
                "explanation": answer["explanation"] if answer else "", "advice": " | ".join(map(str, answer["advice"])) if answer else "",
                "clarity_1_5": "",
            })
            print(f"{name} #{i}: {latency:.1f} c, json={'да' if answer else 'нет'} {('нарушения: ' + ', '.join(broken)) if broken else ''}")
    REPORTS.mkdir(exist_ok=True)
    with ANSWERS.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    summarize(source=ex.source.iloc[0])


def summarize(source: str | None = None) -> None:
    df = pd.read_csv(ANSWERS, dtype={"clarity_1_5": "string"})
    lines = [
        "# Сравнение LLM для объяснений Щита", "",
        f"_Сгенерировано `ml/src/eval_llm.py`. Примеры: {source or 'см. llm_answers.csv'}, по {N_EXAMPLES // 2} вербовок и других схем._",
        f"_Железо: ноутбук, Intel Core Ultra 7 155H, 32 ГБ ОЗУ, без дискретной видеокарты (вычисления на CPU)._", "",
        "| Модель | Медиана, с | 90-й перцентиль, с | Успевает за 20 с (лимит бэкенда) | Валидный JSON | Ответов с нарушениями правил | Понятность 1–5 (вручную) |",
        "|---|---|---|---|---|---|---|",
    ]
    for model, g in df.groupby("model", sort=False):
        lat = pd.to_numeric(g.latency_s)
        clarity = pd.to_numeric(g.clarity_1_5, errors="coerce").dropna()
        p90 = statistics.quantiles(lat, n=10)[-1] if len(lat) >= 2 else lat.max()
        lines.append(
            f"| {model} | {lat.median():.1f} | {p90:.1f} | {(lat <= BACKEND_TIMEOUT_S).mean():.0%} | {g.valid_json.mean():.0%} | "
            f"{(g.rule_violations.fillna('') != '').sum()} из {len(g)} | "
            + (f"{clarity.mean():.1f} (n={len(clarity)})" if len(clarity) else "не оценено") + " |"
        )
    viol = df[df.rule_violations.fillna("") != ""]
    if len(viol):
        lines += ["", "Какие правила нарушались: " + ", ".join(
            f"{k} — {v}" for k, v in pd.Series([x for s in viol.rule_violations for x in s.split("; ")]).value_counts().items())]
    lines += [
        "", "**Как оценить понятность:** открыть `llm_answers.csv`, для каждого ответа поставить 1–5 в `clarity_1_5`",
        "(5 — подросток сразу поймёт, что происходит и что делать; 1 — непонятно или пугает). Оценивают двое, не зная модель,",
        "затем `python src/eval_llm.py --summarize`.", "",
        "Нарушения правил ищутся регулярками и требуют ручной проверки: например, «сумма» может быть из исходного сообщения.",
    ]
    notes = REPORTS / "llm_notes.md"  # выводы пишем вручную, сводка их подхватывает
    if notes.exists():
        lines += ["", notes.read_text(encoding="utf-8").strip()]
    SUMMARY.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser()
    p.add_argument("--ollama", nargs="*", default=[], help="модели Ollama")
    p.add_argument("--gigachat", action="store_true", help="добавить GigaChat (нужен GIGACHAT_CREDENTIALS)")
    p.add_argument("--summarize", action="store_true", help="только пересобрать сводку из CSV")
    args = p.parse_args()
    if args.summarize:
        summarize()
        sys.exit(0)
    models = {m: (lambda u, m=m: call_ollama(m, u)) for m in args.ollama}
    if args.gigachat:
        creds = os.environ.get("GIGACHAT_CREDENTIALS")
        if not creds:
            sys.exit("Нет GIGACHAT_CREDENTIALS: получить ключ авторизации в личном кабинете developers.sber.ru (GigaChat API)")
        models["GigaChat"] = GigaChat(creds)
    if not models:
        sys.exit("Укажи --ollama <модели> и/или --gigachat")
    run(models)
