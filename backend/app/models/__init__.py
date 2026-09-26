# Import every model so Base.metadata knows all tables before create_all()
from app.models.user import User, Session  # noqa: F401
from app.models.hosted_zone import HostedZone  # noqa: F401
from app.models.record import DnsRecord  # noqa: F401
