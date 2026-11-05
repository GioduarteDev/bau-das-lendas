import os
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# Configuração exclusiva dos testes, nunca uma credencial de implantação.
os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['JWT_SECRET'] = 'test-only-' + 'x' * 48
os.environ['COOKIE_SECURE'] = 'false'

from app.db.session import get_db
from app.main import create_app
from app.services.catalog import seed_catalog

HEADERS = {'Origin': 'http://localhost:5175', 'X-Bau-Request': '1'}
ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(params=['sqlite', 'postgresql'])
def engine(request, tmp_path):
    admin = None
    if request.param == 'postgresql':
        url = os.environ.get('TEST_DATABASE_URL')
        if not url:
            pytest.skip('Defina TEST_DATABASE_URL para testar PostgreSQL real.')
        if not url.startswith('postgresql'):
            pytest.fail('TEST_DATABASE_URL deve apontar para PostgreSQL.')
        schema = 'test_bau_' + uuid4().hex
        admin = create_engine(url)
        with admin.begin() as conn:
            conn.execute(text(f'CREATE SCHEMA {schema}'))
        db_engine = create_engine(url, connect_args={'options': f'-csearch_path={schema}'})
    else:
        db_engine = create_engine(f'sqlite:///{tmp_path / "test.db"}', connect_args={'check_same_thread': False})
    config = Config(str(ROOT / 'alembic.ini'))
    config.set_main_option('script_location', str(ROOT / 'alembic'))
    with db_engine.begin() as conn:
        config.attributes['connection'] = conn
        command.upgrade(config, 'head')
    with Session(db_engine) as db, db.begin():
        seed_catalog(db)
    yield db_engine
    db_engine.dispose()
    if admin:
        with admin.begin() as conn:
            conn.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        admin.dispose()


@pytest.fixture
def app(engine):
    application = create_app()
    def override():
        with Session(engine, expire_on_commit=False) as db:
            yield db
    application.dependency_overrides[get_db] = override
    return application


@pytest.fixture
def client(app):
    with TestClient(app, headers=HEADERS) as client:
        yield client


def register(client, email='jogador@example.com'):
    result = client.post('/api/auth/register', json={
        'username': 'Jogador', 'email': email, 'password': 'senha-de-teste-123'})
    assert result.status_code == 201, result.text
    return result.json()
