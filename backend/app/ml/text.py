"""Токенизация сообщений для классификатора Щита.

Одна функция analyze() и при обучении (как analyzer в TfidfVectorizer),
и в бэкенде (shield_model.py) — признаки совпадают один в один.
"""
import re

_URL = re.compile(r"https?://\S+|www\.\S+|\b\S+\.(?:ru|com|net|org|io|me|xyz|top|site)\b\S*")
_NUM = re.compile(r"\d+")
_WORD = re.compile(r"[a-zа-я0]+|[%₽$💰💸🔥✅❗]")


def normalize(text: str) -> str:
    text = text.lower().replace("ё", "е")
    text = _URL.sub(" ссылка ", text)
    return _NUM.sub("0", text)


def analyze(text: str) -> list[str]:
    """Слова, пары слов и буквенные n-граммы 3–5 внутри слов (устойчивы к опечаткам)."""
    words = _WORD.findall(normalize(text))
    feats = [f"w:{w}" for w in words]
    feats += [f"b:{a}_{b}" for a, b in zip(words, words[1:])]
    for w in words:
        if len(w) < 3:
            continue
        padded = f"<{w}>"
        for n in (3, 4, 5):
            feats += [f"c:{padded[i:i + n]}" for i in range(len(padded) - n + 1)]
    return feats
