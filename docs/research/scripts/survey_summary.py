"""Сводка опроса по гипотезам H1–H5 (docs/research/TZ_research.md, §2).

Вход — выгрузка Google Форм (Ответы → ⋮ → «Скачать ответы (.csv)»).
Столбцы ищутся по номеру вопроса в начале названия («2.1 Вам когда-нибудь…»),
формулировки — в docs/research/survey_questions.md.

    python docs/research/scripts/survey_summary.py docs/research/survey_raw.csv \
        --out docs/research/survey_results_auto.md --img docs/research/img

Две выборки (онлайн-анкета + очный устный опрос, где ответы в форму вносили интервьюеры):

    python docs/research/scripts/survey_summary.py docs/research/survey.csv \
        --offline-from "08/10/2026 19:00" --out docs/research/survey_results_auto.md --img docs/research/img

Анкеты с отметкой времени не раньше --offline-from считаются очными. Отчёт: гипотезы по всей выборке +
таблица «онлайн против очной» по ключевым цифрам. Открытые ответы очной выборки — пересказ интервьюера,
цитаты из них не берём.

Графики строятся, только если установлен matplotlib.
"""
import argparse
import math
import re
import sys
from pathlib import Path

import pandas as pd

MULTI_SEP = ", "  # так Google Формы склеивают ответы с несколькими вариантами

NO_OFFERS = "Ничего из этого не предлагали"
WRONG_41 = {
    "Переведу на номер, который он прислал",
    "Верну отправителю сам тем же способом",
    "Ничего не буду делать и подожду",
}
RIGHT_41 = "Позвоню в свой банк и сообщу о переводе"
RIGHT_31 = "С 16 лет"
RIGHT_32 = {
    "Банки заблокируют карты и онлайн-банк",
    "Человек попадёт в базу Банка России и годами будет иметь проблемы с банками",
}
WRONG_32 = "Ничего, если сумма небольшая"
RIGHT_33 = "Владелец карты"
WARNING_52 = "Банк показывает предупреждение с объяснением и даёт решить мне"
YES_63 = {"Да", "Скорее да"}
AGES = {"18", "19", "20", "21", "22"}


# Если в форме номера не дописаны в начало вопросов — ищем по началу текста
QUESTION_TEXT = {
    "0.1": "Вам есть 18 лет", "1.1": "Сколько вам лет", "1.2": "Чем вы сейчас занимаетесь",
    "1.3": "Где вы живёте", "1.4": "Во сколько лет у вас появилась",
    "2.1": "Вам когда-нибудь предлагали", "2.2": "Где вам это предлагали",
    "2.3": "Сколько вам было лет, когда", "2.4": "Знаете ли вы лично людей",
    "3.1": "С какого возраста", "3.2": "Что может случиться", "3.3": "Кто отвечает за операции",
    "4.1": "Представьте", "4.2": "Если бы вы уже переслали",
    "5.1": "Банк когда-нибудь блокировал", "5.2": "Если банк заподозрит",
    "5.3": "Насколько понятно", "5.4": "Остановило бы вас", "5.5": "Что на экране",
    "6.1": "Где вы учились", "6.2": "В чём хотелось бы", "6.3": "Пользовались бы вы", "6.4": "Какой формат",
}


def col(df: pd.DataFrame, num: str) -> str:
    pattern = re.compile(rf"^\s*{re.escape(num)}[\s.]")
    for c in df.columns:
        if pattern.match(str(c)):
            return c
    start = QUESTION_TEXT[num].lower() if num in QUESTION_TEXT else None
    for c in df.columns:
        if start and str(c).strip().lower().startswith(start):
            return c
    raise KeyError(f"Нет столбца для вопроса {num} («{QUESTION_TEXT.get(num, '?')}…»)")


# Варианты с запятой внутри: Google склеивает выбранное через «, », поэтому их вырезаем целиком до разбиения
OPTIONS_WITH_COMMA = ["Снять наличными деньги, которые пришли от чужих людей"]


def multi(value) -> set[str]:
    if pd.isna(value) or not str(value).strip():
        return set()
    text, found = str(value), set()
    for option in OPTIONS_WITH_COMMA:
        if option in text:
            found.add(option)
            text = text.replace(option, "")
    return found | {v.strip() for v in text.split(MULTI_SEP) if v.strip()}


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    p = k / n
    d = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / d
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return max(0.0, centre - half), min(1.0, centre + half)


