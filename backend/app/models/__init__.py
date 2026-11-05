from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.security import new_id


def now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    username: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Legend(Base):
    __tablename__ = 'legends'
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    numero: Mapped[int] = mapped_column(Integer, unique=True)
    nome: Mapped[str] = mapped_column(Text)
    origem: Mapped[str] = mapped_column(Text)
    historia: Mapped[str] = mapped_column(Text)
    imagem: Mapped[str] = mapped_column(Text)
    attributes: Mapped[dict] = mapped_column(JSON)


class UserCard(Base):
    __tablename__ = 'user_cards'
    __table_args__ = (UniqueConstraint('user_id', 'legend_id', name='uq_user_legend'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    legend_id: Mapped[str] = mapped_column(ForeignKey('legends.id'))
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class DrawRequest(Base):
    __tablename__ = 'draw_requests'
    __table_args__ = (UniqueConstraint('user_id', 'idempotency_key', name='uq_user_draw_key'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(128))
    legend_id: Mapped[str | None] = mapped_column(ForeignKey('legends.id'), nullable=True)
    # Snapshot garante a mesma resposta mesmo após outros sorteios.
    result: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuthSession(Base):
    __tablename__ = 'auth_sessions'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
