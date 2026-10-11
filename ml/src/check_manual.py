"""Проверка ручного теста Щита: ml/data/messages_test_manual_*.csv.

    python src/check_manual.py            # все файлы команды
    python src/check_manual.py dasha      # только свой

Проверяет формат, метки, дубликаты и похожие на настоящие номера телефонов и карт.
Тексты сообщений не исправляет — только сообщает, что поправить.
"""
import csv
import re
import sys
from collections import Counter
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
COLUMNS = ["text", "label", "scheme", "author"]
LABELS = {"drop_recruitment", "other_fraud", "safe"}
SCHEMES = {"", "phishing", "relative_in_trouble", "prize", "investment", "marketplace", "other"}
TARGET = {"drop_recruitment": 20, "other_fraud": 15, "safe": 15}

CARD = re.compile(r"\b(?:\d[ -]?){16}\b")
PHONE = re.compile(r"(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}")
FAKE_PHONE = re.compile(r"(?:\+7|8)[\s(-]*9\d\d[\s)-]*0{3}[\s-]*\d{2}[\s-]*\d{2}")  # +7 9xx 000-xx-xx — заведомо вымышленный


def check(path: Path) -> tuple[list[str], list[dict]]:
    problems, rows = [], []
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != COLUMNS:
            return [f"заголовок должен быть ровно: {','.join(COLUMNS)} (сейчас: {reader.fieldnames})"], []
        for i, row in enumerate(reader, start=2):
            text = (row["text"] or "").strip()
            label = (row["label"] or "").strip()
            scheme = (row["scheme"] or "").strip()
            if not text:
                problems.append(f"строка {i}: пустой текст")
                continue
            if label not in LABELS:
                problems.append(f"строка {i}: метка «{label}» — нужна одна из {sorted(LABELS)}")
            if scheme not in SCHEMES:
                problems.append(f"строка {i}: scheme «{scheme}» — нужна одна из {sorted(SCHEMES - {''})} или пусто")
            if label == "other_fraud" and not scheme:
                problems.append(f"строка {i}: для other_fraud укажи scheme")
            if CARD.search(text):
                problems.append(f"строка {i}: похоже на номер карты — замени на «карта *1234» или убери")
            for m in PHONE.finditer(text):
                if not FAKE_PHONE.fullmatch(m.group()):
                    problems.append(f"строка {i}: номер «{m.group()}» может быть настоящим — используй вида +7 900 000-12-34")
            if len(text) < 10:
                problems.append(f"строка {i}: слишком короткое сообщение")
            rows.append({"text": text, "label": label, "line": i})
    return problems, rows


def main(who: str | None) -> int:
    files = sorted(DATA.glob(f"messages_test_manual_{who or '*'}.csv"))
    if not files:
        print(f"Нет файлов messages_test_manual_{who or '*'}.csv в {DATA}")
        return 1
    seen: dict[str, str] = {}
    ok = True
    for path in files:
        problems, rows = check(path)
        for r in rows:
            key = re.sub(r"\W+", " ", r["text"].lower()).strip()
            if key in seen:
                problems.append(f"строка {r['line']}: дубль сообщения из {seen[key]}")
            seen[key] = f"{path.name}:{r['line']}"
        counts = Counter(r["label"] for r in rows)
        plan = ", ".join(f"{k} {counts.get(k, 0)}/{v}" for k, v in TARGET.items())
        print(f"\n{path.name}: {len(rows)} сообщений ({plan})")
        for p in problems:
            print("  ✗", p)
        ok = ok and not problems
    print("\nВсё в порядке" if ok else "\nЕсть что поправить")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else None))