def share(mask: pd.Series) -> tuple[float, int, int, tuple[float, float]]:
    mask = mask.dropna().astype(bool)
    k, n = int(mask.sum()), int(len(mask))
    return (k / n if n else 0.0), k, n, wilson(k, n)


def fmt(p: float, k: int, n: int, ci: tuple[float, float]) -> str:
    return f"**{p:.0%}** ({k} из {n}; 95% ДИ {ci[0]:.0%}–{ci[1]:.0%})"


def verdict(p: float, ci: tuple[float, float], n: int, threshold: float, extra_ok: bool = True) -> str:
    """При n < 30 выводы делаем, только если весь 95% ДИ по одну сторону порога."""
    if n >= 30:
        return "ПОДТВЕРЖДЕНА" if p >= threshold and extra_ok else "НЕ ПОДТВЕРЖДЕНА"
    if ci[0] >= threshold and extra_ok:
        return f"ПОДТВЕРЖДЕНА (предварительно, n={n})"
    if ci[1] < threshold:
        return f"НЕ ПОДТВЕРЖДЕНА (предварительно, n={n})"
    return f"НЕ ХВАТАЕТ ДАННЫХ (n={n}, порог внутри доверительного интервала)"


def breakdown(series: pd.Series, is_multi: bool = False) -> pd.Series:
    if is_multi:
        items = [v for s in series for v in multi(s)]
        counts = pd.Series(items, dtype=object).value_counts()
    else:
        counts = series.dropna().astype(str).value_counts()
    return counts


def table(counts: pd.Series, n: int) -> str:
    rows = [f"| {k} | {v} | {v / n:.0%} |" for k, v in counts.items()]
    return "| Ответ | Кол-во | Доля |\n|---|---|---|\n" + "\n".join(rows)


def load(path: Path) -> tuple[pd.DataFrame, dict]:
    raw = pd.read_csv(path, dtype=str).dropna(how="all")  # пустые строки бывают после склейки выгрузок
    stats = {"всего анкет": len(raw)}
    df = raw
    try:
        df = df[df[col(df, "0.1")].str.strip() == "Да"]
    except KeyError:
        pass
    df = df[df[col(df, "1.1")].str.strip().isin(AGES)]
    stats["в анализе (18–22, подтвердили 18+)"] = len(df)
    return df, stats


def split_by_method(df: pd.DataFrame, offline_from: str) -> pd.DataFrame:
    """Метка выборки по отметке времени (первый столбец выгрузки)."""
    ts = pd.to_datetime(df.iloc[:, 0], dayfirst=True, errors="coerce")
    cutoff = pd.to_datetime(offline_from, dayfirst=True)
    return df.assign(_method=["очный опрос" if t >= cutoff else "онлайн" for t in ts.fillna(pd.Timestamp.min)])


def key_metrics(df: pd.DataFrame) -> dict[str, str]:
    """Главные цифры по гипотезам — для сравнения выборок."""
    if not len(df):
        return {}
    res = {}
    offers = df[col(df, "2.1")].map(multi)
    p, k, m, _ = share(offers.map(lambda s: bool(s) and NO_OFFERS not in s))
    res["H1 получали предложения"] = f"{p:.0%} ({k}/{m})"
    p, k, m, _ = share(df[col(df, "4.1")].str.strip().isin(WRONG_41))
    res["H2 неверное действие с чужими деньгами"] = f"{p:.0%} ({k}/{m})"
    p, k, m, _ = share(df[col(df, "3.1")].str.strip() == RIGHT_31)
    res["H3 знают возраст ответственности (16)"] = f"{p:.0%} ({k}/{m})"
    p, k, m, _ = share(df[col(df, "5.2")].str.strip() == WARNING_52)
    res["H4 выбирают предупреждение"] = f"{p:.0%} ({k}/{m})"
    try:
        clarity = pd.to_numeric(df[col(df, "5.3")], errors="coerce").dropna()
        res["H4 понятность экрана, из 5"] = f"{clarity.mean():.1f} (n={len(clarity)})"
    except KeyError:
        pass
    p, k, m, _ = share(df[col(df, "6.3")].str.strip().isin(YES_63))
    res["H5 готовы учиться в банке"] = f"{p:.0%} ({k}/{m})"
    return res


