from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
from threading import Barrier

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient
import jwt
import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import COOKIE_NAME
from app.db.session import get_db
from app.models import AuthSession, Base, DrawRequest, Legend, User, UserCard
from app.services.catalog import seed_catalog
from conftest import HEADERS, register


def draw(client, key='first', **kwargs):
    return client.post('/api/draws', headers={'Idempotency-Key': key}, **kwargs)


def test_registration_login_logout_and_revocation(client, engine):
    user = register(client, 'JOGADOR@example.com')
    assert user['email'] == 'jogador@example.com'
    assert 'password_hash' not in user
    cookie = client.cookies.get(COOKIE_NAME)
    assert 'HttpOnly' in client.post('/api/auth/login', json={
        'email': user['email'], 'password': 'senha-de-teste-123'}).headers['set-cookie']
    assert client.get('/api/auth/me').json() == user
    with Session(engine) as db:
        assert db.get(User, user['id']).password_hash.startswith('$argon2id$')
    revoked = client.cookies.get(COOKIE_NAME)
    assert client.post('/api/auth/logout').status_code == 204
    client.cookies.set(COOKIE_NAME, revoked)
    assert client.get('/api/auth/me').status_code == 401
    client.cookies.clear()
    assert client.post('/api/auth/login', json={
        'email': user['email'], 'password': 'senha-errada-123'}).status_code == 401
    assert cookie


def test_validation_and_duplicate_account(client):
    register(client)
    assert client.post('/api/auth/register', json={
        'username': 'Jogador', 'email': 'jogador@example.com', 'password': 'senha-de-teste-123'}).status_code == 409
    for fields in ({'email': 'invalido', 'password': 'senha-de-teste-123'},
                   {'email': 'ok@example.com', 'password': 'curta'}):
        assert client.post('/api/auth/register', json={'username': 'Jogador', **fields}).status_code == 422


def test_validation_never_echoes_password_or_extra_secrets(client):
    for fields in ({'password': 'secret'}, {'password': 'x' * 129},
                   {'password': 'valid-password-123', 'token': 'private-token'}):
        response = client.post('/api/auth/register', json={
            'username': 'Jogador', 'email': 'valid@example.com', **fields})
        assert response.status_code == 422
        assert fields['password'] not in response.text
        assert 'private-token' not in response.text


def test_health_queries_database_and_fails_safely(client, app):
    assert client.get('/api/health').json() == {'status': 'ok'}
    def unavailable():
        raise OperationalError('private-query', {}, Exception('private-password'))
        yield
    app.dependency_overrides[get_db] = unavailable
    response = client.get('/api/health')
    assert response.status_code == 503
    assert 'private' not in response.text


def test_protected_routes_and_csrf(client):
    for path in ('/api/auth/me', '/api/album', '/api/album/progress'):
        assert client.get(path).status_code == 401
    assert draw(client).status_code == 401
    assert client.post('/api/auth/login', headers={'Origin': 'https://evil.example'}, json={}).status_code == 403
    assert client.post('/api/auth/login', headers={'X-Bau-Request': ''}, json={}).status_code == 403
    response = client.options('/api/draws', headers={
        'Origin': 'https://evil.example', 'Access-Control-Request-Method': 'POST'})
    assert 'access-control-allow-origin' not in response.headers


def test_expired_session_and_tampered_jwt(client, engine):
    register(client)
    cookie = client.cookies.get(COOKIE_NAME)
    client.cookies.clear()
    client.cookies.set(COOKIE_NAME, cookie + 'tampered')
    assert client.get('/api/auth/me').status_code == 401
    client.cookies.set(COOKIE_NAME, cookie)
    with Session(engine) as db, db.begin():
        session = db.scalar(select(AuthSession))
        session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert client.get('/api/auth/me').status_code == 401
    claims = jwt.decode(cookie, get_settings().jwt_secret, algorithms=['HS256'], audience='bau-web')
    claims['exp'] = datetime.now(timezone.utc) - timedelta(seconds=1)
    expired = jwt.encode(claims, get_settings().jwt_secret, algorithm='HS256')
    client.cookies.set(COOKIE_NAME, expired)
    assert client.get('/api/auth/me').status_code == 401


def test_seed_exact_idempotent_preserves_data_and_migration(engine, client, tmp_path):
    source = json.loads(get_settings().catalog_path.read_text(encoding='utf-8'))
    with Session(engine) as db, db.begin():
        seed_catalog(db)
        seed_catalog(db)
        assert db.scalar(select(func.count()).select_from(Legend)) == 60
    assert client.get('/api/legends').json() == sorted(source, key=lambda x: x['numero'])
    with engine.connect() as conn:
        assert compare_metadata(MigrationContext.configure(conn), Base.metadata) == []
    invalid = tmp_path / 'invalid.json'
    for rows in (source[:-1], [source[0]] * 60):
        invalid.write_text(json.dumps(rows), encoding='utf-8')
        with Session(engine) as db, pytest.raises(ValueError):
            seed_catalog(db, invalid)


