from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    account_id: Mapped[str] = mapped_column(String(12))  # mocked 12-digit AWS account id
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    zones: Mapped[list["HostedZone"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Session(Base):
    """A login session. The token is sent by the frontend on every request."""
    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime)

    user: Mapped[User] = relationship()


from app.models.hosted_zone import HostedZone  # noqa: E402  (resolve relationship)
