"""Chat messages between tenant and owner."""
from fastapi import APIRouter, Depends, HTTPException
from models import ChatMessageCreate, new_id, now_iso
from deps import db, get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/messages")
async def send_message(payload: ChatMessageCreate, user=Depends(get_current_user)):
    to_user = await db.users.find_one({"id": payload.to_user_id})
    if not to_user:
        raise HTTPException(status_code=404, detail="Recipient not found")
    thread_id = "-".join(sorted([user["id"], payload.to_user_id]))
    doc = {
        "id": new_id(),
        "thread_id": thread_id,
        "from_user_id": user["id"],
        "from_name": user["name"],
        "to_user_id": payload.to_user_id,
        "to_name": to_user["name"],
        "property_id": payload.property_id,
        "text": payload.text,
        "read": False,
        "created_at": now_iso(),
    }
    await db.chat_messages.insert_one(doc)
    return {"id": doc["id"], "created_at": doc["created_at"]}


@router.get("/threads")
async def threads(user=Depends(get_current_user)):
    pipeline = [
        {"$match": {"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$thread_id",
            "last_message": {"$first": "$text"},
            "last_at": {"$first": "$created_at"},
            "from_user_id": {"$first": "$from_user_id"},
            "to_user_id": {"$first": "$to_user_id"},
            "from_name": {"$first": "$from_name"},
            "to_name": {"$first": "$to_name"},
            "property_id": {"$first": "$property_id"},
        }},
        {"$sort": {"last_at": -1}},
    ]
    result = []
    async for row in db.chat_messages.aggregate(pipeline):
        other_id = row["to_user_id"] if row["from_user_id"] == user["id"] else row["from_user_id"]
        other_name = row["to_name"] if row["from_user_id"] == user["id"] else row["from_name"]
        result.append({
            "thread_id": row["_id"],
            "other_user_id": other_id,
            "other_name": other_name,
            "last_message": row["last_message"],
            "last_at": row["last_at"],
            "property_id": row.get("property_id"),
        })
    return result


@router.get("/thread/{other_id}")
async def get_thread(other_id: str, user=Depends(get_current_user)):
    thread_id = "-".join(sorted([user["id"], other_id]))
    msgs = await db.chat_messages.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    # Mark incoming as read
    await db.chat_messages.update_many(
        {"thread_id": thread_id, "to_user_id": user["id"], "read": False},
        {"$set": {"read": True}},
    )
    return msgs
