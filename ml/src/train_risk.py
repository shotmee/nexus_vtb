"""Обучение скоринга перевода: CatBoost на признаках из features.py.

    python src/train_risk.py

Делит клиентов (не переводы!) на train/val/test 60/20/20, чтобы история одного
клиента не попала и в обучение, и в тест. Пороги подбирает на val:
- high (перехват) — максимальный recall при precision ≥ 0.9;
- medium — precision ≥ 0.5.
Модель и пороги кладёт в backend/app/ml/models/ — бэкенд подхватит их сам.
"""
import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.metrics import average_precision_score, precision_recall_curve

from features import FEATURES, build_dataset

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MODELS = ROOT.parent / "backend" / "app" / "ml" / "models"
SEED = 42
TARGET_PRECISION_HIGH, TARGET_PRECISION_MEDIUM = 0.9, 0.5


def load_dataset() -> pd.DataFrame:
    cache = DATA / "risk_dataset.parquet"
    tx_path = DATA / "transactions.parquet"
    if cache.exists() and cache.stat().st_mtime > tx_path.stat().st_mtime:
        return pd.read_parquet(cache)
    print("Считаю признаки для каждого перевода…")
    ds = build_dataset(pd.read_parquet(tx_path), pd.read_parquet(DATA / "clients.parquet"))
    ds.to_parquet(cache, index=False)
    return ds


def split_clients(ds: pd.DataFrame) -> dict[str, np.ndarray]:
    ids = np.sort(ds.client_id.unique())
    rng = np.random.default_rng(SEED)
    rng.shuffle(ids)
    a, b = int(len(ids) * 0.6), int(len(ids) * 0.8)
    return {"train": ids[:a], "val": ids[a:b], "test": ids[b:]}


def threshold_for_precision(y, p, target: float) -> float:
    precision, recall, thr = precision_recall_curve(y, p)
    ok = np.where(precision[:-1] >= target)[0]
    if len(ok) == 0:
        return float(thr[-1])
    best = ok[np.argmax(recall[:-1][ok])]
    return float(thr[best])


def main():
    ds = load_dataset()
    split = split_clients(ds)
    part = {k: ds[ds.client_id.isin(v)] for k, v in split.items()}
    for k, d in part.items():
        print(f"{k}: {len(d)} переводов, из них дроп-транзитов {int(d.label.sum())}")

    model = CatBoostClassifier(
        iterations=600, depth=5, learning_rate=0.08, eval_metric="PRAUC",
        random_seed=SEED, verbose=False, early_stopping_rounds=60,
    )
    model.fit(part["train"][FEATURES], part["train"].label, eval_set=(part["val"][FEATURES], part["val"].label))

    p_val = model.predict_proba(part["val"][FEATURES])[:, 1]
    # На синтетике классы разделяются легко, и «оптимальный» порог уезжает к нулю.
    # Держим пороги в разумных рамках, чтобы шкала риска оставалась осмысленной.
    thr_high = float(np.clip(threshold_for_precision(part["val"].label, p_val, TARGET_PRECISION_HIGH), 0.3, 0.9))
    thr_medium = float(np.clip(threshold_for_precision(part["val"].label, p_val, TARGET_PRECISION_MEDIUM), 0.1, thr_high * 0.7))
    print(f"Пороги: medium={thr_medium:.3f}, high={thr_high:.3f}; PR-AUC val={average_precision_score(part['val'].label, p_val):.3f}")

    MODELS.mkdir(parents=True, exist_ok=True)
    model.save_model(str(MODELS / "risk.cbm"))
    meta = {
        "features": FEATURES,
        "thr_high": thr_high,
        "thr_medium": thr_medium,
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "best_iteration": model.get_best_iteration(),
        "data": "синтетика ml/src/gen_transactions.py, seed=42",
        "split_seed": SEED,
    }
    (MODELS / "risk_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "risk_split.json").write_text(json.dumps({k: v.tolist() for k, v in split.items()}), encoding="utf-8")

    importance = sorted(zip(FEATURES, model.get_feature_importance()), key=lambda x: -x[1])
    print("Важность признаков:", ", ".join(f"{n} {v:.0f}" for n, v in importance))
    print(f"Модель сохранена: {MODELS / 'risk.cbm'}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
