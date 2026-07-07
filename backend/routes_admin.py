"""Admin panel routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from models import AdminActionRequest, now_iso
from deps import db, require_role

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role("admin"))])


@router.get("/stats")
async def stats():
    users = await db.users.count_documents({})
    owners = await db.users.count_documents({"role": "owner"})
    tenants = await db.users.count_documents({"role": "tenant"})
    total_props = await db.properties.count_documents({})
    pending = await db.properties.count_documents({"status": "pending"})
    approved = await db.properties.count_documents({"status": "approved"})
    rejected = await db.properties.count_documents({"status": "rejected"})
    suspended = await db.properties.count_documents({"status": "suspended"})
    kyc_pending = await db.kyc.count_documents({"status": "pending"})
    paid = await db.payments.count_documents({"status": "paid"})
    revenue_agg = await db.payments.aggregate([
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    revenue = revenue_agg[0]["total"] if revenue_agg else 0
    return {
        "users": users, "owners": owners, "tenants": tenants,
        "properties": {"total": total_props, "pending": pending, "approved": approved, "rejected": rejected, "suspended": suspended},
        "kyc_pending": kyc_pending,
        "payments": paid,
        "revenue_paise": revenue,
    }


@router.get("/properties")
async def list_all_properties(status: Optional[str] = None, limit: int = Query(100, le=200)):
    q = {}
    if status:
        q["status"] = status
    items = await db.properties.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return items


@router.post("/properties/{prop_id}/action")
async def property_action(prop_id: str, payload: AdminActionRequest, admin=Depends(require_role("admin"))):
    prop = await db.properties.find_one({"id": prop_id})
    if not prop:
        raise HTTPException(status_code=404)
    action = payload.action
    status_map = {"approve": "approved", "reject": "rejected", "suspend": "suspended", "request_info": "needs_info"}
    if action not in status_map:
        raise HTTPException(status_code=400, detail="Invalid action")
    await db.properties.update_one(
        {"id": prop_id},
        {"$set": {
            "status": status_map[action],
            "admin_note": payload.note,
            "reviewed_by": admin["id"],
            "reviewed_at": now_iso(),
            "updated_at": now_iso(),
        }},
    )
    return {"ok": True, "status": status_map[action]}


@router.get("/kyc")
async def list_kyc(status: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    items = await db.kyc.find(q, {"_id": 0}).sort("submitted_at", -1).to_list(200)
    return items


@router.post("/kyc/{kyc_id}/action")
async def kyc_action(kyc_id: str, payload: AdminActionRequest, admin=Depends(require_role("admin"))):
    doc = await db.kyc.find_one({"id": kyc_id})
    if not doc:
        raise HTTPException(status_code=404)
    action = payload.action
    if action not in {"approve", "reject"}:
        raise HTTPException(status_code=400, detail="Invalid action")
    new_status = "approved" if action == "approve" else "rejected"
    await db.kyc.update_one(
        {"id": kyc_id},
        {"$set": {"status": new_status, "reviewer_note": payload.note, "reviewed_at": now_iso(), "reviewer_id": admin["id"]}},
    )
    await db.users.update_one({"id": doc["user_id"]}, {"$set": {"kyc_status": new_status}})
    return {"ok": True, "status": new_status}


@router.get("/users")
async def list_users(role: Optional[str] = None):
    q = {}
    if role:
        q["role"] = role
    items = await db.users.find(q, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(500).to_list(500)
    return items


@router.get("/payments")
async def list_payments(status: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    items = await db.payments.find(q, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    return items
