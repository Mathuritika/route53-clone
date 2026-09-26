"""Reusable FastAPI dependencies: DB session and current logged-in user."""
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.errors import AuthError
from app.models.user import User
from app.services import auth_service


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_token(authorization: str | None = Header(default=None)) -> str:
    # Expected header: "Authorization: Bearer <token>"
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthError("Missing or invalid Authorization header")
    return authorization.removeprefix("Bearer ").strip()


def get_current_user(token: str = Depends(get_token), db: Session = Depends(get_db)) -> User:
    return auth_service.get_user_by_token(db, token)
