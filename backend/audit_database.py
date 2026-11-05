"""Consultas reais somente de leitura; saída sem contas, hashes ou segredos."""
import json

from sqlalchemy import inspect, text
from app.db.session import get_engine


def main():
    engine = get_engine()
    inspector = inspect(engine)
    with engine.connect() as connection:
        result = {'database': engine.dialect.name,
                  'version': connection.execute(text('SHOW server_version')).scalar(),
                  'migration': connection.execute(text('SELECT version_num FROM alembic_version')).scalar(),
                  'counts': {table: connection.execute(text(f'SELECT count(*) FROM {table}')).scalar()
                             for table in ('legends', 'users', 'user_cards', 'draw_requests', 'auth_sessions')},
                  'legend_ids': connection.execute(text('SELECT count(DISTINCT id) FROM legends')).scalar(),
                  'legend_numbers': connection.execute(text('SELECT min(numero), max(numero), count(DISTINCT numero) FROM legends')).one()._asdict(),
                  'tables': inspector.get_table_names(),
                  'constraints': {table: {'foreign_keys': len(inspector.get_foreign_keys(table)),
                                           'unique': len(inspector.get_unique_constraints(table))}
                                  for table in ('users', 'legends', 'user_cards', 'draw_requests', 'auth_sessions')}}
    print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
