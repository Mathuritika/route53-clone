"""Import/export of zone data (bonus). Export as JSON or BIND zone-file text;
import a (simplified) BIND zone file."""
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.hosted_zone import HostedZone
from app.models.user import User
from app.schemas.record import RecordCreate
from app.services import record_service
from app.services.zone_service import get_zone

SUPPORTED = {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"}


def export_json(zone: HostedZone) -> dict:
    return {
        "HostedZone": {"Id": zone.id, "Name": zone.name, "Type": zone.zone_type, "Comment": zone.comment},
        "ResourceRecordSets": [
            {"Name": r.name, "Type": r.type, "TTL": r.ttl, "ResourceRecords": [{"Value": v} for v in r.values]}
            for r in sorted(zone.records, key=lambda r: (r.name, r.type))
        ],
    }


def export_bind(zone: HostedZone) -> str:
    lines = [f"; Exported from Route 53 clone - hosted zone {zone.id}", f"$ORIGIN {zone.name}", ""]
    for r in sorted(zone.records, key=lambda r: (r.type != "SOA", r.name != zone.name, r.name, r.type)):
        name = "@" if r.name == zone.name else r.name.removesuffix("." + zone.name)
        for v in r.values:
            lines.append(f"{name:<30} {r.ttl:<7} IN  {r.type:<6} {v}")
    return "\n".join(lines) + "\n"


def _logical_lines(text: str):
    """Strip comments and join records split across '( ... )' into one line."""
    buffer = ""
    for raw in text.splitlines():
        line = raw.split(";", 1)[0].rstrip()  # note: ';' inside TXT quotes not supported (simplified)
        if not line.strip():
            continue
        buffer = f"{buffer} {line.strip()}" if buffer else line
        if buffer.count("(") > buffer.count(")"):
            continue
        yield buffer.replace("(", " ").replace(")", " ")
        buffer = ""


def parse_bind(text: str, zone_name: str) -> list[tuple[str, str, int, str]]:
    """Return a list of (name, type, ttl, value) rows."""
    origin, default_ttl, last_name = zone_name, 300, "@"
    rows = []
    for line in _logical_lines(text):
        if line.startswith("$ORIGIN"):
            origin = line.split()[1]
            continue
        if line.startswith("$TTL"):
            default_ttl = int(line.split()[1])
            continue
        tokens = line.split()
        name = last_name if line[0].isspace() else tokens.pop(0)  # blank name = same as previous
        last_name = name
        ttl = default_ttl
        while tokens and (tokens[0].isdigit() or tokens[0].upper() == "IN"):
            tok = tokens.pop(0)
            if tok.isdigit():
                ttl = int(tok)
        if len(tokens) < 2:
            raise AppError(f"Could not parse line: {line.strip()}")
        rtype, value = tokens[0].upper(), " ".join(tokens[1:])
        if name == "@":
            name = origin
        elif not name.endswith("."):
            name = f"{name}.{origin}"
        rows.append((name, rtype, ttl, value))
    return rows


def import_zone_file(db: Session, user: User, zone_id: str, text: str) -> tuple[int, list[str]]:
    zone = get_zone(db, user, zone_id)
    grouped: dict[tuple[str, str], dict] = {}
    for name, rtype, ttl, value in parse_bind(text, zone.name):
        grouped.setdefault((name.lower(), rtype), {"ttl": ttl, "values": []})["values"].append(value)

    created, skipped = 0, []
    for (name, rtype), data in grouped.items():
        label = f"{name} {rtype}"
        if rtype not in SUPPORTED or rtype == "SOA" or (rtype == "NS" and name == zone.name):
            skipped.append(f"{label}: default or unsupported record, skipped")
            continue
        try:
            record_service.create_record(
                db, user, zone.id, RecordCreate(name=name, type=rtype, ttl=data["ttl"], values=data["values"])
            )
            created += 1
        except AppError as e:
            db.rollback()
            skipped.append(f"{label}: {e.message}")
    return created, skipped
