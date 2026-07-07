"""KYC submission + status."""
from fastapi import APIRouter, Depends, HTTPException
from models import KycSubmit, new_id, now_iso
from deps import db, get_current_user

router = APIRouter(prefix="/kyc", tags=["kyc"])


@router.post("/submit")
async def submit_kyc(payload: KycSubmit, user=Depends(get_current_user)):
    if user["role"] not in {"owner", "tenant"}:
        raise HTTPException(status_code=403, detail="Not allowed")
    existing = await db.kyc.find_one({"user_id": user["id"], "status": {"$in": ["pending", "approved"]}})
    if existing and existing["status"] == "approved":
        raise HTTPException(status_code=409, detail="KYC already approved")
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "user_email": user["email"],
        "user_name": user["name"],
        "status": "pending",
        "submitted_at": now_iso(),
        "reviewed_at": None,
        "reviewer_note": None,
        **payload.model_dump(),
    }
    if existing:
        await db.kyc.update_one({"id": existing["id"]}, {"$set": {k: v for k, v in doc.items() if k != "id"}})
        doc["id"] = existing["id"]
    else:
        await db.kyc.insert_one(doc)
    await db.users.update_one({"id": user["id"]}, {"$set": {"kyc_status": "pending"}})
    return {"id": doc["id"], "status": "pending"}


@router.get("/me")
async def my_kyc(user=Depends(get_current_user)):
    doc = await db.kyc.find_one({"user_id": user["id"]}, {"_id": 0})
    return doc or {"status": "not_submitted"}
