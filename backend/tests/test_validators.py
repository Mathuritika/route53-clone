"""Unit tests for the pure validation functions (no database, no HTTP)."""
import pytest

from app.core.errors import AppError
from app.services.validators import build_fqdn, normalize_domain, validate_value, validate_values


def test_normalize_domain_lowercases_and_adds_dot():
    assert normalize_domain("Example.COM") == "example.com."


def test_build_fqdn():
    assert build_fqdn("www", "example.com.") == "www.example.com."
    assert build_fqdn("", "example.com.") == "example.com."        # blank = zone apex
    assert build_fqdn("www.example.com", "example.com.") == "www.example.com."


@pytest.mark.parametrize("rtype,value", [
    ("A", "192.0.2.1"),
    ("AAAA", "2001:db8::1"),
    ("CNAME", "target.example.com"),
    ("MX", "10 mail.example.com"),
    ("SRV", "1 10 5269 xmpp.example.com"),
    ("CAA", '0 issue "amazon.com"'),
    ("PTR", "host.example.com"),
])
def test_valid_values(rtype, value):
    assert validate_value(rtype, value)


@pytest.mark.parametrize("rtype,value", [
    ("A", "1.2.3.999"),
    ("AAAA", "not-an-ip"),
    ("MX", "mail.example.com"),          # missing priority
    ("SRV", "1 10 xmpp.example.com"),    # missing port
    ("CAA", '0 badtag "amazon.com"'),
])
def test_invalid_values(rtype, value):
    with pytest.raises(AppError):
        validate_value(rtype, value)


def test_txt_is_auto_quoted():
    assert validate_value("TXT", "hello world") == '"hello world"'


def test_cname_allows_only_one_value():
    with pytest.raises(AppError):
        validate_values("CNAME", ["a.example.com", "b.example.com"])
