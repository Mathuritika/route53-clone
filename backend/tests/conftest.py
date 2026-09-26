"""Shared test setup: every test gets a brand-new SQLite file with the demo seed."""
import os
import tempfile

# Must be set BEFORE the app is imported, because database.py reads it at import time
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    Base.metadata.drop_all(bind=engine)  # clean slate; startup recreates tables and seeds
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth(client):
    """Headers for the seeded demo user."""
    token = client.post("/api/auth/login", json={"username": "demo", "password": "demo1234"}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def zone(client, auth):
    """A fresh empty zone to work in."""
    return client.post("/api/hosted-zones", headers=auth, json={"name": "test-zone.com"}).json()
