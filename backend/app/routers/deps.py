from datetime import datetime, timezone

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import COOKIE_NAME
from app.db.session import get_db
from app.models import AuthSession, User


def current_session(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    try:
        payload = jwt.decode(token or '', get_settings().jwt_secret, algorithms=['HS256'],
                             issuer='bau-das-lendas', audience='bau-web',
                             options={'require': ['exp', 'iat', 'sub', 'jti']})
    except jwt.InvalidTokenError:
        raise HTTPException(401, 'Entre na sua conta para continuar.')
    session = db.get(AuthSession, payload['jti'])
    expires = session.expires_at if session else None
    if expires is not None:
        expires = expires.replace(tzinfo=timezone.utc) if expires.tzinfo is None else expires.astimezone(timezone.utc)
    if (not session or session.user_id != payload['sub'] or
            expires <= datetime.now(timezone.utc)):
        raise HTTPException(401, 'Sessão encerrada ou expirada.')
    return session


def current_user(session: AuthSession = Depends(current_session), db: Session = Depends(get_db)):
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(401, 'Conta não encontrada.')
    return user
