import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_configuration_errors_do_not_print_secrets():
    secret = 'private-jwt-' + 'z' * 48
    with pytest.raises(ValidationError) as caught:
        Settings(_env_file=None, database_url='postgresql+psycopg://user:private-db@localhost/bau',
                 jwt_secret=secret, allowed_origins=['*'])
    assert secret not in str(caught.value)
    assert 'private-db' not in str(caught.value)
