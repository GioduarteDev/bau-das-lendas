from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import get_settings
from app.models import Base

target_metadata = Base.metadata
url = get_settings().database_url

if context.is_offline_mode():
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    supplied = context.config.attributes.get('connection')
    def migrate(connection):
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    if supplied is not None:
        migrate(supplied)
    else:
        engine = create_engine(url, poolclass=pool.NullPool)
        with engine.connect() as connection:
            migrate(connection)
