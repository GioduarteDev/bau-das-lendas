from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import COOKIE_NAME, DUMMY_HASH, issue_token, new_id, passwords
from app.db.session import get_db
from app.models import AuthSession, User
from app.routers.deps import current_session, current_user
from app.schemas import Login, Register, UserOut

router = APIRouter(prefix='/api/auth', tags=['conta'])


def start_session(db, user, response):
    session_id = new_id()
    token, expires = issue_token(user.id, session_id)
    db.add(AuthSession(id=session_id, user_id=user.id, expires_at=expires))
    db.commit()
    response.set_cookie(COOKIE_NAME, token, httponly=True, secure=get_settings().cookie_secure,
                        samesite='lax', path='/api', max_age=get_settings().session_minutes * 60)
    return user


@router.post('/register', response_model=UserOut, status_code=201)
def register(data: Register, response: Response, db: Session = Depends(get_db)):
    user = User(username=data.username, email=str(data.email), password_hash=passwords.hash(data.password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'E-mail já cadastrado.')
    return start_session(db, user, response)


@router.post('/login', response_model=UserOut)
def login(data: Login, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(data.email)))
    valid = passwords.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, 'E-mail ou senha inválidos.')
    return start_session(db, user, response)


@router.post('/logout', status_code=204)
def logout(response: Response, session: AuthSession = Depends(current_session), db: Session = Depends(get_db)):
    db.delete(session)
    db.commit()
    response.delete_cookie(COOKIE_NAME, path='/api', secure=get_settings().cookie_secure, httponly=True, samesite='lax')


@router.get('/me', response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
