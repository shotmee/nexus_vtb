"""Признаки для скоринга перевода в момент попытки.

Сами формулы живут в backend/app/ml/features.py — их же использует бэкенд,
поэтому признаки при обучении и в проде считаются одним кодом.
Здесь — сборка обучающей выборки из синтетических транзакций.
"""
import bisect
import sys
from datetime import timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.ml.features import FEATURES, PHRASES, Transfer, build_features, phrase, rule_score  # noqa: E402

__all__ = ["FEATURES", "PHRASES", "Transfer", "build_features", "phrase", "rule_score", "build_dataset"]


def build_dataset(tx: pd.DataFrame, clients: pd.DataFrame) -> pd.DataFrame:
    """Одна строка на каждый исходящий p2p-перевод (channel == "sbp"): признаки + label."""
    clients = clients.set_index("client_id")
    rows = []
    for client_id, g in tx.sort_values(["client_id", "ts"]).groupby("client_id", sort=False):
        c = clients.loc[client_id]
        items = list(g.itertuples(index=False))
        times = [t.ts for t in items]
        known: set[str] = set()
        start = 0
        for i, t in enumerate(items):
            if t.direction == "out" and t.channel == "sbp":
                lo = bisect.bisect_left(times, t.ts - timedelta(days=30), 0, i)
                while start < lo:
                    known.add(items[start].counterparty)
                    start += 1
                f = build_features(
                    items[lo:i], Transfer(ts=t.ts, amount=t.amount, to=t.counterparty),
                    int(c.age), float(c.card_age_days) + (t.ts - times[0]).days, known=known,
                )
                f.update(client_id=client_id, profile=c.profile, tx_id=t.tx_id, ts=t.ts, amount=t.amount, label=int(t.label))
                rows.append(f)
    return pd.DataFrame(rows)
