"""Summary numbers for the Route 53 dashboard, computed with aggregate SQL queries."""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.hosted_zone import HostedZone
from app.models.record import DnsRecord
from app.models.user import User
from app.schemas.dashboard import DashboardOut, RecentZone, TypeCount


def get_dashboard(db: Session, user: User) -> DashboardOut:
    # SELECT zone_type, COUNT(*) FROM hosted_zones WHERE user_id = ? GROUP BY zone_type
    zone_counts = dict(
        db.query(HostedZone.zone_type, func.count(HostedZone.id))
        .filter(HostedZone.user_id == user.id)
        .group_by(HostedZone.zone_type).all()
    )

    # Records of this user's zones, grouped by type (JOIN so we only count our own)
    type_counts = (
        db.query(DnsRecord.type, func.count(DnsRecord.id))
        .join(HostedZone, HostedZone.id == DnsRecord.zone_id)
        .filter(HostedZone.user_id == user.id)
        .group_by(DnsRecord.type)
        .order_by(func.count(DnsRecord.id).desc())
        .all()
    )

    recent = (
        db.query(HostedZone).filter(HostedZone.user_id == user.id)
        .order_by(HostedZone.created_at.desc(), HostedZone.name).limit(5).all()
    )

    return DashboardOut(
        total_zones=sum(zone_counts.values()),
        public_zones=zone_counts.get("public", 0),
        private_zones=zone_counts.get("private", 0),
        total_records=sum(n for _, n in type_counts),
        records_by_type=[TypeCount(type=t, count=n) for t, n in type_counts],
        recent_zones=[RecentZone(id=z.id, name=z.name, zone_type=z.zone_type, created_at=z.created_at) for z in recent],
    )
