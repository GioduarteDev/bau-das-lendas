from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import get_settings


@lru_cache
def get_engine():
    url = get_settings().database_url
    options = {'connect_args': {'connect_timeout': 5}} if url.startswith('postgresql') else {}
    return create_engine(url, pool_pre_ping=True, **options)


def get_db():
    with Session(get_engine(), expire_on_commit=False) as session:
        yield session
