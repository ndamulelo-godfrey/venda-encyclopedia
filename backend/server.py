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
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

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
    example: Optional[str] = ""
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
    example: str = ""
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


@api_router.post("/entries", response_model=Entry, status_code=201)
async def create_entry(payload: EntryCreate, user: dict = Depends(get_current_user)):
    if payload.category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    doc = {
        "id": str(uuid.uuid4()),
        "term": payload.term.strip(),
        "translation": payload.translation.strip(),
        "pronunciation": (payload.pronunciation or "").strip(),
        "category": payload.category,
        "meaning": payload.meaning.strip(),
        "example": (payload.example or "").strip(),
        "region": (payload.region or "").strip(),
        "image_url": (payload.image_url or "").strip(),
        "audio_url": (payload.audio_url or "").strip(),
        "contributor_name": user.get("name", "Evenda"),
        "contributor_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.entries.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return Entry(**{k: v for k, v in doc.items() if k != "contributor_id"})


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
    count = await db.entries.count_documents({})
    if count > 0:
        return
    docs = []
    for e in SEED_ENTRIES:
        docs.append({
            "id": str(uuid.uuid4()),
            "term": e["term"],
            "translation": e["translation"],
            "pronunciation": e.get("pronunciation", ""),
            "category": e["category"],
            "meaning": e["meaning"],
            "example": e.get("example", ""),
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


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.entries.create_index("id", unique=True)
    await db.entries.create_index("category")
    await db.entries.create_index("term")
    await seed_admin()
    await seed_entries()


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
