"""Payments: Razorpay order + verify + webhook + unlocks + subscriptions."""
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from models import OrderCreate, PaymentVerify, new_id, now_iso
from deps import db, get_current_user, PLANS, is_premium_active
from razorpay_service import create_order, verify_signature, verify_webhook, is_configured, public_key

router = APIRouter(prefix="/payments", tags=["payments"])
logger = logging.getLogger(__name__)


@router.get("/config")
async def config():
    return {"configured": is_configured(), "key_id": public_key(), "plans": PLANS}


@router.post("/order")
async def create_pay_order(payload: OrderCreate, user=Depends(get_current_user)):
    if not is_configured():
        raise HTTPException(status_code=503, detail="Payments not configured. Admin must add Razorpay keys.")

    if payload.purpose == "unlock":
        if not payload.property_id:
            raise HTTPException(status_code=400, detail="property_id required")
        prop = await db.properties.find_one({"id": payload.property_id})
        if not prop or prop.get("status") != "approved":
            raise HTTPException(status_code=404, detail="Property not available")
        if prop["owner_id"] == user["id"]:
            raise HTTPException(status_code=400, detail="Cannot unlock your own listing")
        already = await db.unlocks.find_one({"tenant_id": user["id"], "property_id": payload.property_id})
        if already:
            raise HTTPException(status_code=409, detail="Already unlocked")
        if await is_premium_active(user["id"]):
            raise HTTPException(status_code=400, detail="Premium already unlocks all contacts")
        amount = PLANS["unlock"]["amount"]
        receipt = f"unlk_{payload.property_id[:8]}_{user['id'][:6]}"
        notes = {"purpose": "unlock", "property_id": payload.property_id, "user_id": user["id"]}
    elif payload.purpose == "premium":
        if payload.plan not in {"monthly", "quarterly", "yearly"}:
            raise HTTPException(status_code=400, detail="Invalid plan")
        amount = PLANS[payload.plan]["amount"]
        receipt = f"prem_{payload.plan[:3]}_{user['id'][:8]}"
        notes = {"purpose": "premium", "plan": payload.plan, "user_id": user["id"]}
    else:
        raise HTTPException(status_code=400, detail="Invalid purpose")

    try:
        order = create_order(amount, receipt, notes)
    except Exception as e:
        logger.exception("Razorpay order failed")
        raise HTTPException(status_code=500, detail=f"Razorpay error: {e}")

    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "amount": amount,
        "currency": "INR",
        "purpose": payload.purpose,
        "plan": payload.plan,
        "property_id": payload.property_id,
        "razorpay_order_id": order["id"],
        "razorpay_payment_id": None,
        "status": "created",
        "created_at": now_iso(),
    }
    await db.payments.insert_one(doc)
    return {
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR",
        "key_id": public_key(),
        "purpose": payload.purpose,
    }


async def _grant_after_success(user_id: str, purpose: str, property_id: str = None, plan: str = None, payment_id: str = None):
    if purpose == "unlock" and property_id:
        exists = await db.unlocks.find_one({"tenant_id": user_id, "property_id": property_id})
        if not exists:
            await db.unlocks.insert_one({
                "id": new_id(),
                "tenant_id": user_id,
                "property_id": property_id,
                "payment_id": payment_id,
                "created_at": now_iso(),
            })
    elif purpose == "premium" and plan:
        days = PLANS[plan]["duration_days"]
        user = await db.users.find_one({"id": user_id})
        base = datetime.now(timezone.utc)
        if user.get("premium_until"):
            try:
                cur = datetime.fromisoformat(user["premium_until"])
                if cur > base:
                    base = cur
            except Exception:
                pass
        until = base + timedelta(days=days)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_premium": True, "premium_until": until.isoformat()}},
        )
        await db.subscriptions.insert_one({
            "id": new_id(),
            "user_id": user_id,
            "plan": plan,
            "starts_at": now_iso(),
            "ends_at": until.isoformat(),
            "payment_id": payment_id,
        })


@router.post("/verify")
async def verify_payment(payload: PaymentVerify, user=Depends(get_current_user)):
    if not verify_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    pay = await db.payments.find_one({"razorpay_order_id": payload.razorpay_order_id, "user_id": user["id"]})
    if not pay:
        raise HTTPException(status_code=404, detail="Order not found")
    if pay["status"] == "paid":
        return {"ok": True, "already": True}
    await db.payments.update_one(
        {"id": pay["id"]},
        {"$set": {"status": "paid", "razorpay_payment_id": payload.razorpay_payment_id, "paid_at": now_iso()}},
    )
    await _grant_after_success(user["id"], pay["purpose"], pay.get("property_id"), pay.get("plan"), payload.razorpay_payment_id)
    return {"ok": True}


@router.post("/webhook")
async def webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")
    if not verify_webhook(body, sig):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    import json
    payload = json.loads(body)
    event = payload.get("event")
    if event == "payment.captured":
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")
        payment_id = entity.get("id")
        pay = await db.payments.find_one({"razorpay_order_id": order_id})
        if pay and pay["status"] != "paid":
            await db.payments.update_one({"id": pay["id"]}, {"$set": {"status": "paid", "razorpay_payment_id": payment_id, "paid_at": now_iso()}})
            await _grant_after_success(pay["user_id"], pay["purpose"], pay.get("property_id"), pay.get("plan"), payment_id)
    return {"ok": True}


@router.get("/my")
async def my_payments(user=Depends(get_current_user)):
    items = await db.payments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@router.get("/my-unlocks")
async def my_unlocks(user=Depends(get_current_user)):
    unlocks = await db.unlocks.find({"tenant_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    prop_ids = [u["property_id"] for u in unlocks]
    props = await db.properties.find({"id": {"$in": prop_ids}}, {"_id": 0}).to_list(500)
    prop_map = {p["id"]: p for p in props}
    result = []
    for u in unlocks:
        p = prop_map.get(u["property_id"])
        if p:
            result.append({
                "unlocked_at": u["created_at"],
                "property": {
                    "id": p["id"], "title": p["title"], "city": p["city"], "monthly_rent": p["monthly_rent"],
                    "photos": p.get("photos", [])[:1], "contact_phone": p.get("contact_phone"),
                    "contact_email": p.get("contact_email"), "owner_name": p.get("owner_name"),
                },
            })
    return result


@router.get("/subscription")
async def my_subscription(user=Depends(get_current_user)):
    active = await is_premium_active(user["id"])
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"active": active, "premium_until": u.get("premium_until"), "is_premium": u.get("is_premium", False)}
