from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, HttpUrl

from seed_data import SEED_ENTRIES

# --------------------------------------------------------------------------------------
# Setup
# --------------------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("evenda")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7  # 7 days for friendlier UX
ALLOWED_CATEGORIES = [
    "words", "proverbs", "idioms", "plants", "animals",
    "places", "people", "customs", "folklore",
]
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_AUDIO_TYPES = {
    "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp3",
    "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a",
}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_STORAGE_NAME = os.environ.get("APP_STORAGE_NAME", "evenda")
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    if not emergent_key:
        logger.warning("EMERGENT_LLM_KEY missing; uploads disabled.")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": emergent_key}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized.")
        return _storage_key
    except Exception as e:
        logger.error("Storage init failed: %s", e)
        return None


def storage_put(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage unavailable")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 403:
        # token expired — re-init once
        global _storage_key
        _storage_key = None
        key = init_storage()
        if not key:
            raise HTTPException(status_code=503, detail="Storage unavailable")
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def storage_get(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage unavailable")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        key = init_storage()
        if not key:
            raise HTTPException(status_code=503, detail="Storage unavailable")
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Evenda — Tshivenda Heritage Encyclopedia")
api_router = APIRouter(prefix="/api")


# --------------------------------------------------------------------------------------
# Utilities
# --------------------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TOKEN_MINUTES * 60,
        path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# --------------------------------------------------------------------------------------
# Models
# --------------------------------------------------------------------------------------
class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str = "contributor"
    created_at: datetime


class RegisterPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=80)


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class EntryCreate(BaseModel):
    term: str = Field(min_length=1, max_length=120)
    translation: str = Field(min_length=1, max_length=300)
    pronunciation: Optional[str] = ""
    category: str
    meaning: str = Field(min_length=1, max_length=4000)
    meaning_vh: Optional[str] = ""
    example: Optional[str] = ""
    example_vh: Optional[str] = ""
    region: Optional[str] = ""
    image_url: Optional[str] = ""
    audio_url: Optional[str] = ""


class Entry(BaseModel):
    id: str
    term: str
    translation: str
    pronunciation: str = ""
    category: str
    meaning: str
    meaning_vh: str = ""
    example: str = ""
    example_vh: str = ""
    region: str = ""
    image_url: str = ""
    audio_url: str = ""
    contributor_name: str = "Evenda"
    created_at: datetime


# --------------------------------------------------------------------------------------
# Auth routes
# --------------------------------------------------------------------------------------
@api_router.post("/auth/register", response_model=UserPublic)
async def register(payload: RegisterPayload, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with that email already exists")
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "role": "contributor",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_doc["id"], email)
    set_auth_cookie(response, token)
    return UserPublic(
        id=user_doc["id"], email=user_doc["email"], name=user_doc["name"],
        role=user_doc["role"], created_at=datetime.fromisoformat(user_doc["created_at"]),
    )


@api_router.post("/auth/login", response_model=UserPublic)
async def login(payload: LoginPayload, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return UserPublic(
        id=user["id"], email=user["email"], name=user["name"],
        role=user.get("role", "contributor"),
        created_at=datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"],
    )


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    created = user["created_at"]
    if isinstance(created, str):
        created = datetime.fromisoformat(created)
    return UserPublic(id=user["id"], email=user["email"], name=user["name"],
                      role=user.get("role", "contributor"), created_at=created)


# --------------------------------------------------------------------------------------
# Entries routes
# --------------------------------------------------------------------------------------
@api_router.get("/categories")
async def categories():
    return {"categories": ALLOWED_CATEGORIES}


@api_router.get("/entries", response_model=List[Entry])
async def list_entries(
    q: Optional[str] = None,
    category: Optional[str] = None,
    sort: Optional[str] = "alpha",  # alpha | newest | category
    limit: int = 200,
):
    query: dict = {}
    if category and category != "all":
        if category not in ALLOWED_CATEGORIES:
            raise HTTPException(status_code=400, detail="Unknown category")
        query["category"] = category
    if q:
        # case-insensitive search across multiple fields
        regex = {"$regex": q.strip(), "$options": "i"}
        query["$or"] = [
            {"term": regex},
            {"translation": regex},
            {"meaning": regex},
            {"example": regex},
            {"region": regex},
        ]

    sort_spec = [("term", 1)]
    if sort == "newest":
        sort_spec = [("created_at", -1)]
    elif sort == "category":
        sort_spec = [("category", 1), ("term", 1)]

    cursor = db.entries.find(query, {"_id": 0}).sort(sort_spec).limit(limit)
    docs = await cursor.to_list(length=limit)
    results = []
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
        results.append(Entry(**d))
    return results


@api_router.get("/entries/{entry_id}", response_model=Entry)
async def get_entry(entry_id: str):
    d = await db.entries.find_one({"id": entry_id}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Entry not found")
    if isinstance(d.get("created_at"), str):
        d["created_at"] = datetime.fromisoformat(d["created_at"])
    return Entry(**d)


@api_router.patch("/entries/{entry_id}", response_model=Entry)
async def update_entry(entry_id: str, payload: EntryCreate, admin: dict = Depends(require_admin)):
    """Admin-only: edit any entry. (Contributors cannot edit through this endpoint.)"""
    if payload.category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    update_doc = {
        "term": payload.term.strip(),
        "translation": payload.translation.strip(),
        "pronunciation": (payload.pronunciation or "").strip(),
        "category": payload.category,
        "meaning": payload.meaning.strip(),
        "meaning_vh": (payload.meaning_vh or "").strip(),
        "example": (payload.example or "").strip(),
        "example_vh": (payload.example_vh or "").strip(),
        "region": (payload.region or "").strip(),
        "audio_url": (payload.audio_url or "").strip(),
    }
    if payload.image_url is not None:
        update_doc["image_url"] = payload.image_url.strip()
    res = await db.entries.find_one_and_update(
        {"id": entry_id},
        {"$set": update_doc},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Entry not found")
    if isinstance(res.get("created_at"), str):
        res["created_at"] = datetime.fromisoformat(res["created_at"])
    return Entry(**{k: v for k, v in res.items() if k != "contributor_id"})


@api_router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str, admin: dict = Depends(require_admin)):
    """Admin-only: delete any entry."""
    res = await db.entries.delete_one({"id": entry_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"ok": True, "deleted": entry_id}


@api_router.post("/entries", response_model=Entry, status_code=201)
async def create_entry(payload: EntryCreate, user: dict = Depends(get_current_user)):
    if payload.category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    is_admin = user.get("role") == "admin"
    doc = {
        "id": str(uuid.uuid4()),
        "term": payload.term.strip(),
        "translation": payload.translation.strip(),
        "pronunciation": (payload.pronunciation or "").strip(),
        "category": payload.category,
        "meaning": payload.meaning.strip(),
        "meaning_vh": (payload.meaning_vh or "").strip(),
        "example": (payload.example or "").strip(),
        "example_vh": (payload.example_vh or "").strip(),
        "region": (payload.region or "").strip(),
        # Only admins can attach an image; contributors get an empty placeholder.
        "image_url": (payload.image_url or "").strip() if is_admin else "",
        "audio_url": (payload.audio_url or "").strip(),
        "contributor_name": user.get("name", "Evenda"),
        "contributor_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.entries.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return Entry(**{k: v for k, v in doc.items() if k != "contributor_id"})


# ---------- Admin-only image management --------------------------------------
class ImagePatchPayload(BaseModel):
    image_url: str = Field(min_length=1, max_length=2000)


@api_router.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Any authenticated user can upload an audio recording for their entry."""
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    if content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=400, detail="Only WebM/OGG/MP3/WAV/M4A audio is accepted")
    data = await file.read()
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio must be under 10 MB")
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    ext = "webm"
    if "." in (file.filename or ""):
        ext = file.filename.rsplit(".", 1)[-1].lower()
    if content_type in ("audio/mpeg", "audio/mp3"):
        ext = "mp3"
    elif content_type in ("audio/wav", "audio/x-wav"):
        ext = "wav"
    elif content_type in ("audio/mp4", "audio/m4a"):
        ext = "m4a"
    elif content_type == "audio/ogg":
        ext = "ogg"
    storage_path = f"{APP_STORAGE_NAME}/audio/{uuid.uuid4()}.{ext}"
    result = storage_put(storage_path, data, content_type)
    final_path = result.get("path", storage_path)
    backend_base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    public_url = f"{backend_base}/api/files/{final_path}" if backend_base else f"/api/files/{final_path}"
    await db.uploads.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": final_path,
        "original_filename": file.filename or "audio",
        "content_type": content_type,
        "size": len(data),
        "uploaded_by": user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": public_url, "path": final_path, "size": len(data), "content_type": content_type}


@api_router.post("/admin/upload-image")
async def admin_upload_image(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WebP or GIF images are accepted")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be under 5 MB")
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    ext = "jpg"
    if "." in (file.filename or ""):
        ext = file.filename.rsplit(".", 1)[-1].lower()
    if content_type == "image/png":
        ext = "png"
    elif content_type == "image/webp":
        ext = "webp"
    elif content_type == "image/gif":
        ext = "gif"
    elif content_type == "image/jpeg":
        ext = "jpg"
    storage_path = f"{APP_STORAGE_NAME}/entry-images/{uuid.uuid4()}.{ext}"
    result = storage_put(storage_path, data, content_type)
    final_path = result.get("path", storage_path)
    backend_base = os.environ.get("FRONTEND_URL", "").rstrip("/")  # used to build absolute URL
    public_url = f"{backend_base}/api/files/{final_path}" if backend_base else f"/api/files/{final_path}"
    await db.uploads.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": final_path,
        "original_filename": file.filename or "image",
        "content_type": content_type,
        "size": len(data),
        "uploaded_by": admin["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": public_url, "path": final_path, "size": len(data), "content_type": content_type}


@api_router.patch("/entries/{entry_id}/image", response_model=Entry)
async def set_entry_image(entry_id: str, payload: ImagePatchPayload, admin: dict = Depends(require_admin)):
    image_url = payload.image_url.strip()
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url cannot be empty")
    res = await db.entries.find_one_and_update(
        {"id": entry_id},
        {"$set": {"image_url": image_url}},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Entry not found")
    if isinstance(res.get("created_at"), str):
        res["created_at"] = datetime.fromisoformat(res["created_at"])
    return Entry(**{k: v for k, v in res.items() if k != "contributor_id"})


@api_router.delete("/entries/{entry_id}/image", response_model=Entry)
async def remove_entry_image(entry_id: str, admin: dict = Depends(require_admin)):
    res = await db.entries.find_one_and_update(
        {"id": entry_id},
        {"$set": {"image_url": ""}},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Entry not found")
    if isinstance(res.get("created_at"), str):
        res["created_at"] = datetime.fromisoformat(res["created_at"])
    return Entry(**{k: v for k, v in res.items() if k != "contributor_id"})


@api_router.get("/files/{path:path}")
async def get_file(path: str):
    """Public, read-only proxy to object-storage files."""
    record = await db.uploads.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = storage_get(path)
    return Response(
        content=data,
        media_type=record.get("content_type", content_type),
        headers={"Cache-Control": "public, max-age=86400"},
    )


@api_router.get("/")
async def root():
    return {"name": "Evenda API", "status": "ok"}


# --------------------------------------------------------------------------------------
# Startup
# --------------------------------------------------------------------------------------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@evenda.org").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@Evenda123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Evenda Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Seeded admin user: %s", admin_email)
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}}
        )


async def seed_entries():
    """Insert seed entries the first time, and back-fill new bilingual fields
    (meaning_vh, example_vh) for entries previously seeded without them."""
    count = await db.entries.count_documents({})
    if count == 0:
        docs = []
        for e in SEED_ENTRIES:
            docs.append({
                "id": str(uuid.uuid4()),
                "term": e["term"],
                "translation": e["translation"],
                "pronunciation": e.get("pronunciation", ""),
                "category": e["category"],
                "meaning": e["meaning"],
                "meaning_vh": e.get("meaning_vh", ""),
                "example": e.get("example", ""),
                "example_vh": e.get("example_vh", ""),
                "region": e.get("region", ""),
                "image_url": e.get("image_url", ""),
                "audio_url": e.get("audio_url", ""),
                "contributor_name": "Evenda",
                "contributor_id": "system",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        if docs:
            await db.entries.insert_many(docs)
            logger.info("Seeded %d entries", len(docs))
        return

    # Idempotent migration: backfill bilingual fields onto existing seed entries
    backfilled = 0
    for e in SEED_ENTRIES:
        existing = await db.entries.find_one({"term": e["term"], "contributor_id": "system"})
        if not existing:
            continue
        updates = {}
        if not existing.get("meaning_vh") and e.get("meaning_vh"):
            updates["meaning_vh"] = e["meaning_vh"]
        if not existing.get("example_vh") and e.get("example_vh"):
            updates["example_vh"] = e["example_vh"]
        if updates:
            await db.entries.update_one({"id": existing["id"]}, {"$set": updates})
            backfilled += 1
    if backfilled:
        logger.info("Backfilled bilingual fields on %d seed entries", backfilled)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.entries.create_index("id", unique=True)
    await db.entries.create_index("category")
    await db.entries.create_index("term")
    await db.uploads.create_index("storage_path")
    await seed_admin()
    await seed_entries()
    init_storage()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# --------------------------------------------------------------------------------------
# Mount router + CORS
# --------------------------------------------------------------------------------------
app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "")
allow_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
if frontend_url and frontend_url not in allow_origins:
    allow_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
