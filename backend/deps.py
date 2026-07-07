"""Shared deps: mongo, JWT, current user, plans config."""
import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, status, Header
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional


mongo_url = os.environ["MONGO_URL"]
_client = AsyncIOMotorClient(mongo_url)
db = _client[os.environ["DB_NAME"]]


JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MIN = int(os.environ.get("JWT_EXPIRE_MINUTES", "10080"))


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MIN),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_optional_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


def require_role(*roles):
    async def dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return dep


# Plans config - configurable via env or admin settings
PLANS = {
    "unlock": {"amount": 2900, "label": "Unlock 1 property", "duration_days": None},
    "monthly": {"amount": 9900, "label": "Premium Monthly", "duration_days": 30},
    "quarterly": {"amount": 24900, "label": "Premium 3 Months", "duration_days": 90},
    "yearly": {"amount": 79900, "label": "Premium Yearly", "duration_days": 365},
}


async def is_premium_active(user_id: str) -> bool:
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("premium_until"):
        return False
    try:
        until = datetime.fromisoformat(user["premium_until"])
        return until > datetime.now(timezone.utc)
    except Exception:
        return False
