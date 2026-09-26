"""Business logic for DNS records inside a hosted zone."""
from sqlalchemy import case, or_
from sqlalchemy.orm import Session

from app.core.errors import AppError, ConflictError, NotFoundError
from app.models.hosted_zone import HostedZone
from app.models.record import DnsRecord
from app.models.user import User
from app.schemas.record import RecordCreate, RecordOut, RecordUpdate
from app.services.validators import build_fqdn, validate_values
from app.services.zone_service import DEFAULT_TYPES, get_zone


def is_default(record: DnsRecord, zone: HostedZone) -> bool:
    return record.type in DEFAULT_TYPES and record.name == zone.name


def to_out(record: DnsRecord, zone: HostedZone) -> RecordOut:
    return RecordOut(
        id=record.id, zone_id=record.zone_id, name=record.name, type=record.type, ttl=record.ttl,
        values=record.values, routing_policy=record.routing_policy, is_default=is_default(record, zone),
        created_at=record.created_at, updated_at=record.updated_at,
    )


def get_record(db: Session, zone: HostedZone, record_id: int) -> DnsRecord:
    record = db.get(DnsRecord, record_id)
    if not record or record.zone_id != zone.id:
        raise NotFoundError(f"No record found with ID: {record_id}")
    return record


def list_records(db: Session, user: User, zone_id: str, search: str, record_type: str | None,
                 page: int, page_size: int):
    zone = get_zone(db, user, zone_id)
    q = db.query(DnsRecord).filter(DnsRecord.zone_id == zone.id)
    if search:
        like = f"%{search.strip().lower()}%"
        q = q.filter(or_(DnsRecord.name.ilike(like), DnsRecord.values_json.ilike(like)))
    if record_type:
        q = q.filter(DnsRecord.type == record_type)

    total = q.count()
    # Show apex NS and SOA first (like the console), then alphabetical by name and type
    default_first = case((DnsRecord.type.in_(DEFAULT_TYPES) & (DnsRecord.name == zone.name), 0), else_=1)
    rows = (q.order_by(default_first, DnsRecord.name, DnsRecord.type)
            .offset((page - 1) * page_size).limit(page_size).all())
    return [to_out(r, zone) for r in rows], total


def _check_conflicts(db: Session, zone: HostedZone, fqdn: str, rtype: str) -> None:
    same_name = db.query(DnsRecord).filter_by(zone_id=zone.id, name=fqdn).all()
    if any(r.type == rtype for r in same_name):
        raise ConflictError(f"A {rtype} record named {fqdn} already exists in this hosted zone")
    # DNS rule (RFC 1034): a CNAME cannot share its name with any other record
    if rtype == "CNAME" and same_name:
        raise ConflictError(f"{fqdn} already has other records, so it can't have a CNAME record")
    if any(r.type == "CNAME" for r in same_name):
        raise ConflictError(f"{fqdn} already has a CNAME record, so it can't have other record types")


def create_record(db: Session, user: User, zone_id: str, data: RecordCreate) -> RecordOut:
    zone = get_zone(db, user, zone_id)
    fqdn = build_fqdn(data.name, zone.name)
    if data.type == "CNAME" and fqdn == zone.name:
        raise AppError("A CNAME record can't be created at the zone apex. Use an A or AAAA record instead.")
    values = validate_values(data.type, data.values)
    _check_conflicts(db, zone, fqdn, data.type)

    record = DnsRecord(zone_id=zone.id, name=fqdn, type=data.type, ttl=data.ttl,
                       routing_policy=data.routing_policy, values_json="[]")
    record.values = values
    db.add(record)
    db.commit()
    db.refresh(record)
    return to_out(record, zone)


def update_record(db: Session, user: User, zone_id: str, record_id: int, data: RecordUpdate) -> RecordOut:
    zone = get_zone(db, user, zone_id)
    record = get_record(db, zone, record_id)
    record.values = validate_values(record.type, data.values)
    record.ttl = data.ttl
    db.commit()
    db.refresh(record)
    return to_out(record, zone)


def delete_records(db: Session, user: User, zone_id: str, record_ids: list[int]) -> int:
    """Delete one or many records in a single transaction (all or nothing)."""
    zone = get_zone(db, user, zone_id)
    records = [get_record(db, zone, rid) for rid in set(record_ids)]
    protected = [r for r in records if is_default(r, zone)]
    if protected:
        raise AppError("The default NS and SOA records of a hosted zone can't be deleted")
    for r in records:
        db.delete(r)
    db.commit()
    return len(records)
