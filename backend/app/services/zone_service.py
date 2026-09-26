"""Business logic for hosted zones. Routers call these functions; no HTTP code here."""
import random
import secrets
import string

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.errors import AppError, ConflictError, NotFoundError
from app.models.hosted_zone import HostedZone
from app.models.record import DnsRecord
from app.models.user import User
from app.schemas.hosted_zone import HostedZoneCreate, HostedZoneOut
from app.services.validators import normalize_domain

DEFAULT_TYPES = ("SOA", "NS")  # created automatically with every zone


def _new_zone_id() -> str:
    # Route53 zone ids look like "Z" + ~20 uppercase letters/digits
    return "Z" + "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(20))


def _fake_name_servers() -> list[str]:
    tlds = ["com", "net", "org", "co.uk"]
    return [f"ns-{random.randint(1, 2047)}.awsdns-{random.randint(0, 63):02d}.{tld}." for tld in tlds]


def to_out(zone: HostedZone, record_count: int) -> HostedZoneOut:
    ns = next((r.values for r in zone.records if r.type == "NS" and r.name == zone.name), [])
    return HostedZoneOut(
        id=zone.id, name=zone.name, zone_type=zone.zone_type, comment=zone.comment,
        vpc_region=zone.vpc_region, vpc_id=zone.vpc_id, record_count=record_count,
        name_servers=ns, created_at=zone.created_at,
    )


def get_zone(db: Session, user: User, zone_id: str) -> HostedZone:
    """Fetch a zone and make sure it belongs to the current user."""
    zone = db.get(HostedZone, zone_id)
    if not zone or zone.user_id != user.id:
        raise NotFoundError(f"No hosted zone found with ID: {zone_id}")
    return zone


def count_records(db: Session, zone_id: str) -> int:
    return db.query(func.count(DnsRecord.id)).filter(DnsRecord.zone_id == zone_id).scalar()


def list_zones(db: Session, user: User, search: str, zone_type: str | None, page: int, page_size: int):
    counts = (
        db.query(DnsRecord.zone_id, func.count(DnsRecord.id).label("n"))
        .group_by(DnsRecord.zone_id).subquery()
    )
    q = (
        db.query(HostedZone, func.coalesce(counts.c.n, 0))
        .outerjoin(counts, counts.c.zone_id == HostedZone.id)
        .filter(HostedZone.user_id == user.id)
    )
    if search:
        like = f"%{search.strip().lower()}%"
        q = q.filter(or_(HostedZone.name.ilike(like), HostedZone.comment.ilike(like), HostedZone.id.ilike(like)))
    if zone_type:
        q = q.filter(HostedZone.zone_type == zone_type)

    total = q.count()
    rows = q.order_by(HostedZone.name).offset((page - 1) * page_size).limit(page_size).all()
    return [to_out(z, n) for z, n in rows], total


def create_zone(db: Session, user: User, data: HostedZoneCreate) -> HostedZone:
    name = normalize_domain(data.name)
    if "*" in name:
        raise AppError("A hosted zone name cannot contain a wildcard")
    if data.zone_type == "private" and not (data.vpc_region and data.vpc_id):
        raise AppError("Private hosted zones must be associated with a VPC (region and VPC ID)")
    if db.query(HostedZone).filter_by(user_id=user.id, name=name).first():
        raise ConflictError(f"A hosted zone named {name} already exists")

    zone = HostedZone(
        id=_new_zone_id(), user_id=user.id, name=name, zone_type=data.zone_type,
        comment=data.comment.strip(),
        vpc_region=data.vpc_region if data.zone_type == "private" else None,
        vpc_id=data.vpc_id if data.zone_type == "private" else None,
    )
    # Like Route53: every new zone gets an NS record and an SOA record at the apex
    ns = _fake_name_servers()
    zone.records = [
        DnsRecord(name=name, type="NS", ttl=172800, values_json="[]"),
        DnsRecord(name=name, type="SOA", ttl=900, values_json="[]"),
    ]
    zone.records[0].values = ns
    zone.records[1].values = [f"{ns[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"]
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


def update_zone(db: Session, user: User, zone_id: str, comment: str) -> HostedZone:
    zone = get_zone(db, user, zone_id)
    zone.comment = comment.strip()
    db.commit()
    db.refresh(zone)
    return zone


def delete_zone(db: Session, user: User, zone_id: str) -> None:
    zone = get_zone(db, user, zone_id)
    # Route53 refuses to delete a zone that still has non-default records (HostedZoneNotEmpty)
    extra = [r for r in zone.records if not (r.type in DEFAULT_TYPES and r.name == zone.name)]
    if extra:
        raise ConflictError(
            f"The hosted zone contains {len(extra)} record(s) other than the default NS and SOA records. "
            "Delete them before deleting the hosted zone."
        )
    db.delete(zone)
    db.commit()

