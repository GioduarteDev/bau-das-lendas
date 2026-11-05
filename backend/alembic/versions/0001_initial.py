"""Catálogo, contas, coleção, sessões revogáveis e sorteios idempotentes."""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('username', sa.String(80), nullable=False),
        sa.Column('email', sa.String(254), nullable=False, unique=True),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False))
    op.create_table('legends',
        sa.Column('id', sa.String(120), primary_key=True),
        sa.Column('numero', sa.Integer(), nullable=False, unique=True),
        sa.Column('nome', sa.Text(), nullable=False),
        sa.Column('origem', sa.Text(), nullable=False),
        sa.Column('historia', sa.Text(), nullable=False),
        sa.Column('imagem', sa.Text(), nullable=False),
        sa.Column('attributes', sa.JSON(), nullable=False))
    op.create_table('user_cards',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('legend_id', sa.String(120), sa.ForeignKey('legends.id'), nullable=False),
        sa.Column('collected_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'legend_id', name='uq_user_legend'))
    op.create_index('ix_user_cards_user_id', 'user_cards', ['user_id'])
    op.create_table('draw_requests',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('idempotency_key', sa.String(128), nullable=False),
        sa.Column('legend_id', sa.String(120), sa.ForeignKey('legends.id'), nullable=True),
        sa.Column('result', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'idempotency_key', name='uq_user_draw_key'))
    op.create_index('ix_draw_requests_user_id', 'draw_requests', ['user_id'])
    op.create_table('auth_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False))
    op.create_index('ix_auth_sessions_user_id', 'auth_sessions', ['user_id'])


def downgrade():
    for table in ('auth_sessions', 'draw_requests', 'user_cards', 'legends', 'users'):
        op.drop_table(table)
