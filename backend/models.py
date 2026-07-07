"""Pydantic models with MongoDB-safe ObjectId handling."""
from typing import List, Optional, Annotated, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, EmailStr
from bson import ObjectId
import uuid


def _validate_object_id(v: Any) -> str:
    if v is None:
        return None
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


class BaseDoc(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)


# ---------------- User ----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    phone: Optional[str] = None
    role: str = Field(default="tenant")  # tenant | owner | admin


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseDoc):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    kyc_status: str = "not_submitted"  # not_submitted | pending | approved | rejected
    is_premium: bool = False
    premium_until: Optional[str] = None
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# ---------------- Property ----------------
class GeoLocation(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    google_maps_url: Optional[str] = None


class PropertyCreate(BaseModel):
    property_type: str  # apartment / independent_house / villa / pg / studio
    title: str
    photos: List[str] = []  # storage paths
    address: str
    city: str
    location: GeoLocation = GeoLocation()
    monthly_rent: int
    security_deposit: int
    available_from: str  # ISO date
    rooms: int  # BHK
    furnishing: str  # unfurnished / semi / full
    description: str
    contact_phone: str
    contact_email: Optional[str] = None
    # optional details
    amenities: List[str] = []
    food_available: Optional[bool] = None
    internet_details: Optional[str] = None
    nearby_places: List[str] = []
    safety_features: List[str] = []
    house_rules: List[str] = []


class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    monthly_rent: Optional[int] = None
    security_deposit: Optional[int] = None
    available_from: Optional[str] = None
    rooms: Optional[int] = None
    furnishing: Optional[str] = None
    photos: Optional[List[str]] = None
    address: Optional[str] = None
    location: Optional[GeoLocation] = None
    amenities: Optional[List[str]] = None
    food_available: Optional[bool] = None
    internet_details: Optional[str] = None
    nearby_places: Optional[List[str]] = None
    safety_features: Optional[List[str]] = None
    house_rules: Optional[List[str]] = None


class AdminActionRequest(BaseModel):
    action: str  # approve | reject | suspend | request_info
    note: Optional[str] = None


# ---------------- KYC ----------------
class KycSubmit(BaseModel):
    document_type: str  # aadhaar | pan | driving_license
    id_document_url: str
    selfie_url: str
    ownership_proof_url: Optional[str] = None
    full_name_on_document: str


# ---------------- Payments ----------------
class OrderCreate(BaseModel):
    purpose: str  # unlock | premium
    property_id: Optional[str] = None
    plan: Optional[str] = None  # monthly | quarterly | yearly


class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    purpose: str
    property_id: Optional[str] = None
    plan: Optional[str] = None


# ---------------- Visits ----------------
class VisitCreate(BaseModel):
    property_id: str
    requested_datetime: str  # ISO
    message: Optional[str] = None


class VisitAction(BaseModel):
    action: str  # confirm | reject | cancel | complete
    note: Optional[str] = None


# ---------------- Chat ----------------
class ChatMessageCreate(BaseModel):
    to_user_id: str
    property_id: Optional[str] = None
    text: str
