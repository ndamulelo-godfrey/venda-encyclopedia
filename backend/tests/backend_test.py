"""Evenda backend API tests"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
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


@pytest.fixture(scope="session")
def contributor_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"contrib_{uuid.uuid4().hex[:8]}@evenda.org"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass@12345", "name": "Contrib"})
    assert r.status_code == 200, r.text
    return s


# ---------------- Categories ----------------
class TestCategories:
    def test_categories_returns_9(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert len(data["categories"]) == 9


# ---------------- Entries ----------------
class TestEntries:
    def test_list_entries_seed(self, session):
        r = session.get(f"{API}/entries")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 15
        assert "_id" not in data[0]

    def test_search_q_filter(self, session):
        r = session.get(f"{API}/entries", params={"q": "baobab"})
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_category_filter(self, session):
        r = session.get(f"{API}/entries", params={"category": "plants"})
        assert r.status_code == 200
        assert all(e["category"] == "plants" for e in r.json())

    def test_invalid_category(self, session):
        r = session.get(f"{API}/entries", params={"category": "bogus"})
        assert r.status_code == 400

    def test_sort_alpha(self, session):
        r = session.get(f"{API}/entries", params={"sort": "alpha"})
        terms = [e["term"].lower() for e in r.json()]
        assert terms == sorted(terms)

    def test_get_single_entry(self, session):
        eid = session.get(f"{API}/entries").json()[0]["id"]
        r2 = session.get(f"{API}/entries/{eid}")
        assert r2.status_code == 200 and r2.json()["id"] == eid

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
        assert "access_token" in s.cookies.get_dict()
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 200 and r2.json()["email"] == email
        r3 = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass@12345", "name": "X"})
        assert r3.status_code == 409

    def test_admin_login_and_me(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL
        assert r.json()["role"] == "admin"

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "WRONG"})
        assert r.status_code == 401

    def test_me_unauth(self):
        r = requests.Session().get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------------- Entry creation ----------------
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
            "category": "words",
            "meaning": "Test meaning",
        }
        r = admin_session.post(f"{API}/entries", json=payload)
        assert r.status_code == 201, r.text
        eid = r.json()["id"]
        # cleanup
        admin_session.delete(f"{API}/entries/{eid}")


# ---------------- Admin image management (regression) ----------------
def _png_bytes():
    return bytes.fromhex(
        "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
        "0000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
    )


class TestAdminImage:
    def test_upload_unauth_401(self):
        r = requests.Session().post(f"{API}/admin/upload-image",
                                    files={"file": ("a.png", _png_bytes(), "image/png")})
        assert r.status_code == 401

    def test_upload_non_admin_403(self, contributor_session):
        s = requests.Session()
        s.cookies.update(contributor_session.cookies)
        r = s.post(f"{API}/admin/upload-image", files={"file": ("a.png", _png_bytes(), "image/png")})
        assert r.status_code == 403

    def test_admin_upload_png_and_get_file(self, admin_session):
        s = requests.Session()
        s.cookies.update(admin_session.cookies)
        r = s.post(f"{API}/admin/upload-image", files={"file": ("a.png", _png_bytes(), "image/png")})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and "path" in data
        r2 = requests.get(f"{API}/files/{data['path']}")
        assert r2.status_code == 200
        assert r2.headers.get("Content-Type", "").startswith("image/")

    def test_patch_image_admin_success(self, session, admin_session):
        eid = session.get(f"{API}/entries").json()[0]["id"]
        url = "https://images.unsplash.com/photo-test.jpg"
        r = admin_session.patch(f"{API}/entries/{eid}/image", json={"image_url": url})
        assert r.status_code == 200
        assert r.json()["image_url"] == url

    def test_delete_image_admin_clears(self, session, admin_session):
        eid = session.get(f"{API}/entries").json()[0]["id"]
        admin_session.patch(f"{API}/entries/{eid}/image", json={"image_url": "https://x.com/a.png"})
        r = admin_session.delete(f"{API}/entries/{eid}/image")
        assert r.status_code == 200
        assert r.json()["image_url"] == ""


# ============================================================================
# NEW (Iteration 3) — Admin moderation PATCH/DELETE + audio upload
# ============================================================================

def _wav_bytes(seconds: int = 0, sample_rate: int = 8000) -> bytes:
    """Generate a minimal valid WAV file (RIFF header)."""
    n_samples = seconds * sample_rate
    data_size = n_samples * 2  # 16-bit mono
    chunk_size = 36 + data_size
    header = (
        b"RIFF" + chunk_size.to_bytes(4, "little") +
        b"WAVE" +
        b"fmt " + (16).to_bytes(4, "little") +
        (1).to_bytes(2, "little") +          # PCM
        (1).to_bytes(2, "little") +          # mono
        sample_rate.to_bytes(4, "little") +
        (sample_rate * 2).to_bytes(4, "little") +
        (2).to_bytes(2, "little") +
        (16).to_bytes(2, "little") +
        b"data" + data_size.to_bytes(4, "little")
    )
    return header + (b"\x00" * data_size)


# ---------- PATCH /api/entries/{id} ----------
class TestEntryPatch:
    def _new_entry(self, admin_session, **over):
        payload = {
            "term": f"TEST_patch_{uuid.uuid4().hex[:6]}",
            "translation": "orig translation",
            "category": "words",
            "meaning": "Original meaning",
            "pronunciation": "p",
            "example": "ex",
            "region": "Vhembe",
        }
        payload.update(over)
        r = admin_session.post(f"{API}/entries", json=payload)
        assert r.status_code == 201, r.text
        return r.json()

    def test_patch_unauth_401(self, session):
        e = {"id": "deadbeef"}  # any id, auth check is first
        r = session.patch(f"{API}/entries/{e['id']}",
                          json={"term": "x", "translation": "y", "category": "words", "meaning": "m"})
        assert r.status_code == 401

    def test_patch_non_admin_403(self, contributor_session, admin_session):
        e = self._new_entry(admin_session)
        r = contributor_session.patch(f"{API}/entries/{e['id']}",
                                      json={"term": "x", "translation": "y",
                                            "category": "words", "meaning": "m"})
        assert r.status_code == 403
        admin_session.delete(f"{API}/entries/{e['id']}")

    def test_patch_admin_updates_fields(self, admin_session):
        e = self._new_entry(admin_session)
        new_payload = {
            "term": e["term"],
            "translation": "UPDATED translation",
            "pronunciation": "new-pro",
            "category": "proverbs",
            "meaning": "Updated meaning",
            "example": "new example",
            "region": "Sibasa",
            "audio_url": "/api/files/evenda/audio/x.webm",
            "image_url": "",
        }
        r = admin_session.patch(f"{API}/entries/{e['id']}", json=new_payload)
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["translation"] == "UPDATED translation"
        assert updated["category"] == "proverbs"
        assert updated["meaning"] == "Updated meaning"
        assert updated["audio_url"].endswith(".webm")
        # verify persistence
        r2 = admin_session.get(f"{API}/entries/{e['id']}")
        assert r2.json()["translation"] == "UPDATED translation"
        admin_session.delete(f"{API}/entries/{e['id']}")

    def test_patch_invalid_category_400(self, admin_session):
        e = self._new_entry(admin_session)
        r = admin_session.patch(f"{API}/entries/{e['id']}",
                                json={"term": "x", "translation": "y",
                                      "category": "bogus", "meaning": "m"})
        # Pydantic-level or app-level validation may return 400 or 422
        assert r.status_code in (400, 422)
        admin_session.delete(f"{API}/entries/{e['id']}")

    def test_patch_unknown_404(self, admin_session):
        r = admin_session.patch(f"{API}/entries/{uuid.uuid4()}",
                                json={"term": "x", "translation": "y",
                                      "category": "words", "meaning": "m"})
        assert r.status_code == 404


# ---------- DELETE /api/entries/{id} ----------
class TestEntryDelete:
    def test_delete_unauth_401(self, session, admin_session):
        # create something then check unauth delete
        r = admin_session.post(f"{API}/entries", json={
            "term": f"TEST_del_{uuid.uuid4().hex[:6]}",
            "translation": "t", "category": "words", "meaning": "m"
        })
        eid = r.json()["id"]
        u = requests.Session()
        rd = u.delete(f"{API}/entries/{eid}")
        assert rd.status_code == 401
        admin_session.delete(f"{API}/entries/{eid}")  # cleanup

    def test_delete_non_admin_403(self, contributor_session, admin_session):
        r = admin_session.post(f"{API}/entries", json={
            "term": f"TEST_del_{uuid.uuid4().hex[:6]}",
            "translation": "t", "category": "words", "meaning": "m"
        })
        eid = r.json()["id"]
        rd = contributor_session.delete(f"{API}/entries/{eid}")
        assert rd.status_code == 403
        admin_session.delete(f"{API}/entries/{eid}")  # cleanup

    def test_delete_admin_removes(self, admin_session):
        r = admin_session.post(f"{API}/entries", json={
            "term": f"TEST_del_{uuid.uuid4().hex[:6]}",
            "translation": "t", "category": "words", "meaning": "m"
        })
        eid = r.json()["id"]
        rd = admin_session.delete(f"{API}/entries/{eid}")
        assert rd.status_code == 200
        body = rd.json()
        assert body.get("ok") is True
        # verify removed
        r2 = admin_session.get(f"{API}/entries/{eid}")
        assert r2.status_code == 404

    def test_delete_unknown_404(self, admin_session):
        r = admin_session.delete(f"{API}/entries/{uuid.uuid4()}")
        assert r.status_code == 404


# ---------- POST /api/upload-audio ----------
class TestAudioUpload:
    def test_upload_audio_unauth_401(self):
        r = requests.Session().post(f"{API}/upload-audio",
                                    files={"file": ("a.wav", _wav_bytes(1), "audio/wav")})
        assert r.status_code == 401

    def test_upload_audio_bad_type_400(self, contributor_session):
        s = requests.Session()
        s.cookies.update(contributor_session.cookies)
        r = s.post(f"{API}/upload-audio",
                   files={"file": ("a.txt", b"hello world", "text/plain")})
        assert r.status_code == 400

    def test_upload_audio_empty_400(self, contributor_session):
        s = requests.Session()
        s.cookies.update(contributor_session.cookies)
        r = s.post(f"{API}/upload-audio",
                   files={"file": ("a.wav", b"", "audio/wav")})
        assert r.status_code == 400

    def test_upload_audio_too_large_413(self, contributor_session):
        s = requests.Session()
        s.cookies.update(contributor_session.cookies)
        big = b"\x00" * (10 * 1024 * 1024 + 100)  # >10 MB
        r = s.post(f"{API}/upload-audio",
                   files={"file": ("big.wav", big, "audio/wav")})
        assert r.status_code == 413

    def test_upload_audio_wav_success(self, contributor_session):
        s = requests.Session()
        s.cookies.update(contributor_session.cookies)
        wav = _wav_bytes(1)
        r = s.post(f"{API}/upload-audio",
                   files={"file": ("hello.wav", wav, "audio/wav")})
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("url", "path", "size", "content_type"):
            assert k in data
        assert data["content_type"] == "audio/wav"
        assert data["size"] == len(wav)
        assert data["path"].endswith(".wav")
        # ensure file is fetchable through the public proxy
        r2 = requests.get(f"{API}/files/{data['path']}")
        assert r2.status_code == 200
        assert r2.headers.get("Content-Type", "").startswith("audio/")
