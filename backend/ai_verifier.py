"""AI listing verifier using Claude Sonnet 4.5 via Emergent Universal Key."""
import os
import json
import logging
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

SYSTEM = (
    "You are a strict fraud-detection assistant for an Indian rental property marketplace. "
    "Given a property listing JSON, return ONLY a JSON object with keys: "
    "verdict (one of 'approve', 'reject', 'manual_review'), confidence (0-1 float), "
    "reasons (array of short strings). "
    "Approve only when: title is descriptive (not just 'Rent flat'), description >= 40 chars and doesn't sound "
    "like a scam, rent is reasonable (>= 1500, <= 500000 INR/month), address has street/city, "
    "photos count >= 1. Reject clear scams: negative rent, requests for advance transfer, all-caps spam, "
    "explicit non-rental content. Otherwise use 'manual_review'. Be conservative."
)


def _extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found")
    return json.loads(match.group(0))


async def verify_listing(listing: dict) -> dict:
    """Returns {verdict, confidence, reasons}."""
    if not EMERGENT_KEY:
        return {"verdict": "manual_review", "confidence": 0.0,
                "reasons": ["AI key not configured"]}

    payload = {
        "title": listing.get("title"),
        "description": listing.get("description"),
        "address": listing.get("address"),
        "city": listing.get("city"),
        "monthly_rent": listing.get("monthly_rent"),
        "security_deposit": listing.get("security_deposit"),
        "rooms": listing.get("rooms"),
        "furnishing": listing.get("furnishing"),
        "property_type": listing.get("property_type"),
        "photos_count": len(listing.get("photos") or []),
    }

    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"verify-{listing.get('id', 'new')}",
        system_message=SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        msg = UserMessage(text="Analyze this listing and respond with JSON only:\n" + json.dumps(payload))
        response = await chat.send_message(msg)
        text = response if isinstance(response, str) else str(response)
        data = _extract_json(text)
        verdict = data.get("verdict", "manual_review")
        if verdict not in {"approve", "reject", "manual_review"}:
            verdict = "manual_review"
        return {
            "verdict": verdict,
            "confidence": float(data.get("confidence", 0.5)),
            "reasons": list(data.get("reasons", []))[:5],
        }
    except Exception as e:
        logger.exception("AI verify failed: %s", e)
        return {"verdict": "manual_review", "confidence": 0.0,
                "reasons": [f"AI error: {str(e)[:80]}"]}
