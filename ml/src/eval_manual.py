"""Честная оценка Щита на ручных сообщениях команды: учим на двух авторах, проверяем на третьем.

    python src/eval_manual.py

base — модель только на шаблонах; loao — шаблоны + ручные сообщения двух других авторов.
"""
import sys, json, tempfile
from pathlib import Path
import pandas as pd, numpy as np
ML = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(ML/'src')); sys.path.insert(0, str(ML.parent/'backend'))
import train_shield as T
from app.ml import shield_model
from app.services import shield
syn = pd.read_csv(ML/'data/messages.csv')
man = pd.concat([pd.read_csv(f) for f in sorted((ML/'data').glob('messages_test_manual_*.csv'))])
def norm(s): return 'safe' if s=='safe' else ('drop_recruitment' if s=='drop_recruitment' else 'other_fraud')
def use(vec, clf):
    tmp = Path(tempfile.mkdtemp())/'m.json'; T.export(vec, clf, tmp)
    payload = json.loads(tmp.read_text(encoding='utf-8'))
    shield_model._load = lambda: payload
def score(df):
    p = [norm(shield.classify(t)[0]) for t in df.text]; y = df.label.tolist()
    acc = np.mean([a==b for a,b in zip(p,y)])
    d = [(a,b) for a,b in zip(y,p)]
    rec = sum(1 for a,b in d if a==b=='drop_recruitment')/max(1,y.count('drop_recruitment'))
    prc = sum(1 for a,b in d if a==b=='drop_recruitment')/max(1,p.count('drop_recruitment'))
    fp = sum(1 for a,b in d if a=='safe' and b!='safe')
    return acc, rec, prc, fp
W = T.MANUAL_WEIGHT
for mode in ['base','loao']:
    res=[]
    for a in ['dasha','masha','alisa']:
        test = man[man.author==a]
        tr = syn[['text','label']]
        if mode=='loao':
            extra = man[man.author!=a][['text','label']]
            tr = pd.concat([tr]+[extra]*W)
        use(*T.fit(tr.text, tr.label)); res.append(score(test))
    r=np.array(res); print(mode, 'acc %.2f recall %.2f prec %.2f fp_safe %d/45' % (r[:,0].mean(), r[:,1].mean(), r[:,2].mean(), r[:,3].sum()))
