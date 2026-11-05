import secrets

from fastapi import HTTPException
from sqlalchemy import func, select

from app.core.security import new_id
from app.models import DrawRequest, Legend, User, UserCard
from app.services.catalog import legend_data


def progress(db, user_id):
    total = db.scalar(select(func.count()).select_from(Legend))
    if total != 60:
        raise HTTPException(503, 'Catálogo indisponível: execute o seed das 60 lendas.')
    obtained = db.scalar(select(func.count()).select_from(UserCard).where(UserCard.user_id == user_id))
    return {'total': total, 'obtained': obtained, 'remaining': total - obtained,
            'complete': total == 60 and obtained == total}


def draw(db, user_id, key):
    # Autenticação já iniciou a transação. O commit na rota libera o lock.
    # PostgreSQL READ COMMITTED: consultas seguintes veem o commit do lock anterior.
    db.scalar(select(User).where(User.id == user_id).with_for_update())
    previous = db.scalar(select(DrawRequest).where(
        DrawRequest.user_id == user_id, DrawRequest.idempotency_key == key))
    if previous:
        return previous.result
    if db.scalar(select(func.count()).select_from(Legend)) != 60:
        raise HTTPException(503, 'Catálogo indisponível: execute o seed das 60 lendas.')
    owned = select(UserCard.legend_id).where(UserCard.user_id == user_id)
    candidates = list(db.scalars(select(Legend).where(Legend.id.not_in(owned)).order_by(Legend.numero)))
    legend = candidates[secrets.randbelow(len(candidates))] if candidates else None
    draw_id = new_id()
    if legend:
        db.add(UserCard(user_id=user_id, legend_id=legend.id))
        db.flush()
    state = progress(db, user_id)
    result = {'id': draw_id, 'legend': legend_data(legend) if legend else None,
              'progress': state, 'remaining': state['remaining'], 'complete': state['complete']}
    db.add(DrawRequest(id=draw_id, user_id=user_id, idempotency_key=key,
                       legend_id=legend.id if legend else None, result=result))
    db.flush()
    return result
