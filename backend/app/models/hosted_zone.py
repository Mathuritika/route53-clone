from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class HostedZone(Base):
    __tablename__ = "hosted_zones"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_zone_user_name"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # Route53-style e.g. Z04A1B2C3D4E5F6G7H8I
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))        # always stored with trailing dot: "example.com."
    zone_type: Mapped[str] = mapped_column(String(10))    # "public" | "private"
    comment: Mapped[str] = mapped_column(String(256), default="")
    vpc_region: Mapped[str | None] = mapped_column(String(32), nullable=True)  # only for private zones
    vpc_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    owner: Mapped["User"] = relationship(back_populates="zones")
    records: Mapped[list["DnsRecord"]] = relationship(
        back_populates="zone", cascade="all, delete-orphan", passive_deletes=True
    )


from app.models.record import DnsRecord  # noqa: E402
from app.models.user import User  # noqa: E402
