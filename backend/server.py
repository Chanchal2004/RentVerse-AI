"""Main FastAPI server."""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from deps import db, hash_password
from models import new_id, now_iso
from storage import init_storage

# Route modules
from routes_auth import router as auth_router
from routes_files import router as files_router
from routes_properties import router as props_router
from routes_kyc import router as kyc_router
from routes_payments import router as payments_router
from routes_visits import router as visits_router
from routes_chat import router as chat_router
from routes_admin import router as admin_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Rentily API")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "rentily", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


api_router.include_router(auth_router)
api_router.include_router(files_router)
api_router.include_router(props_router)
api_router.include_router(kyc_router)
api_router.include_router(payments_router)
api_router.include_router(visits_router)
api_router.include_router(chat_router)
api_router.include_router(admin_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Init object storage session key
    try:
        init_storage()
    except Exception as e:
        logger.warning("Storage init deferred: %s", e)

    # Ensure indexes
    await db.users.create_index("email", unique=True)
    await db.properties.create_index([("status", 1), ("created_at", -1)])
    await db.properties.create_index("owner_id")
    await db.properties.create_index("city")
    await db.unlocks.create_index([("tenant_id", 1), ("property_id", 1)], unique=True)
    await db.chat_messages.create_index([("thread_id", 1), ("created_at", 1)])
    await db.visits.create_index([("owner_id", 1), ("created_at", -1)])
    await db.visits.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.files.create_index("storage_path", unique=True)

    # Seed admin user (idempotent)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@rentily.in").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Rentily Admin",
            "phone": None,
            "role": "admin",
            "kyc_status": "approved",
            "is_premium": True,
            "premium_until": None,
            "created_at": now_iso(),
        })
        logger.info("Seeded admin: %s", admin_email)
