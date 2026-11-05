"""Conta de demonstração: autenticação HTTP real + concessão local de desenvolvimento.

APP_ENV=development e BAU_ENABLE_DEMO_ACCOUNT=1 são obrigatórios.
Não cria rota HTTP, não modifica sorteios e não aceita banco de produção.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import sys
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine
from app.models import Legend, User, UserCard

ROOT = Path(__file__).resolve().parent
CREDENTIALS = ROOT / '.demo-account.local.json'
NAME = 'Demonstração Baú das Lendas'


def require_development(settings, enabled):
    if settings.app_env != 'development' or enabled != '1':
        raise RuntimeError('Bloqueado: exige APP_ENV=development e BAU_ENABLE_DEMO_ACCOUNT=1.')


def verify_database(engine):
    if (engine.dialect.name, engine.url.host, engine.url.port, engine.url.database) != ('postgresql', '127.0.0.1', 55432, 'bau'):
        raise RuntimeError('Bloqueado: somente o PostgreSQL local de desenvolvimento deste projeto é permitido.')
    with engine.connect() as conn:
        directory = conn.execute(text('SHOW data_directory')).scalar()
    if Path(directory).resolve() != (ROOT / '.pg-local').resolve():
        raise RuntimeError('Bloqueado: o banco não pertence à instância de desenvolvimento do projeto.')


def illustrated_ids():
    manifest = json.loads((ROOT.parent / 'public/lendas/manifest.json').read_text(encoding='utf-8'))
    ids = [row['id'] for row in manifest if row['src']]
    if len(ids) != 8 or len(set(ids)) != 8 or 'saci-perere' in ids:
        raise RuntimeError('O manifesto precisa conter exatamente as oito cartas oficiais ilustradas.')
    return ids


def grant_demo_cards(db, user_id, ids):
    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not user or user.username != NAME or not user.email.startswith('demo-bau-'):
        raise RuntimeError('A conta não é a conta de demonstração criada por este script.')
    if set(db.scalars(select(Legend.id).where(Legend.id.in_(ids)))) != set(ids):
        raise RuntimeError('Sincronize o catálogo oficial no banco antes de preparar a demonstração.')
    owned = set(db.scalars(select(UserCard.legend_id).where(UserCard.user_id == user_id)))
    for legend_id in ids:
        if legend_id not in owned:
            db.add(UserCard(user_id=user_id, legend_id=legend_id))
    db.flush()
    return len(set(ids) - owned)


def save(credentials):
    # Arquivo secreto local ignorado pelo Git/Docker; nunca vai para public/.
    CREDENTIALS.write_text(json.dumps(credentials, indent=2) + '\n', encoding='utf-8')


def show(credentials):
    if sys.stdout.isatty():
        print('E-mail:', credentials['email'])
        print('Senha:', credentials['password'])
    else:
        print('Credenciais não exibidas em saída capturada. Execute este script no terminal local para vê-las.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--show-credentials', action='store_true', help='Exibe credenciais apenas em terminal interativo local.')
    args = parser.parse_args()
    require_development(get_settings(), os.environ.get('BAU_ENABLE_DEMO_ACCOUNT'))
    engine = get_engine()
    verify_database(engine)
    if args.show_credentials:
        if not CREDENTIALS.exists():
            raise RuntimeError('Prepare a conta antes de consultar as credenciais.')
        show(json.loads(CREDENTIALS.read_text(encoding='utf-8')))
        return
    ids = illustrated_ids()
    origin = os.environ.get('BAU_DEMO_ORIGIN', 'http://localhost:5175').rstrip('/')
    url = urlparse(origin)
    if url.scheme != 'http' or url.hostname not in {'localhost', '127.0.0.1'} or url.port != 5175 or url.path:
        raise RuntimeError('Bloqueado: a autenticação deve usar o Vite local em localhost:5175.')
    credentials = json.loads(CREDENTIALS.read_text(encoding='utf-8')) if CREDENTIALS.exists() else {
        'email': f'demo-bau-{uuid4().hex}@example.com', 'password': secrets.token_urlsafe(24)}
    # Salva antes do cadastro para permitir recuperação após interrupção.
    if not CREDENTIALS.exists():
        with CREDENTIALS.open('x', encoding='utf-8') as stream:
            json.dump(credentials, stream)
    with httpx.Client(base_url=origin, headers={'Origin': origin, 'X-Bau-Request': '1'}, timeout=20) as client:
        with Session(engine) as db:
            existing = db.scalar(select(User).where(User.email == credentials['email']))
            if existing and (existing.username != NAME or credentials.get('user_id') not in {None, existing.id}):
                raise RuntimeError('A identidade salva não corresponde à demonstração; nenhuma coleção foi alterada.')
        if not existing:
            response = client.post('/api/auth/register', json={'username': NAME, 'email': credentials['email'], 'password': credentials['password']})
            if response.status_code != 201:
                raise RuntimeError('O cadastro real falhou. Verifique API, banco e origem; credenciais não serão exibidas no erro.')
        response = client.post('/api/auth/login', json={'email': credentials['email'], 'password': credentials['password']})
        if response.status_code != 200:
            raise RuntimeError('O login real falhou. A coleção não foi alterada.')
        user_id = response.json()['id']
        try:
            if credentials.get('user_id') not in {None, user_id}:
                raise RuntimeError('Identidade divergente; nenhuma coleção foi alterada.')
            with Session(engine) as db:
                user = db.get(User, user_id)
                if not user or user.email != credentials['email']:
                    raise RuntimeError('API e configuração local não apontam para a mesma conta/banco.')
            credentials['user_id'] = user_id; save(credentials)
            with Session(engine) as db, db.begin():
                added = grant_demo_cards(db, user_id, ids)
            album = client.get('/api/album')
            if album.status_code != 200 or not set(ids).issubset({p['legend']['id'] for p in album.json()['positions'] if p['unlocked']}):
                raise RuntimeError('A API não confirmou as oito cartas da demonstração.')
        finally:
            client.post('/api/auth/logout')
    print(f'Conta de demonstração confirmada no PostgreSQL. Cartas oficiais: 8; novas concessões: {added}. Saci: exposição.')
    show(credentials)


if __name__ == '__main__':
    os.chdir(ROOT)
    try:
        main()
    except (RuntimeError, SQLAlchemyError, httpx.HTTPError, OSError, ValueError) as error:
        # Erros de drivers podem conter URLs/segredos. Nunca imprimir seu conteúdo.
        message = str(error) if isinstance(error, RuntimeError) else 'Serviço/configuração indisponível. Nenhum banco alternativo foi usado.'
        raise SystemExit(message) from None
