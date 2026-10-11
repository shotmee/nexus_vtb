"""Щит на эмбеддингах rubert-tiny2 + логистическая регрессия — сравнение с TF-IDF.

Нужны torch и sentence-transformers (тяжёлые, поэтому не в requirements.txt):
    pip install torch --index-url https://download.pytorch.org/whl/cpu
    pip install sentence-transformers scikit-learn pandas
    python src/train_shield_rubert.py

Разбиение то же, что в train_shield.py (по template_id, seed 42), поэтому цифры сравнимы.
Результат — reports/rubert.json; eval.py добавляет его в metrics.md.
В бэкенд модель не встраиваем, пока она не обгонит TF-IDF на ручном тесте: torch утяжелит образ примерно на 1 ГБ.
"""
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support
from sklearn.model_selection import GroupShuffleSplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / "backend"))
from app.ml.text import analyze  # noqa: E402  — та же токенизация, что у TF-IDF в бэкенде

DATA, REPORTS = ROOT / "data", ROOT / "reports"
MODEL_NAME = "cointegrated/rubert-tiny2"
LABELS = ["drop_recruitment", "other_fraud", "safe"]
SEED = 42  # как в train_shield.py


def metrics(y, pred) -> dict:
    p, r, f, _ = precision_recall_fscore_support(y, pred, labels=LABELS, zero_division=0)
    return {
        "drop_precision": round(float(p[0]), 3), "drop_recall": round(float(r[0]), 3),
        "other_f1": round(float(f[1]), 3), "safe_f1": round(float(f[2]), 3),
        "accuracy": round(float(np.mean(np.array(y) == np.array(pred))), 3), "n": len(y),
    }


def main():
    df = pd.read_csv(DATA / "messages.csv")
    encoder = SentenceTransformer(MODEL_NAME, device="cpu")
    t0 = time.perf_counter()
    emb = encoder.encode(df.text.tolist(), batch_size=64, normalize_embeddings=True, show_progress_bar=False)
    ms_per_msg = (time.perf_counter() - t0) / len(df) * 1000

    tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED).split(df, df.label, groups=df.template_id))
    clf = LogisticRegression(C=10.0, max_iter=3000, class_weight="balanced")
    clf.fit(emb[tr], df.label.iloc[tr])
    result = {
        "model": MODEL_NAME,
        "encode_ms_per_message_cpu": round(ms_per_msg, 1),
        "holdout": metrics(df.label.iloc[te].tolist(), clf.predict(emb[te]).tolist()),
    }

    # Комбинация: TF-IDF (слова и n-граммы) + эмбеддинги rubert в одном векторе
    vec = TfidfVectorizer(analyzer=analyze, sublinear_tf=True, min_df=2, max_features=20000)
    x_tr = hstack([vec.fit_transform(df.text.iloc[tr]), csr_matrix(emb[tr])]).tocsr()
    x_te = hstack([vec.transform(df.text.iloc[te]), csr_matrix(emb[te])]).tocsr()
    combo = LogisticRegression(C=5.0, max_iter=3000, class_weight="balanced").fit(x_tr, df.label.iloc[tr])
    result["holdout_tfidf_plus_rubert"] = metrics(df.label.iloc[te].tolist(), combo.predict(x_te).tolist())

    files = sorted(DATA.glob("messages_test_manual_*.csv"))
    manual = pd.concat([pd.read_csv(f) for f in files], ignore_index=True).dropna(subset=["text", "label"]) if files else pd.DataFrame()
    if len(manual) >= 30:
        manual_emb = encoder.encode(manual.text.tolist(), normalize_embeddings=True)
        final = LogisticRegression(C=10.0, max_iter=3000, class_weight="balanced").fit(emb, df.label)
        result["manual"] = metrics(manual.label.tolist(), final.predict(manual_emb).tolist())
        vec_all = TfidfVectorizer(analyzer=analyze, sublinear_tf=True, min_df=2, max_features=20000)
        x_all = hstack([vec_all.fit_transform(df.text), csr_matrix(emb)]).tocsr()
        combo_all = LogisticRegression(C=5.0, max_iter=3000, class_weight="balanced").fit(x_all, df.label)
        x_manual = hstack([vec_all.transform(manual.text), csr_matrix(manual_emb)]).tocsr()
        result["manual_tfidf_plus_rubert"] = metrics(manual.label.tolist(), combo_all.predict(x_manual).tolist())

    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "rubert.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
