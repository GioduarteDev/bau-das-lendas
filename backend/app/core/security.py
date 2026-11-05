from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash('timing-only-invalid-password')
COOKIE_NAME = 'bau_session'


def issue_token(user_id: str, session_id: str):
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.session_minutes)
    token = jwt.encode(
        {'sub': user_id, 'jti': session_id, 'exp': expires,
         'iat': datetime.now(timezone.utc), 'iss': 'bau-das-lendas', 'aud': 'bau-web'},
        settings.jwt_secret, algorithm='HS256',
    )
    return token, expires


def new_id():
    return str(uuid4())
