"""Executa testes reais no banco separado bau_test da instância local."""
import os
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy.engine import make_url

if __name__ == '__main__':
    os.chdir(Path(__file__).resolve().parent)
    url = make_url(dotenv_values('.env')['DATABASE_URL'])
    if (url.host, url.port, url.database) != ('127.0.0.1', 55432, 'bau'):
        raise SystemExit('Para outro servidor, configure TEST_DATABASE_URL e execute pytest diretamente.')
    os.environ['TEST_DATABASE_URL'] = url.set(database='bau_test').render_as_string(hide_password=False)
    import pytest
    raise SystemExit(pytest.main(['-q', '--tb=short']))
