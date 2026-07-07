"""Visit bookings."""
from fastapi import APIRouter, Depends, HTTPException
from models import VisitCreate, VisitAction, new_id, now_iso
from deps import db, get_current_user

router = APIRouter(prefix="/visits", tags=["visits"])


@router.post("")
async def create_visit(payload: VisitCreate, user=Depends(get_current_user)):
    if user["role"] != "tenant":
        raise HTTPException(status_code=403, detail="Only tenants can book visits")
    prop = await db.properties.find_one({"id": payload.property_id})
    if not prop or prop.get("status") != "approved":
        raise HTTPException(status_code=404, detail="Property not available")
    doc = {
        "id": new_id(),
        "property_id": payload.property_id,
        "property_title": prop["title"],
        "tenant_id": user["id"],
        "tenant_name": user["name"],
        "tenant_phone": user.get("phone"),
        "owner_id": prop["owner_id"],
        "requested_datetime": payload.requested_datetime,
        "message": payload.message,
        "status": "requested",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.visits.insert_one(doc)
    return {"id": doc["id"], "status": "requested"}


@router.get("/my")
async def my_visits(user=Depends(get_current_user)):
    if user["role"] == "tenant":
        q = {"tenant_id": user["id"]}
    else:
        q = {"owner_id": user["id"]}
    items = await db.visits.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@router.patch("/{visit_id}")
async def act_visit(visit_id: str, payload: VisitAction, user=Depends(get_current_user)):
    v = await db.visits.find_one({"id": visit_id})
    if not v:
        raise HTTPException(status_code=404)
    action = payload.action
    if action in {"confirm", "reject", "complete"}:
        if v["owner_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Only owner can perform this action")
        status_map = {"confirm": "confirmed", "reject": "rejected", "complete": "completed"}
        new_status = status_map[action]
    elif action == "cancel":
        if v["tenant_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Only tenant can cancel")
        new_status = "cancelled"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    await db.visits.update_one(
        {"id": visit_id},
        {"$set": {"status": new_status, "updated_at": now_iso(), "owner_note": payload.note}},
    )
    return {"ok": True, "status": new_status}
