"""Deterministic, idempotent seed: runs only when the users table is empty."""
import random

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.hosted_zone import HostedZoneCreate
from app.schemas.record import RecordCreate
from app.services import record_service, zone_service
from app.services.auth_service import hash_password

DEMO_ZONES = [
    ("example.com", "public", "Main company website", [
        ("", "A", ["192.0.2.10", "192.0.2.11"]),
        ("", "AAAA", ["2001:db8::10"]),
        ("", "MX", ["10 mail.example.com", "20 mail2.example.com"]),
        ("", "TXT", ["v=spf1 include:amazonses.com ~all"]),
        ("", "CAA", ['0 issue "amazon.com"']),
        ("www", "CNAME", ["example.com"]),
        ("mail", "A", ["192.0.2.25"]),
        ("mail2", "A", ["192.0.2.26"]),
        ("api", "A", ["198.51.100.4"]),
        ("_dmarc", "TXT", ["v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"]),
        ("_sip._tcp", "SRV", ["10 60 5060 sip.example.com"]),
        ("sip", "A", ["192.0.2.40"]),
        ("blog", "CNAME", ["example.ghost.io"]),
        ("shop", "CNAME", ["shops.myshopify.com"]),
        ("dev", "NS", ["ns-101.awsdns-12.com", "ns-900.awsdns-40.net"]),
    ]),
    ("myapp.io", "public", "Production SaaS app", [
        ("", "A", ["203.0.113.50"]),
        ("app", "A", ["203.0.113.51"]),
        ("status", "CNAME", ["myapp.statuspage.io"]),
        ("", "TXT", ["google-site-verification=abc123xyz"]),
    ]),
    ("staging.myapp.io", "public", "Staging environment", [
        ("", "A", ["203.0.113.80"]),
    ]),
    ("internal.corp", "private", "Internal services", [
        ("db", "A", ["10.0.1.15"]),
        ("cache", "A", ["10.0.1.20"]),
    ]),
    ("2.0.192.in-addr.arpa", "public", "Reverse DNS", [
        ("10", "PTR", ["example.com"]),
    ]),
    ("acme-shop.net", "public", "", []),
]


def seed_if_empty(db: Session) -> None:
    if db.query(User).first():
        return
    random.seed(42)  # same fake name servers on every seed

    user = User(username="demo", password_hash=hash_password("demo1234"), account_id="123456789012")
    db.add(user)
    db.add(User(username="admin", password_hash=hash_password("admin1234"), account_id="210987654321"))
    db.commit()

    for name, ztype, comment, records in DEMO_ZONES:
        zone = zone_service.create_zone(db, user, HostedZoneCreate(
            name=name, zone_type=ztype, comment=comment,
            vpc_region="ap-south-1" if ztype == "private" else None,
            vpc_id="vpc-0a1b2c3d4e5f67890" if ztype == "private" else None,
        ))
        for rname, rtype, values in records:
            record_service.create_record(db, user, zone.id, RecordCreate(name=rname, type=rtype, ttl=300, values=values))
