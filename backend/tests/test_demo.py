from types import SimpleNamespace

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import UserCard
from demo_account import NAME, grant_demo_cards, illustrated_ids, require_development, verify_database
from conftest import register


def test_demo_requires_development_and_explicit_flag():
    for environment, flag in [('production', '1'), ('test', '1'), ('development', None), ('development', '0')]:
        with pytest.raises(RuntimeError, match='Bloqueado'):
            require_development(SimpleNamespace(app_env=environment), flag)
    require_development(SimpleNamespace(app_env='development'), '1')


def test_demo_refuses_another_database(engine):
    with pytest.raises(RuntimeError, match='Bloqueado'):
        verify_database(engine)


def test_demo_grants_only_official_art_once_and_preserves_other_users(client, engine):
    other = register(client, 'other@example.com')
    other_card = client.post('/api/draws', headers={'Idempotency-Key': 'other-draw'}).json()['legend']['id']
    response = client.post('/api/auth/register', json={'username': NAME, 'email': 'demo-bau-test@example.com', 'password': 'random-test-password-123'})
    assert response.status_code == 201
    user_id = response.json()['id']
    ids = illustrated_ids()
    assert len(ids) == 8 and 'saci-perere' not in ids
    with Session(engine) as db, db.begin():
        assert grant_demo_cards(db, user_id, ids) == 8
        assert grant_demo_cards(db, user_id, ids) == 0
    positions = client.get('/api/album').json()['positions']
    assert {p['legend']['id'] for p in positions if p['unlocked']} == set(ids)
    result = client.post('/api/draws', headers={'Idempotency-Key': 'after-demo'}).json()
    assert result['legend']['id'] not in ids
    with Session(engine) as db:
        assert list(db.scalars(select(UserCard.legend_id).where(UserCard.user_id == other['id']))) == [other_card]
        with pytest.raises(RuntimeError, match='não é a conta'):
            grant_demo_cards(db, other['id'], ids)
