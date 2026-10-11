"""Классификатор сообщений для Щита: TF-IDF + логистическая регрессия.

Обучается в ml/src/train_shield.py и выгружается в JSON (словарь, idf, веса),
поэтому бэкенду не нужен scikit-learn: инференс — пара циклов на чистом Python.
Нет файла модели — available() == False, и shield.py работает на ключевых словах.
"""
import json
import math
from collections import Counter
from functools import lru_cache
from pathlib import Path

from app.ml.text import analyze

MODEL_PATH = Path(__file__).resolve().parent / "models" / "shield.json"


@lru_cache
def _load() -> dict | None:
    if not MODEL_PATH.exists():
        return None
    return json.loads(MODEL_PATH.read_text(encoding="utf-8"))


def available() -> bool:
    return _load() is not None


def predict_proba(text: str) -> dict[str, float]:
    m = _load()
    vocab, idf = m["vocabulary"], m["idf"]
    tf = Counter(analyze(text))
    vec = {}
    for term, cnt in tf.items():
        j = vocab.get(term)
        if j is not None:
            vec[j] = (1 + math.log(cnt)) * idf[j]  # sublinear_tf=True
    norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
    logits = [
        b + sum(w[j] * v / norm for j, v in vec.items())
        for w, b in zip(m["coef"], m["intercept"])
    ]
    top = max(logits)
    exp = [math.exp(z - top) for z in logits]
    s = sum(exp)
    return {c: e / s for c, e in zip(m["classes"], exp)}
