"""Дополнительный тест Щита на новых формулировках → reports/shield_extra.md.

    python src/eval_extra.py

Сообщения в data/messages_test_extra.csv — синтетический набор (тип набора указан в колонке author).
Это проверка переноса на формулировки, которых нет в шаблонах генератора, и на «трудные» легальные случаи
(вакансии, переводы друзьям и родным). Ручной тест команды (data/messages_test_manual_*.csv, PLAN.md 9.2)
он НЕ заменяет и в metrics.md не попадает.
"""
import sys
from collections import Counter
from datetime import date
from pathlib import Path

import pandas as pd

from eval import DATA, REPORTS, hybrid, keyword_baseline, shield_table

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    files = sorted(DATA.glob("messages_test_extra.csv"))
    if not files:
        print(f"Нет файлов messages_test_extra.csv в {DATA}")
        sys.exit(1)
    df = pd.concat([pd.read_csv(f) for f in files], ignore_index=True).dropna(subset=["text", "label"])

    sys.path.insert(0, str(ROOT.parent / "backend"))
    from app.ml import shield_model

    model = [max(pr, key=pr.get) for pr in map(shield_model.predict_proba, df.text)]
    hyb = hybrid(df.text)
    counts = Counter(df.label)
    authors = ", ".join(sorted(df.author.dropna().unique()))

    lines = [
        "# Щит: дополнительный тест на новых формулировках", "",
        f"_Сгенерировано `ml/src/eval_extra.py` {date.today():%d.%m.%Y}. Не править руками — перезапустить скрипт._", "",
        f"> **Это синтетический набор (тип: {authors}), не ручной тест команды.** Он не заменяет ручной тест из PLAN.md (п. 9.2):",
        "> проверяем, как модель переносится на формулировки вне шаблонов генератора и как ведёт себя на «трудных»",
        "> легальных сообщениях — вакансиях, переводах друзьям и родным. В презентацию эти цифры — только с этой оговоркой.", "",
        f"{len(df)} сообщений: вербовка {counts['drop_recruitment']}, другое мошенничество {counts['other_fraud']}, нормальные {counts['safe']}.", "",
    ]
    lines += shield_table(df.label.tolist(), {
        "Ключевые слова (бейзлайн)": keyword_baseline(df.text),
        "TF-IDF + логрег (модель команды)": model,
        "Гибрид: модель + признаки схемы (в бэкенде)": hyb,
    })

    errors = [(t, y, p) for t, y, p in zip(df.text, df.label, hyb) if y != p]
    lines += ["", f"## Ошибки гибрида ({len(errors)})", "", "| Сообщение | Правильно | Щит сказал |", "|---|---|---|"]
    lines += [f"| {t.replace('|', '/')} | {y} | {p} |" for t, y, p in errors]
    lines.append("")

    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "shield_extra.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines[:16]))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()