def test_first_second_uniform_candidates_and_idempotency(client, monkeypatch):
    register(client)
    counts = []
    def choose(count):
        counts.append(count)
        return count - 1
    monkeypatch.setattr('app.services.collection.secrets.randbelow', choose)
    first = draw(client).json()
    second = draw(client, 'second').json()
    assert counts == [60, 59]
    assert first['legend']['numero'] == 60
    assert second['legend']['numero'] == 59
    assert first['remaining'] == 59
    assert second['progress']['obtained'] == 2
    assert draw(client).json() == first
    assert counts == [60, 59]
    assert client.post('/api/draws').status_code == 422
    assert draw(client, 'invalid key').status_code == 422
    assert draw(client, 'cheat', json={'legend_id': 'loira-do-banheiro'}).status_code == 422


def test_album_locked_and_independent_users(client):
    register(client)
    empty = client.get('/api/album').json()
    assert len(empty['positions']) == 60
    assert [p['numero'] for p in empty['positions']] == list(range(1, 61))
    assert all(p['legend'] is None and p['collected_at'] is None and not p['unlocked'] for p in empty['positions'])
    first = draw(client).json()
    album = client.get('/api/album').json()
    unlocked = [p for p in album['positions'] if p['unlocked']]
    assert len(unlocked) == 1 and unlocked[0]['collected_at']
    assert unlocked[0]['legend'] == first['legend']
    register(client, 'outro@example.com')
    assert client.get('/api/album/progress').json()['obtained'] == 0
    assert draw(client).json()['progress']['obtained'] == 1


def test_sixty_draws_complete_and_unique(client, engine):
    register(client)
    results = [draw(client, f'draw-{i}').json() for i in range(60)]
    assert len({r['legend']['id'] for r in results}) == 60
    assert results[-1]['complete'] and results[-1]['remaining'] == 0
    full = draw(client, 'full').json()
    assert full['legend'] is None and full['complete']
    assert draw(client, 'full').json() == full
    assert client.get('/api/album/progress').json() == {
        'total': 60, 'obtained': 60, 'remaining': 0, 'complete': True}
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(UserCard)) == 60


def test_unique_database_constraints(client, engine):
    user = register(client)
    result = draw(client).json()
    with Session(engine) as db:
        db.add(UserCard(user_id=user['id'], legend_id=result['legend']['id']))
        with pytest.raises(IntegrityError):
            db.commit()
    with Session(engine) as db:
        db.add(DrawRequest(user_id=user['id'], idempotency_key='first',
                           legend_id=result['legend']['id'], result=result))
        with pytest.raises(IntegrityError):
            db.commit()


def test_failure_rolls_back_and_same_key_retries(client, engine, monkeypatch):
    register(client)
    def unavailable(*args):
        raise OperationalError('simulated', {}, Exception('offline'))
    with monkeypatch.context() as patch:
        patch.setattr('app.services.collection.progress', unavailable)
        assert draw(client).status_code == 503
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(UserCard)) == 0
        assert db.scalar(select(func.count()).select_from(DrawRequest)) == 0
    assert draw(client).json()['progress']['obtained'] == 1


def test_database_unavailable_returns_safe_503(client, app):
    def unavailable():
        raise OperationalError('hidden-query', {}, Exception('hidden-secret'))
        yield
    app.dependency_overrides[get_db] = unavailable
    response = client.get('/api/legends')
    assert response.status_code == 503
    assert 'hidden' not in response.text


@pytest.mark.parametrize('same_key', [True, False])
def test_concurrent_draws_postgresql(client, app, engine, same_key):
    if engine.dialect.name != 'postgresql':
        pytest.skip('SELECT FOR UPDATE exige PostgreSQL real.')
    register(client)
    cookies = dict(client.cookies)
    barrier = Barrier(8)
    def send(index):
        with TestClient(app, headers=HEADERS, cookies=cookies) as independent:
            barrier.wait(timeout=20)
            response = draw(independent, 'shared' if same_key else f'parallel-{index}')
            assert response.status_code == 200, response.text
            return response.json()
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(send, range(8)))
    expected = 1 if same_key else 8
    assert len({r['legend']['id'] for r in results}) == expected
    if same_key:
        assert all(r == results[0] for r in results)
    assert client.get('/api/album/progress').json()['obtained'] == expected
