"""Pure validation helpers for domain names and record values (no DB access)."""
import ipaddress
import re

from app.core.errors import AppError

# One DNS label: letters, digits, hyphen, underscore (for _dmarc, _sip._tcp), max 63 chars
LABEL_RE = re.compile(r"^(\*|[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?)$")


def normalize_domain(name: str) -> str:
    """'Example.COM' -> 'example.com.'  (Route53 always shows a trailing dot)."""
    name = name.strip().lower().rstrip(".")
    if not name:
        raise AppError("Domain name is required")
    if len(name) > 253:
        raise AppError("Domain name must be 253 characters or fewer")
    for i, label in enumerate(name.split(".")):
        if label == "*" and i != 0:
            raise AppError("Wildcard '*' is only allowed as the leftmost label")
        if not LABEL_RE.match(label):
            raise AppError(f"Invalid domain name label: '{label}'")
    return name + "."


def build_fqdn(record_name: str, zone_name: str) -> str:
    """Record name box 'www' + zone 'example.com.' -> 'www.example.com.'.
    Also accepts an already-qualified name that ends in the zone."""
    record_name = record_name.strip().lower().rstrip(".")
    zone_bare = zone_name.rstrip(".")
    if record_name in ("", "@"):
        return zone_name
    if record_name == zone_bare or record_name.endswith("." + zone_bare):
        return normalize_domain(record_name)
    return normalize_domain(f"{record_name}.{zone_bare}")


def _check_domain(value: str, what: str) -> None:
    try:
        normalize_domain(value)
    except AppError:
        raise AppError(f"{what} '{value}' is not a valid domain name")


def _check_int(value: str, what: str, lo: int, hi: int) -> None:
    if not value.isdigit() or not lo <= int(value) <= hi:
        raise AppError(f"{what} must be a number between {lo} and {hi}")


def validate_value(record_type: str, value: str) -> str:
    """Validate one value for a record type and return the cleaned value."""
    value = value.strip()
    if not value:
        raise AppError("Record value cannot be empty")

    if record_type == "A":
        try:
            ipaddress.IPv4Address(value)
        except ValueError:
            raise AppError(f"'{value}' is not a valid IPv4 address")
    elif record_type == "AAAA":
        try:
            ipaddress.IPv6Address(value)
        except ValueError:
            raise AppError(f"'{value}' is not a valid IPv6 address")
    elif record_type in ("CNAME", "NS", "PTR"):
        _check_domain(value, "Target")
    elif record_type == "MX":  # "10 mail.example.com"
        parts = value.split()
        if len(parts) != 2:
            raise AppError("MX value format: [priority] [mail server], e.g. 10 mail.example.com")
        _check_int(parts[0], "MX priority", 0, 65535)
        _check_domain(parts[1], "Mail server")
    elif record_type == "SRV":  # "1 10 5269 xmpp.example.com"
        parts = value.split()
        if len(parts) != 4:
            raise AppError("SRV value format: [priority] [weight] [port] [target]")
        _check_int(parts[0], "Priority", 0, 65535)
        _check_int(parts[1], "Weight", 0, 65535)
        _check_int(parts[2], "Port", 0, 65535)
        _check_domain(parts[3], "Target")
    elif record_type == "TXT":
        if not (value.startswith('"') and value.endswith('"')):
            value = f'"{value}"'  # Route53 stores TXT in quotes; add them for the user
        if len(value) > 257:
            raise AppError("Each TXT string must be 255 characters or fewer")
    elif record_type == "CAA":  # '0 issue "amazon.com"'
        parts = value.split(maxsplit=2)
        if len(parts) != 3:
            raise AppError('CAA value format: [flags] [tag] "[value]", e.g. 0 issue "amazon.com"')
        _check_int(parts[0], "CAA flags", 0, 255)
        if parts[1] not in ("issue", "issuewild", "iodef"):
            raise AppError("CAA tag must be issue, issuewild or iodef")
        if not (parts[2].startswith('"') and parts[2].endswith('"')):
            parts[2] = f'"{parts[2]}"'
        value = " ".join(parts)
    elif record_type == "SOA":
        if len(value.split()) != 7:
            raise AppError("SOA value must have 7 fields")
    else:
        raise AppError(f"Unsupported record type {record_type}")
    return value


def validate_values(record_type: str, values: list[str]) -> list[str]:
    cleaned = [validate_value(record_type, v) for v in values if v.strip()]
    if not cleaned:
        raise AppError("Enter at least one value")
    if record_type == "CNAME" and len(cleaned) > 1:
        raise AppError("A CNAME record can have only one value")
    if len(set(cleaned)) != len(cleaned):
        raise AppError("Duplicate values are not allowed")
    return cleaned
