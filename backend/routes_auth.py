"""Auth routes."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from models import UserRegister, UserLogin, TokenResponse, UserPublic, new_id, now_iso
from deps import db, hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_public(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "phone": user.get("phone"),
        "role": user["role"],
        "kyc_status": user.get("kyc_status", "not_submitted"),
        "is_premium": user.get("is_premium", False),
        "premium_until": user.get("premium_until"),
        "created_at": user["created_at"],
    }


@router.post("/register", response_model=TokenResponse)
async def register(payload: UserRegister):
    if payload.role not in {"tenant", "owner"}:
        raise HTTPException(status_code=400, detail="Role must be tenant or owner")
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = {
        "id": new_id(),
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "phone": payload.phone,
        "role": payload.role,
        "kyc_status": "not_submitted",
        "is_premium": False,
        "premium_until": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["role"])
    return {"access_token": token, "token_type": "bearer", "user": _to_public(user)}


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], user["role"])
    return {"access_token": token, "token_type": "bearer", "user": _to_public(user)}


@router.get("/me", response_model=UserPublic)
async def me(user=Depends(get_current_user)):
    return _to_public(user)
