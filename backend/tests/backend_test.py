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


# ---------------- Admin image management ----------------
def _png_bytes():
    # 1x1 transparent PNG
    return bytes.fromhex(
        "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
        "0000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
    )


@pytest.fixture(scope="session")
def contributor_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"contrib_{uuid.uuid4().hex[:8]}@evenda.org"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass@12345", "name": "Contrib"})
    assert r.status_code == 200, r.text
    return s


class TestAdminImage:
    def test_upload_unauth_401(self):
        s = requests.Session()
        r = s.post(f"{API}/admin/upload-image", files={"file": ("a.png", _png_bytes(), "image/png")})
        assert r.status_code == 401

    def test_upload_non_admin_403(self, contributor_session):
        # use multipart so don't override content-type
        s = requests.Session()
        s.cookies.update(contributor_session.cookies)
        r = s.post(f"{API}/admin/upload-image", files={"file": ("a.png", _png_bytes(), "image/png")})
        assert r.status_code == 403

    def test_upload_bad_content_type_400(self, admin_session):
        s = requests.Session()
        s.cookies.update(admin_session.cookies)
        r = s.post(f"{API}/admin/upload-image", files={"file": ("a.txt", b"hello", "text/plain")})
        assert r.status_code == 400

    def test_admin_upload_png_success(self, admin_session):
        s = requests.Session()
        s.cookies.update(admin_session.cookies)
        r = s.post(f"{API}/admin/upload-image", files={"file": ("a.png", _png_bytes(), "image/png")})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and "path" in data
        assert data["content_type"] == "image/png"
        assert data["size"] > 0
        # GET /api/files/{path}
        path = data["path"]
        r2 = requests.get(f"{API}/files/{path}")
        assert r2.status_code == 200
        assert r2.headers.get("Content-Type", "").startswith("image/")
        assert len(r2.content) > 0
        # unknown path → 404
        r3 = requests.get(f"{API}/files/evenda/entry-images/{uuid.uuid4()}.png")
        assert r3.status_code == 404

    def _get_entry_id(self, session):
        r = session.get(f"{API}/entries")
        return r.json()[0]["id"]

    def test_patch_image_unauth_401(self, session):
        eid = self._get_entry_id(session)
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.patch(f"{API}/entries/{eid}/image", json={"image_url": "https://x.com/a.png"})
        assert r.status_code == 401

    def test_patch_image_non_admin_403(self, session, contributor_session):
        eid = self._get_entry_id(session)
        r = contributor_session.patch(f"{API}/entries/{eid}/image", json={"image_url": "https://x.com/a.png"})
        assert r.status_code == 403

    def test_patch_image_admin_success(self, session, admin_session):
        eid = self._get_entry_id(session)
        url = "https://images.unsplash.com/photo-test.jpg"
        r = admin_session.patch(f"{API}/entries/{eid}/image", json={"image_url": url})
        assert r.status_code == 200, r.text
        assert r.json()["image_url"] == url
        # GET verifies persistence
        r2 = session.get(f"{API}/entries/{eid}")
        assert r2.json()["image_url"] == url

    def test_patch_empty_image_url_400(self, session, admin_session):
        eid = self._get_entry_id(session)
        r = admin_session.patch(f"{API}/entries/{eid}/image", json={"image_url": ""})
        # min_length=1 → 422 from pydantic
        assert r.status_code in (400, 422)

    def test_patch_unknown_entry_404(self, admin_session):
        r = admin_session.patch(f"{API}/entries/{uuid.uuid4()}/image", json={"image_url": "https://x.com/a.png"})
        assert r.status_code == 404

    def test_delete_image_unauth_401(self, session):
        eid = self._get_entry_id(session)
        s = requests.Session()
        r = s.delete(f"{API}/entries/{eid}/image")
        assert r.status_code == 401

    def test_delete_image_non_admin_403(self, session, contributor_session):
        eid = self._get_entry_id(session)
        r = contributor_session.delete(f"{API}/entries/{eid}/image")
        assert r.status_code == 403

    def test_delete_image_admin_clears(self, session, admin_session):
        eid = self._get_entry_id(session)
        # set then clear
        admin_session.patch(f"{API}/entries/{eid}/image", json={"image_url": "https://x.com/a.png"})
        r = admin_session.delete(f"{API}/entries/{eid}/image")
        assert r.status_code == 200
        assert r.json()["image_url"] == ""
        r2 = session.get(f"{API}/entries/{eid}")
        assert r2.json()["image_url"] == ""

    def test_contributor_post_strips_image_url(self, contributor_session):
        payload = {
            "term": f"TEST_strip_{uuid.uuid4().hex[:6]}",
            "translation": "stripped",
            "category": "words",
            "meaning": "Should strip image",
            "image_url": "https://evil.com/should-be-stripped.png",
        }
        r = contributor_session.post(f"{API}/entries", json=payload)
        assert r.status_code == 201, r.text
        assert r.json()["image_url"] == ""

    def test_admin_post_keeps_image_url(self, admin_session):
        payload = {
            "term": f"TEST_admin_img_{uuid.uuid4().hex[:6]}",
            "translation": "kept",
            "category": "words",
            "meaning": "Should keep image",
            "image_url": "https://images.unsplash.com/admin.jpg",
        }
        r = admin_session.post(f"{API}/entries", json=payload)
        assert r.status_code == 201
        assert r.json()["image_url"] == "https://images.unsplash.com/admin.jpg"
