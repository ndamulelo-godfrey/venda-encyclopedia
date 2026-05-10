"""Evenda backend API tests"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://venda-encyclopedia.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@evenda.org"
ADMIN_PASSWORD = "Admin@Evenda123"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


# ---------------- Categories ----------------
class TestCategories:
    def test_categories_returns_9(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert "categories" in data
        assert len(data["categories"]) == 9
        for c in ["words","proverbs","idioms","plants","animals","places","people","customs","folklore"]:
            assert c in data["categories"]


# ---------------- Entries ----------------
class TestEntries:
    def test_list_entries_seed(self, session):
        r = session.get(f"{API}/entries")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 15
        sample = data[0]
        for k in ["id","term","translation","category","meaning","created_at"]:
            assert k in sample
        # _id excluded
        assert "_id" not in sample

    def test_search_q_filter(self, session):
        r = session.get(f"{API}/entries", params={"q": "baobab"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        # result must contain "baobab" somewhere
        assert any("baobab" in (e.get("term","") + e.get("translation","") + e.get("meaning","")).lower() for e in data)

    def test_category_filter(self, session):
        r = session.get(f"{API}/entries", params={"category": "plants"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        assert all(e["category"] == "plants" for e in data)

    def test_invalid_category(self, session):
        r = session.get(f"{API}/entries", params={"category": "bogus"})
        assert r.status_code == 400

    def test_sort_alpha(self, session):
        r = session.get(f"{API}/entries", params={"sort": "alpha"})
        assert r.status_code == 200
        terms = [e["term"].lower() for e in r.json()]
        assert terms == sorted(terms)

    def test_sort_newest(self, session):
        r = session.get(f"{API}/entries", params={"sort": "newest"})
        assert r.status_code == 200
        dates = [e["created_at"] for e in r.json()]
        assert dates == sorted(dates, reverse=True)

    def test_sort_category(self, session):
        r = session.get(f"{API}/entries", params={"sort": "category"})
        assert r.status_code == 200
        cats = [e["category"] for e in r.json()]
        assert cats == sorted(cats)

    def test_get_single_entry(self, session):
        r = session.get(f"{API}/entries")
        eid = r.json()[0]["id"]
        r2 = session.get(f"{API}/entries/{eid}")
        assert r2.status_code == 200
        assert r2.json()["id"] == eid

    def test_get_missing_entry_404(self, session):
        r = session.get(f"{API}/entries/{uuid.uuid4()}")
        assert r.status_code == 404


# ---------------- Auth ----------------
class TestAuth:
    def test_register_and_duplicate(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        email = f"test_user_{uuid.uuid4().hex[:8]}@evenda.org"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass@12345", "name": "Test User"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email
        assert data["name"] == "Test User"
        assert "id" in data
        # cookie set
        assert "access_token" in s.cookies.get_dict()
        # me works
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 200
        assert r2.json()["email"] == email
        # duplicate
        r3 = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass@12345", "name": "Test User"})
        assert r3.status_code == 409

    def test_admin_login_and_me(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert "access_token" in s.cookies.get_dict()
        body = r.json()
        assert body["email"] == ADMIN_EMAIL
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 200
        assert r2.json()["email"] == ADMIN_EMAIL

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "WRONG"})
        assert r.status_code == 401

    def test_me_unauth(self):
        s = requests.Session()
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout_clears_cookie(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert "access_token" in s.cookies.get_dict()
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # subsequent /me should be 401
        s2 = requests.Session()
        r2 = s2.get(f"{API}/auth/me")
        assert r2.status_code == 401


# ---------------- Entry creation (auth) ----------------
class TestEntryCreate:
    def test_create_entry_requires_auth(self, session):
        r = session.post(f"{API}/entries", json={
            "term": "test", "translation": "test", "category": "words", "meaning": "test"
        })
        assert r.status_code == 401

    def test_create_entry_authenticated(self, admin_session):
        payload = {
            "term": f"TEST_term_{uuid.uuid4().hex[:6]}",
            "translation": "test translation",
            "pronunciation": "test-pro",
            "category": "words",
            "meaning": "Test meaning",
            "example": "An example",
            "region": "Vhembe",
        }
        r = admin_session.post(f"{API}/entries", json=payload)
        assert r.status_code == 201, r.text
        created = r.json()
        assert created["term"] == payload["term"]
        assert created["category"] == "words"
        assert "id" in created
        # GET to verify persistence
        r2 = admin_session.get(f"{API}/entries/{created['id']}")
        assert r2.status_code == 200
        assert r2.json()["term"] == payload["term"]

    def test_create_entry_invalid_category(self, admin_session):
        r = admin_session.post(f"{API}/entries", json={
            "term": "x", "translation": "x", "category": "bogus", "meaning": "x"
        })
        assert r.status_code in (400, 422)
