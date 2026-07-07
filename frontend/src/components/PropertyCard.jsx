import { Link } from "react-router-dom";
import { fileUrl } from "../lib/api";
import { MapPin, BedDouble, Home } from "lucide-react";

const furnishLabel = { unfurnished: "Unfurnished", semi: "Semi-furnished", full: "Fully-furnished" };

export default function PropertyCard({ property }) {
  const cover = (property.photos && property.photos[0]) || null;
  return (
    <Link
      to={`/properties/${property.id}`}
      data-testid={`property-card-${property.id}`}
      className="card-warm overflow-hidden block"
    >
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
        {cover ? (
          <img
            src={fileUrl(cover)}
            alt={property.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">
            <Home size={40} />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {property.owner_kyc_status === "approved" && (
            <span className="pill pill-approved" data-testid="kyc-badge-verified">KYC Verified</span>
          )}
          <span className="tag">{furnishLabel[property.furnishing] || property.furnishing}</span>
        </div>
        <h3 className="text-xl font-semibold text-forest leading-tight line-clamp-1">{property.title}</h3>
        <p className="text-sm text-forest-2 mt-1 flex items-center gap-1 line-clamp-1">
          <MapPin size={14} /> {property.city} · {property.address?.split(",")[0]}
        </p>
        <div className="flex items-baseline justify-between mt-4">
          <div>
            <div className="text-2xl font-black text-forest">₹{property.monthly_rent.toLocaleString("en-IN")}</div>
            <div className="text-xs text-muted">/ month</div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-forest text-sm font-semibold">
              <BedDouble size={14} /> {property.rooms} BHK
            </div>
            <div className="text-xs text-muted">Dep ₹{property.security_deposit.toLocaleString("en-IN")}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
