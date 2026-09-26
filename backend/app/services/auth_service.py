"""Mocked authentication: username/password check + random session token stored in SQLite."""
import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session as DbSession

from app.core.config import SESSION_HOURS
from app.core.errors import AuthError
from app.models.user import Session, User


def hash_password(password: str) -> str:
    # Mocked auth, but we still never store plain-text passwords
    return hashlib.sha256(("route53-clone:" + password).encode()).hexdigest()


def login(db: DbSession, username: str, password: str) -> tuple[str, User]:
    user = db.query(User).filter(User.username == username.strip()).first()
    if not user or user.password_hash != hash_password(password):
        raise AuthError("Incorrect username or password")

    token = secrets.token_hex(32)
    db.add(Session(token=token, user_id=user.id, expires_at=datetime.utcnow() + timedelta(hours=SESSION_HOURS)))
    db.commit()
    return token, user


def get_user_by_token(db: DbSession, token: str) -> User:
    session = db.get(Session, token)
    if not session or session.expires_at < datetime.utcnow():
        raise AuthError("Session expired, please sign in again")
    return session.user


def logout(db: DbSession, token: str) -> None:
    db.query(Session).filter(Session.token == token).delete()
    db.commit()
