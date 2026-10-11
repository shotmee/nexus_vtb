"""Обучение классификатора Щита: TF-IDF (слова + буквенные n-граммы) → логистическая регрессия.

    python src/train_shield.py

1. Честная оценка: train/holdout делим по template_id (вариации одного шаблона не попадают в обе части).
2. Финальная модель учится на всех данных и выгружается в backend/app/ml/models/shield.json
   (словарь, idf, веса) — бэкенду не нужен scikit-learn.
3. Проверка, что инференс бэкенда совпадает со sklearn.

Ручные сообщения команды (data/messages_test_manual_*.csv, 150 шт.) добавляются в финальное обучение с весом
MANUAL_WEIGHT — это живая речь, которой нет в шаблонах. Честная оценка на них — по автору: учим на двух авторах,
проверяем на третьем (eval_manual.py).
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import GroupShuffleSplit

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT.parent / "backend"
sys.path.insert(0, str(BACKEND))

from app.ml.text import analyze  # noqa: E402

DATA = ROOT / "data"
MODEL_PATH = BACKEND / "app" / "ml" / "models" / "shield.json"
SEED = 42
MANUAL_WEIGHT = 3  # подобрано по проверке «по автору»: 6 даёт больше ложных срабатываний


def make_model():
    vec = TfidfVectorizer(analyzer=analyze, sublinear_tf=True, min_df=2, max_features=20000)
    clf = LogisticRegression(C=5.0, max_iter=3000, class_weight="balanced")
    return vec, clf


def fit(texts, labels):
    vec, clf = make_model()
    clf.fit(vec.fit_transform(texts), labels)
    return vec, clf


def export(vec, clf, path: Path) -> None:
    vocab = {term: int(i) for term, i in vec.vocabulary_.items()}
    payload = {
        "classes": [str(c) for c in clf.classes_],
        "vocabulary": vocab,
        "idf": [round(float(x), 6) for x in vec.idf_],
        "coef": [[round(float(x), 6) for x in row] for row in clf.coef_],
        "intercept": [round(float(x), 6) for x in clf.intercept_],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def load_manual() -> pd.DataFrame:
    files = sorted(DATA.glob("messages_test_manual_*.csv"))
    return pd.concat([pd.read_csv(f) for f in files], ignore_index=True) if files else pd.DataFrame(columns=["text", "label", "author"])


def main():
    df = pd.read_csv(DATA / "messages.csv")
    split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
    tr, te = next(split.split(df, df.label, groups=df.template_id))
    vec, clf = fit(df.text.iloc[tr], df.label.iloc[tr])
    pred = clf.predict(vec.transform(df.text.iloc[te]))
    print("Отложенные шаблоны (holdout по template_id):")
    print(classification_report(df.label.iloc[te], pred, digits=3, zero_division=0))

    manual = load_manual()
    train = pd.concat([df[["text", "label"]]] + [manual[["text", "label"]]] * MANUAL_WEIGHT)
    vec, clf = fit(train.text, train.label)
    print(f"Финальная модель: {len(df)} шаблонных + {len(manual)} ручных ×{MANUAL_WEIGHT}")
    export(vec, clf, MODEL_PATH)

    # инференс бэкенда должен совпадать со sklearn
    from app.ml import shield_model
    shield_model._load.cache_clear()
    sample = df.text.sample(200, random_state=SEED)
    sk = clf.predict_proba(vec.transform(sample))
    ours = np.array([[shield_model.predict_proba(t)[c] for c in clf.classes_] for t in sample])
    diff = float(np.abs(sk - ours).max())
    assert diff < 1e-3, f"инференс бэкенда расходится со sklearn: {diff}"
    size_kb = MODEL_PATH.stat().st_size // 1024
    print(f"Модель: {MODEL_PATH} ({size_kb} КБ, {len(vec.vocabulary_)} признаков), расхождение со sklearn {diff:.1e}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
