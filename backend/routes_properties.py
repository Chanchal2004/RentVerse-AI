"""Property CRUD + search + AI verification."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from models import PropertyCreate, PropertyUpdate, new_id, now_iso
from deps import db, get_current_user, get_optional_user, is_premium_active
from ai_verifier import verify_listing

router = APIRouter(prefix="/properties", tags=["properties"])


def _sanitize(prop: dict, viewer: Optional[dict], unlocked: bool) -> dict:
    """Hide owner contact unless unlocked/owner/admin."""
    p = {k: v for k, v in prop.items() if k != "_id"}
    can_see_contact = bool(unlocked) or bool(
        viewer is not None and (viewer["id"] == prop.get("owner_id") or viewer["role"] == "admin")
    )
    if not can_see_contact:
        p["contact_phone"] = None
        p["contact_email"] = None
    p["contact_unlocked"] = bool(can_see_contact)
    return p


@router.post("")
async def create_property(payload: PropertyCreate, user=Depends(get_current_user)):
    if user["role"] not in {"owner", "admin"}:
        raise HTTPException(status_code=403, detail="Only owners can list properties")
    kyc_status = user.get("kyc_status", "not_submitted")
    prop = {
        "id": new_id(),
        "owner_id": user["id"],
        "owner_name": user["name"],
        "owner_kyc_status": kyc_status,
        "status": "pending",
        "ai_verdict": None,
        "admin_note": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "views": 0,
        **payload.model_dump(),
    }

    # Run AI verification synchronously (fast enough with claude, sub-4s typical)
    verdict = await verify_listing(prop)
    prop["ai_verdict"] = verdict
    if verdict["verdict"] == "approve" and kyc_status == "approved":
        prop["status"] = "approved"
    elif verdict["verdict"] == "reject":
        prop["status"] = "rejected"
        prop["admin_note"] = "; ".join(verdict.get("reasons", [])) or "AI rejected"
    else:
        prop["status"] = "pending"

    await db.properties.insert_one(prop)
    return {"id": prop["id"], "status": prop["status"], "ai_verdict": verdict}


@router.get("")
async def list_properties(
    city: Optional[str] = None,
    min_rent: Optional[int] = None,
    max_rent: Optional[int] = None,
    rooms: Optional[int] = None,
    furnishing: Optional[str] = None,
    property_type: Optional[str] = None,
    q: Optional[str] = None,
    status: Optional[str] = "approved",
    owner_id: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0,
    viewer=Depends(get_optional_user),
):
    query = {}
    # Non-owners see only approved listings unless filtering their own
    if owner_id:
        query["owner_id"] = owner_id
        if not (viewer and (viewer["id"] == owner_id or viewer["role"] == "admin")):
            query["status"] = "approved"
    else:
        if viewer and viewer["role"] == "admin" and status:
            query["status"] = status
        else:
            query["status"] = "approved"
    if city:
        query["city"] = {"$regex": f"^{city}$", "$options": "i"}
    if property_type:
        query["property_type"] = property_type
    if furnishing:
        query["furnishing"] = furnishing
    if rooms is not None:
        query["rooms"] = rooms
    if min_rent is not None or max_rent is not None:
        rent_q = {}
        if min_rent is not None:
            rent_q["$gte"] = min_rent
        if max_rent is not None:
            rent_q["$lte"] = max_rent
        query["monthly_rent"] = rent_q
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"address": {"$regex": q, "$options": "i"}},
        ]

    cursor = db.properties.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    total = await db.properties.count_documents(query)

    # Check unlocks for viewer
    unlocked_ids = set()
    premium = False
    if viewer:
        premium = await is_premium_active(viewer["id"])
        if not premium:
            unlocks = await db.unlocks.find({"tenant_id": viewer["id"]}, {"_id": 0, "property_id": 1}).to_list(1000)
            unlocked_ids = {u["property_id"] for u in unlocks}

    results = []
    for p in items:
        u = premium or (p["id"] in unlocked_ids) or (viewer and viewer["id"] == p.get("owner_id"))
        results.append(_sanitize(p, viewer, bool(u)))
    return {"items": results, "total": total, "premium": premium}


@router.get("/{prop_id}")
async def get_property(prop_id: str, viewer=Depends(get_optional_user)):
    prop = await db.properties.find_one({"id": prop_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    # Increment views for non-owners
    if not viewer or viewer["id"] != prop.get("owner_id"):
        await db.properties.update_one({"id": prop_id}, {"$inc": {"views": 1}})
    unlocked = False
    if viewer:
        if viewer["id"] == prop.get("owner_id") or viewer["role"] == "admin":
            unlocked = True
        elif await is_premium_active(viewer["id"]):
            unlocked = True
        else:
            u = await db.unlocks.find_one({"tenant_id": viewer["id"], "property_id": prop_id})
            unlocked = bool(u)
    return _sanitize(prop, viewer, unlocked)


@router.patch("/{prop_id}")
async def update_property(prop_id: str, payload: PropertyUpdate, user=Depends(get_current_user)):
    prop = await db.properties.find_one({"id": prop_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Not found")
    if prop["owner_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not your listing")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        updates["updated_at"] = now_iso()
        await db.properties.update_one({"id": prop_id}, {"$set": updates})
    return {"ok": True}


@router.delete("/{prop_id}")
async def delete_property(prop_id: str, user=Depends(get_current_user)):
    prop = await db.properties.find_one({"id": prop_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Not found")
    if prop["owner_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.properties.delete_one({"id": prop_id})
    return {"ok": True}


@router.get("/{prop_id}/status-check")
async def status_check(prop_id: str, user=Depends(get_current_user)):
    prop = await db.properties.find_one({"id": prop_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Not found")
    if prop["owner_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403)
    return {"status": prop["status"], "ai_verdict": prop.get("ai_verdict"), "admin_note": prop.get("admin_note")}
