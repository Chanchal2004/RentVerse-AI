"""Razorpay wrapper for orders, payment verification and payment status."""

import os
import hmac
import hashlib
import logging
from typing import Optional


logger = logging.getLogger(__name__)


def _client():
    """
    Create and return Razorpay client using environment variables.
    """
    import razorpay

    key_id = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()

    if not key_id or not key_secret:
        return None

    return razorpay.Client(auth=(key_id, key_secret))


def is_configured() -> bool:
    """
    Check whether Razorpay credentials are configured.
    """
    key_id = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()

    return bool(key_id and key_secret)


def public_key() -> Optional[str]:
    """
    Return Razorpay public key for frontend checkout.
    """
    key = os.environ.get("RAZORPAY_KEY_ID", "").strip()

    return key or None


def create_order(
    amount_paise: int,
    receipt: str,
    notes: dict = None
) -> dict:
    """
    Create a Razorpay order.

    amount_paise:
        Amount in paise.
        Example: ₹1 = 100 paise.
    """

    c = _client()

    if not c:
        raise RuntimeError(
            "Razorpay keys not configured. "
            "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        )

    return c.order.create(
        {
            "amount": int(amount_paise),
            "currency": "INR",
            "receipt": receipt[:40],
            "payment_capture": 1,
            "notes": notes or {},
        }
    )


def verify_signature(
    order_id: str,
    payment_id: str,
    signature: str
) -> bool:
    """
    Verify Razorpay checkout payment signature.
    """

    secret = os.environ.get(
        "RAZORPAY_KEY_SECRET",
        ""
    ).strip()

    if not secret:
        return False

    body = f"{order_id}|{payment_id}".encode()

    expected = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(
        expected,
        signature
    )


def verify_webhook(
    payload: bytes,
    signature: str
) -> bool:
    """
    Verify Razorpay webhook signature.
    """

    secret = os.environ.get(
        "RAZORPAY_WEBHOOK_SECRET",
        ""
    ).strip()

    if not secret:
        return False

    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(
        expected,
        signature
    )


def fetch_order_payments(order_id: str) -> dict:
    """
    Fetch all payments associated with a Razorpay order.

    This is used as a fallback when the frontend checkout
    callback does not reach our backend.
    """

    c = _client()

    if not c:
        raise RuntimeError(
            "Razorpay keys not configured."
        )

    return c.order.payments(order_id)
