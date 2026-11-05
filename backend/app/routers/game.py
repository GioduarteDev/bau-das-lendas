from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Legend, User, UserCard
from app.routers.deps import current_user
from app.schemas import EmptyDraw
from app.services.catalog import legend_data
from app.services.collection import draw, progress

router = APIRouter(prefix='/api', tags=['coleção'])


@router.get('/legends')
def legends(db: Session = Depends(get_db)):
    result = [legend_data(l) for l in db.scalars(select(Legend).order_by(Legend.numero))]
    if len(result) != 60:
        raise HTTPException(503, 'Catálogo ainda não foi preparado.')
    return result


@router.get('/album/progress')
def album_progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return progress(db, user.id)


@router.get('/album')
def album(user: User = Depends(current_user), db: Session = Depends(get_db)):
    # Uma consulta mantém posições e progresso no mesmo snapshot.
    rows = db.execute(select(Legend, UserCard).outerjoin(UserCard,
        (UserCard.legend_id == Legend.id) & (UserCard.user_id == user.id)).order_by(Legend.numero)).all()
    if len(rows) != 60:
        raise HTTPException(503, 'Catálogo ainda não foi preparado.')
    obtained = sum(card is not None for _, card in rows)
    return {'positions': [
        {'numero': legend.numero, 'unlocked': card is not None,
         'legend': legend_data(legend) if card else None,
         'collected_at': card.collected_at if card else None} for legend, card in rows],
        'progress': {'total': len(rows), 'obtained': obtained, 'remaining': len(rows) - obtained,
                     'complete': len(rows) == 60 and obtained == 60}}


@router.post('/draws')
def create_draw(idempotency_key: Annotated[str, Header(min_length=1, max_length=128, pattern=r'^[A-Za-z0-9._:-]+$')],
                body: EmptyDraw | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    result = draw(db, user.id, idempotency_key)
    db.commit()
    return result
