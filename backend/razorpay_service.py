"""Razorpay wrapper. Reads keys from env at call-time so keys can be added later without restart."""
import os
import hmac
import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _client():
    import razorpay
    key_id = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
    if not key_id or not key_secret:
        return None
    return razorpay.Client(auth=(key_id, key_secret))


def is_configured() -> bool:
    return bool(os.environ.get("RAZORPAY_KEY_ID") and os.environ.get("RAZORPAY_KEY_SECRET"))


def public_key() -> Optional[str]:
    key = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    return key or None


def create_order(amount_paise: int, receipt: str, notes: dict = None) -> dict:
    """Returns the created order dict from Razorpay."""
    c = _client()
    if not c:
        raise RuntimeError("Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.")
    return c.order.create({
        "amount": int(amount_paise),
        "currency": "INR",
        "receipt": receipt[:40],
        "payment_capture": 1,
        "notes": notes or {},
    })


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
    if not secret:
        return False
    body = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook(payload: bytes, signature: str) -> bool:
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "").strip()
    if not secret:
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