def compare_methods(df: pd.DataFrame) -> str:
    groups = {name: g for name, g in df.groupby("_method")}
    online, offline = key_metrics(groups.get("онлайн", df.iloc[0:0])), key_metrics(groups.get("очный опрос", df.iloc[0:0]))
    allm = key_metrics(df)
    rows = ["## Сравнение выборок", "",
            "Онлайн — респонденты заполняли форму сами. Очный опрос — устно, ответы вносили интервьюеры "
            "(открытые ответы там — пересказ интервьюера, цитаты из них не берём).", "",
            f"| Показатель | Онлайн (n={len(groups.get('онлайн', []))}) | Очный опрос (n={len(groups.get('очный опрос', []))}) | Всего (n={len(df)}) |",
            "|---|---|---|---|"]
    for key in allm:
        rows.append(f"| {key} | {online.get(key, '—')} | {offline.get(key, '—')} | {allm[key]} |")
    rows += ["", "Если доли в двух выборках близки — два метода подтверждают одну картину. "
             "Если сильно расходятся — разобраться до питча (разные аудитории? формулировка вопроса устно?).", ""]
    return "\n".join(rows)


def summarize(df: pd.DataFrame, stats: dict, img_dir: Path | None) -> str:
    n = len(df)
    out = ["# Результаты опроса по гипотезам (авто-сводка)", ""]
    out += [f"- {k}: **{v}**" for k, v in stats.items()]
    young = df[col(df, "1.1")].isin({"18", "19"}).mean() if n else 0
    out.append(f"- доля 18–19 лет: **{young:.0%}** (цель ТЗ — не меньше 30%)")
    out += ["", "> Сгенерировано скриптом `docs/research/scripts/survey_summary.py`. Выводы и цитаты из интервью дописываем вручную в `survey_results.md`.", ""]
    charts = {}

    # H1
    offers = df[col(df, "2.1")].map(multi)
    p, k, m, ci = share(offers.map(lambda s: bool(s) and NO_OFFERS not in s))
    out += [f"## H1. Молодёжь массово получает предложения «подработки» через карту — {verdict(p, ci, m, 0.30)}", "",
            f"- Получали хотя бы одно предложение: {fmt(p, k, m, ci)} · порог ≥ 30%"]
    by_age = df.assign(_got=offers.map(lambda s: bool(s) and NO_OFFERS not in s)).groupby(col(df, "1.1"))["_got"].agg(["mean", "size"])
    out.append("- По возрасту: " + "; ".join(f"{a} — {r['mean']:.0%} (n={int(r['size'])})" for a, r in by_age.iterrows()))
    c = breakdown(df[col(df, "2.1")], is_multi=True)
    out += ["", table(c, n), ""]
    charts["h1_offers"] = (c, "2.1 Что предлагали", n)
    try:
        c = breakdown(df[col(df, "2.2")], is_multi=True)
        out += ["Где предлагали (2.2):", "", table(c, n), ""]
        charts["h1_channels"] = (c, "2.2 Где предлагали", n)
    except KeyError:
        pass

    # H2
    a41 = df[col(df, "4.1")].str.strip()
    p, k, m, ci = share(a41.isin(WRONG_41))
    pr, kr, _, cir = share(a41 == RIGHT_41)
    out += [f"## H2. Большинство не знает, что делать с чужими деньгами — {verdict(p, ci, m, 0.50)}", "",
            f"- Выбрали неверное действие: {fmt(p, k, m, ci)} · порог ≥ 50%",
            f"- Правильный ответ (позвонить в банк): {fmt(pr, kr, m, cir)}"]
    c = breakdown(a41)
    out += ["", table(c, m), ""]
    charts["h2_scenario"] = (c, "4.1 Что сделаете с чужими 15 000 ₽", m)

    # H3
    q31 = df[col(df, "3.1")].str.strip() == RIGHT_31
    q32 = df[col(df, "3.2")].map(multi).map(lambda s: RIGHT_32 <= s and WRONG_32 not in s)
    q33 = df[col(df, "3.3")].str.strip() == RIGHT_33
    correct = q31.astype(int) + q32.astype(int) + q33.astype(int)
    p, k, m, ci = share(correct < 2)
    out += [f"## H3. Большинство не знает реальных последствий — {verdict(p, ci, m, 0.50)}", "",
            f"- Ответили верно меньше чем на 2 вопроса из 3: {fmt(p, k, m, ci)} · порог ≥ 50%"]
    for num, mask in (("3.1 (возраст ответственности 16)", q31), ("3.2 (блокировки + база ЦБ)", q32), ("3.3 (отвечает владелец)", q33)):
        pp, kk, mm, cc = share(mask)
        out.append(f"- Верно на {num}: {fmt(pp, kk, mm, cc)}")
    c = breakdown(df[col(df, "3.1")])
    out += ["", "Ответы на 3.1:", "", table(c, n), ""]
    charts["h3_age"] = (c, "3.1 С какого возраста уголовная ответственность", n)

    # H4
    a52 = df[col(df, "5.2")].str.strip()
    p, k, m, ci = share(a52 == WARNING_52)
    lines = [f"- Выбрали предупреждение с объяснением: {fmt(p, k, m, ci)} · порог ≥ 60%"]
    h4_p, h4_ci, h4_n, clarity_ok = p, ci, m, True
    try:
        clarity = pd.to_numeric(df[col(df, "5.3")], errors="coerce").dropna()
        mean = clarity.mean() if len(clarity) else float("nan")
        lines.append(f"- Понятность экрана перехвата: **{mean:.1f} из 5** (n={len(clarity)}) · порог ≥ 4")
        clarity_ok = mean >= 4
        ps, ks, ms, cs = share(df[col(df, "5.4")].str.strip().isin(YES_63))
        lines.append(f"- Предупреждение остановило бы («да» и «скорее да»): {fmt(ps, ks, ms, cs)}")
    except KeyError:
        lines.append("- Концепт-тест (5.3–5.4) в выгрузке не найден — вердикт только по 5.2")
    try:
        pb, kb, mb, cb = share(df[col(df, "5.1")].str.strip() == "Да")
        lines.append(f"- Сталкивались с блокировкой без объяснения: {fmt(pb, kb, mb, cb)}")
    except KeyError:
        pass
    c = breakdown(a52)
    out += [f"## H4. Предупреждение с объяснением лучше молчаливой блокировки — {verdict(h4_p, h4_ci, h4_n, 0.60, clarity_ok)}", ""]
    out += lines + ["", table(c, m), ""]
    charts["h4_preference"] = (c, "5.2 Как удобнее, если банк заподозрит мошенников", m)

    # H5
    a63 = df[col(df, "6.3")].str.strip()
    p, k, m, ci = share(a63.isin(YES_63))
    out += [f"## H5. Молодёжь готова учиться финграмотности в банковском приложении — {verdict(p, ci, m, 0.40)}", "",
            f"- «Да» и «скорее да»: {fmt(p, k, m, ci)} · порог ≥ 40%"]
    try:
        c = breakdown(df[col(df, "6.2")], is_multi=True)
        out += ["", "В чём хотят разобраться (6.2):", "", table(c, n), ""]
        charts["h5_topics"] = (c, "6.2 В чём хотят разобраться", n)
    except KeyError:
        pass

    if img_dir:
        made = plot(charts, img_dir)
        if made:
            out += ["## Графики", ""] + [f"![{name}](img/{name}.png)" for name in made]
    return "\n".join(out) + "\n"


