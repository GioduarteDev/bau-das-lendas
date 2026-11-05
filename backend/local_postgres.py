"""Instância local autorizada: nunca altera o serviço PostgreSQL do Windows.

Executar da pasta backend: .venv/Scripts/python.exe local_postgres.py
"""
import os
from pathlib import Path
import secrets
import subprocess

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent
DATA = ROOT / '.pg-local'
BIN = Path(os.environ.get('BAU_PG_BIN', 'C:/Program Files/PostgreSQL/18/bin'))
PORT = 55432


def run(name, *args):
    result = subprocess.run([str(BIN / (name + '.exe')), *map(str, args)],
                            cwd=ROOT, stdin=subprocess.DEVNULL,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            timeout=40,
                            creationflags=subprocess.CREATE_NO_WINDOW)
    if result.returncode:
        # Não imprimir comandos/ambiente: podem conter credenciais.
        raise RuntimeError(f'{name} falhou (código {result.returncode}). '
                           'Verifique permissões e backend/.pg-local-server.log.')


def main():
    env_path = ROOT / '.env'
    if not (BIN / 'pg_ctl.exe').exists():
        raise SystemExit('Defina BAU_PG_BIN com a pasta bin do PostgreSQL instalado.')
    if not env_path.exists():
        if DATA.exists():
            raise SystemExit('Há dados locais sem .env. Recupere a configuração; nada foi alterado.')
        password = secrets.token_urlsafe(32)
        with env_path.open('x', encoding='utf-8') as stream:
            stream.write(f'DATABASE_URL=postgresql+psycopg://bau:{password}@127.0.0.1:{PORT}/bau\n'
                         f'JWT_SECRET={secrets.token_urlsafe(48)}\nCOOKIE_SECURE=false\n'
                         'ALLOWED_ORIGINS=["http://localhost:5175","http://127.0.0.1:5175"]\n')
    config = dotenv_values(env_path)
    from sqlalchemy.engine import make_url
    url = make_url(config.get('DATABASE_URL', ''))
    if (url.host, url.port, url.username, url.database) != ('127.0.0.1', PORT, 'bau', 'bau'):
        raise SystemExit('O .env aponta para outro banco. Preserve-o e use o servidor configurado.')
    if not (DATA / 'PG_VERSION').exists():
        if DATA.exists():
            raise SystemExit('Diretório PostgreSQL incompleto: inspecione manualmente; nada foi apagado.')
        password_file = ROOT / '.pg-password'
        try:
            with password_file.open('x', encoding='utf-8') as stream:
                stream.write(url.password)
            run('initdb', '-D', DATA, '-U', 'bau', '--auth=scram-sha-256',
                '--encoding=UTF8', '--pwfile', password_file)
        finally:
            password_file.unlink(missing_ok=True)
    import psycopg
    from psycopg import sql
    connection = dict(host=url.host, port=url.port, user=url.username,
                      password=url.password, dbname='postgres', connect_timeout=5)
    # Verifica conexão real e o diretório, inclusive sob tokens restritos do Windows.
    try:
        with psycopg.connect(**connection) as conn:
            actual = conn.execute('SHOW data_directory').fetchone()[0]
            if Path(actual).resolve() != DATA.resolve():
                raise SystemExit('A porta pertence a outra instância. Nada foi alterado.')
    except psycopg.OperationalError:
        run('pg_ctl', 'start', '-D', DATA, '-l', ROOT / '.pg-local-server.log',
            '-o', f'-p {PORT} -h 127.0.0.1', '-w', '-t', '30')
    # Cria somente os bancos nomeados desta instância exclusiva; não remove dados.
    with psycopg.connect(**connection, autocommit=True) as conn:
        for name in ('bau', 'bau_test'):
            if not conn.execute('SELECT 1 FROM pg_database WHERE datname=%s', (name,)).fetchone():
                conn.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
    print(f'PostgreSQL local ativo em 127.0.0.1:{PORT}. Bancos bau e bau_test disponíveis.')


if __name__ == '__main__':
    main()
