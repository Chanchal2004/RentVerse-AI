"""File upload & serve routes."""
import logging
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Response
from models import new_id, now_iso
from deps import db, get_current_user
from storage import build_path, put_object, get_object, content_type_for

router = APIRouter(tags=["files"])
logger = logging.getLogger(__name__)

ALLOWED_EXT = {"jpg", "jpeg", "png", "webp", "pdf"}
MAX_SIZE = 8 * 1024 * 1024  # 8MB


@router.post("/uploads")
async def upload(file: UploadFile = File(...), folder: str = "properties", user=Depends(get_current_user)):
    filename = file.filename or "file.bin"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 8MB)")
    ct = file.content_type or content_type_for(filename)
    path = build_path(user["id"], filename, folder=folder)
    try:
        result = put_object(path, data, ct)
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Storage error: {e}")
    doc = {
        "id": new_id(),
        "storage_path": result["path"],
        "owner_id": user["id"],
        "original_filename": filename,
        "content_type": ct,
        "size": result.get("size", len(data)),
        "folder": folder,
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.files.insert_one(doc)
    return {"id": doc["id"], "storage_path": doc["storage_path"], "content_type": ct, "size": doc["size"]}


@router.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        data, ct = get_object(path)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Storage error: {e}")
    return Response(content=data, media_type=record.get("content_type") or ct)
