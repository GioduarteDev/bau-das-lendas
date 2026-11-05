import json

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import get_engine
from app.models import Legend


def legend_data(legend):
    return {**legend.attributes, **{key: getattr(legend, key) for key in
            ('id', 'numero', 'nome', 'origem', 'historia', 'imagem')}}


def seed_catalog(db, path=None):
    entries = json.loads((path or get_settings().catalog_path).read_text(encoding='utf-8'))
    ids = [e['id'] for e in entries]
    if len(ids) != 60 or len(set(ids)) != 60 or any(not isinstance(i, str) or not i for i in ids):
        raise ValueError('O catálogo precisa de exatamente 60 IDs distintos.')
    if sorted(e['numero'] for e in entries) != list(range(1, 61)):
        raise ValueError('O catálogo precisa ter posições de 1 a 60.')
    existing = set(db.scalars(select(Legend.id)))
    if existing - set(ids):
        raise ValueError('Banco contém IDs fora do catálogo; nenhuma carta foi removida.')
    columns = ('id', 'numero', 'nome', 'origem', 'historia', 'imagem')
    for entry in entries:
        legend = db.get(Legend, entry['id'])
        if legend is None:
            legend = Legend(id=entry['id'])
            db.add(legend)
        for key in columns:
            setattr(legend, key, entry[key])
        legend.attributes = {k: v for k, v in entry.items() if k not in columns}
    db.flush()


if __name__ == '__main__':
    from sqlalchemy.orm import Session
    with Session(get_engine()) as db, db.begin():
        seed_catalog(db)
    print('Catálogo sincronizado: 60 lendas.')
