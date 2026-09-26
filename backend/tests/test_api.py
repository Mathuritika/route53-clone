"""API tests: call the real endpoints and check status codes and business rules."""


# ---------- auth ----------
def test_login_wrong_password(client):
    assert client.post("/api/auth/login", json={"username": "demo", "password": "nope"}).status_code == 401


def test_requires_token(client):
    assert client.get("/api/hosted-zones").status_code == 401


def test_logout_invalidates_token(client, auth):
    client.post("/api/auth/logout", headers=auth)
    assert client.get("/api/auth/me", headers=auth).status_code == 401


# ---------- hosted zones ----------
def test_new_zone_gets_default_ns_and_soa(client, auth, zone):
    records = client.get(f"/api/hosted-zones/{zone['id']}/records", headers=auth).json()["items"]
    assert sorted(r["type"] for r in records) == ["NS", "SOA"]
    assert len(zone["name_servers"]) == 4


def test_duplicate_zone_is_409(client, auth, zone):
    assert client.post("/api/hosted-zones", headers=auth, json={"name": "test-zone.com"}).status_code == 409


def test_search_and_pagination(client, auth):
    page = client.get("/api/hosted-zones?search=myapp&page_size=1", headers=auth).json()
    assert page["total"] == 2 and len(page["items"]) == 1


def test_cannot_delete_zone_with_records(client, auth, zone):
    client.post(f"/api/hosted-zones/{zone['id']}/records", headers=auth,
                json={"name": "www", "type": "A", "values": ["192.0.2.1"]})
    assert client.delete(f"/api/hosted-zones/{zone['id']}", headers=auth).status_code == 409


def test_other_user_cannot_see_zone(client, auth, zone):
    token = client.post("/api/auth/login", json={"username": "admin", "password": "admin1234"}).json()["token"]
    res = client.get(f"/api/hosted-zones/{zone['id']}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 404


# ---------- records ----------
def test_record_crud(client, auth, zone):
    base = f"/api/hosted-zones/{zone['id']}/records"
    created = client.post(base, headers=auth, json={"name": "api", "type": "A", "ttl": 60, "values": ["192.0.2.5"]})
    assert created.status_code == 201
    rid = created.json()["id"]
    assert created.json()["name"] == "api.test-zone.com."

    updated = client.put(f"{base}/{rid}", headers=auth, json={"ttl": 120, "values": ["192.0.2.6", "192.0.2.7"]})
    assert updated.json()["values"] == ["192.0.2.6", "192.0.2.7"]

    assert client.delete(f"{base}/{rid}", headers=auth).status_code == 204
    assert client.get(f"{base}/{rid}", headers=auth).status_code == 404


def test_duplicate_record_is_409(client, auth, zone):
    base = f"/api/hosted-zones/{zone['id']}/records"
    body = {"name": "www", "type": "A", "values": ["192.0.2.1"]}
    client.post(base, headers=auth, json=body)
    assert client.post(base, headers=auth, json=body).status_code == 409


def test_cname_rules(client, auth, zone):
    base = f"/api/hosted-zones/{zone['id']}/records"
    # no CNAME at the apex
    assert client.post(base, headers=auth, json={"name": "", "type": "CNAME", "values": ["x.com"]}).status_code == 400
    # CNAME can't share its name with another type
    client.post(base, headers=auth, json={"name": "www", "type": "CNAME", "values": ["x.com"]})
    assert client.post(base, headers=auth, json={"name": "www", "type": "A", "values": ["192.0.2.1"]}).status_code == 409


def test_default_records_cannot_be_deleted(client, auth, zone):
    base = f"/api/hosted-zones/{zone['id']}/records"
    ns = next(r for r in client.get(base, headers=auth).json()["items"] if r["type"] == "NS")
    assert client.delete(f"{base}/{ns['id']}", headers=auth).status_code == 400


def test_bulk_delete(client, auth, zone):
    base = f"/api/hosted-zones/{zone['id']}/records"
    ids = [client.post(base, headers=auth, json={"name": n, "type": "A", "values": ["192.0.2.1"]}).json()["id"]
           for n in ("a", "b", "c")]
    assert client.post(f"{base}/bulk-delete", headers=auth, json={"ids": ids}).json() == {"deleted": 3}


# ---------- import / export / dashboard ----------
def test_import_and_export(client, auth, zone):
    zone_file = "$TTL 600\nwww IN A 192.0.2.1\nmail IN MX 10 mx.test-zone.com.\nbad IN A nope\n"
    res = client.post(f"/api/hosted-zones/{zone['id']}/import", headers=auth, json={"zone_file": zone_file}).json()
    assert res["created"] == 2 and len(res["skipped"]) == 1

    bind = client.get(f"/api/hosted-zones/{zone['id']}/export?format=bind", headers=auth).text
    assert "www" in bind and "192.0.2.1" in bind


def test_dashboard(client, auth):
    data = client.get("/api/dashboard", headers=auth).json()
    assert data["total_zones"] == 6
    assert data["public_zones"] + data["private_zones"] == data["total_zones"]
    assert sum(t["count"] for t in data["records_by_type"]) == data["total_records"]