def plot(charts: dict, img_dir: Path) -> list[str]:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib не установлен — графики пропущены")
        return []
    img_dir.mkdir(parents=True, exist_ok=True)
    made = []
    for name, (counts, title, n) in charts.items():
        counts = counts.sort_values()
        fig, ax = plt.subplots(figsize=(8, 0.45 * len(counts) + 1.2))
        ax.barh([str(i) for i in counts.index], counts.values / n, color="#3b6fd8")
        for i, v in enumerate(counts.values):
            ax.text(v / n + 0.01, i, f"{v / n:.0%}", va="center", fontsize=9)
        ax.set_xlim(0, 1)
        ax.set_title(f"{title} (n={n})", loc="left", fontsize=11)
        ax.spines[["top", "right"]].set_visible(False)
        ax.xaxis.set_visible(False)
        fig.tight_layout()
        fig.savefig(img_dir / f"{name}.png", dpi=150)
        plt.close(fig)
        made.append(name)
    return made


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("csv", type=Path)
    p.add_argument("--out", type=Path)
    p.add_argument("--img", type=Path, help="папка для графиков (нужен matplotlib)")
    p.add_argument("--offline-from", help='анкеты с этого момента — очный опрос, напр. "08/10/2026 19:00"')
    args = p.parse_args()
    df, stats = load(args.csv)
    if args.offline_from:
        df = split_by_method(df, args.offline_from)
        for name, g in df.groupby("_method"):
            stats[f"из них {name}"] = len(g)
    report = summarize(df, stats, args.img)
    if args.offline_from:
        head, sep, rest = report.partition("## H1.")
        report = head + compare_methods(df) + "\n" + sep + rest
    if args.out:
        args.out.write_text(report, encoding="utf-8")
        print(f"Готово: {args.out}")
    else:
        sys.stdout.reconfigure(encoding="utf-8")  # консоль Windows по умолчанию cp1251
        print(report)
