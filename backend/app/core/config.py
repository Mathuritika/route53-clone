"""App settings, read from environment variables with sensible defaults."""
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./route53.db")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")]
SESSION_HOURS = int(os.getenv("SESSION_HOURS", "24"))
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100
DEFAULT_TTL = 300
