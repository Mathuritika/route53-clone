import json
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DnsRecord(Base):
    """One record set = (name, type) inside a zone, holding one or more values.
    Route53 does the same: an A record 'www' can have several IPs."""
    __tablename__ = "dns_records"
    __table_args__ = (UniqueConstraint("zone_id", "name", "type", name="uq_record_zone_name_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("hosted_zones.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))          # fully qualified, trailing dot
    type: Mapped[str] = mapped_column(String(10))           # A, AAAA, CNAME, ...
    ttl: Mapped[int] = mapped_column(Integer, default=300)
    values_json: Mapped[str] = mapped_column(Text)          # JSON list of strings
    routing_policy: Mapped[str] = mapped_column(String(20), default="Simple")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    zone: Mapped["HostedZone"] = relationship(back_populates="records")

    @property
    def values(self) -> list[str]:
        return json.loads(self.values_json)

    @values.setter
    def values(self, items: list[str]) -> None:
        self.values_json = json.dumps(items)


from app.models.hosted_zone import HostedZone  # noqa: E402
