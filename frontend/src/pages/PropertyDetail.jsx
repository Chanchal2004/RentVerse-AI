import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, fileUrl } from "../lib/api";
import LockedContact from "../components/LockedContact";
import VisitBooking from "../components/VisitBooking";
import { MapPin, BedDouble, Home, Wifi, Utensils, Shield as ShieldIcon, Sparkles, ChevronLeft, IndianRupee, Calendar as CalIcon, ShieldCheck } from "lucide-react";

const furnishLabel = { unfurnished: "Unfurnished", semi: "Semi-furnished", full: "Fully furnished" };

export default function PropertyDetail() {
  const { id } = useParams();
  const [prop, setProp] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/properties/${id}`);
      setProp(data);
    } catch { setProp(null); }
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <div className="p-16 text-forest-2">Loading property…</div>;
  if (!prop) return <div className="p-16 text-forest-2">Property not found.</div>;

  const photos = prop.photos || [];
  const heroPhotos = photos.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Link to="/" data-testid="detail-back" className="inline-flex items-center gap-1 text-forest-2 mb-4 text-sm">
        <ChevronLeft size={16} /> Back to search
      </Link>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {prop.owner_kyc_status === "approved" && (
          <span className="pill pill-approved"><ShieldCheck size={12} /> KYC Verified Owner</span>
        )}
        <span className="pill pill-info">{furnishLabel[prop.furnishing]}</span>
        <span className="pill pill-info">{prop.rooms} BHK</span>
      </div>

      <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-forest">{prop.title}</h1>
      <p className="text-forest-2 mt-2 flex items-center gap-1"><MapPin size={16} /> {prop.address}, {prop.city}</p>

      {/* Gallery */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-3 max-h-[60vh]">
        {heroPhotos.length === 0 ? (
          <div className="col-span-12 h-80 rounded-xl bg-gray-100 flex items-center justify-center text-muted">
            <Home size={48} />
          </div>
        ) : (
          <>
            <div className="md:col-span-8">
              <img src={fileUrl(heroPhotos[0])} alt="" className="w-full h-80 md:h-[500px] rounded-xl object-cover" />
            </div>
            <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-3">
              {heroPhotos.slice(1, 5).map((p, i) => (
                <img key={i} src={fileUrl(p)} alt="" className="w-full h-32 md:h-[120px] rounded-xl object-cover" />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left - description & details */}
        <div className="lg:col-span-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-forest mb-3">About this home</h2>
            <p className="text-forest-2 leading-relaxed whitespace-pre-line">{prop.description}</p>
          </section>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={<IndianRupee size={16} />} label="Monthly Rent" value={`₹${prop.monthly_rent.toLocaleString("en-IN")}`} />
            <Stat icon={<IndianRupee size={16} />} label="Deposit" value={`₹${prop.security_deposit.toLocaleString("en-IN")}`} />
            <Stat icon={<BedDouble size={16} />} label="Bedrooms" value={`${prop.rooms} BHK`} />
            <Stat icon={<CalIcon size={16} />} label="Available From" value={new Date(prop.available_from).toLocaleDateString("en-IN")} />
          </section>

          {prop.amenities?.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold text-forest mb-3 flex items-center gap-2"><Sparkles size={18} /> Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {prop.amenities.map((a) => <span key={a} className="tag">{a}</span>)}
              </div>
            </section>
          )}

          {(prop.food_available !== null || prop.internet_details) && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prop.food_available !== null && (
                <div className="rounded-xl border border-warm bg-white p-4 flex items-start gap-3">
                  <Utensils className="text-terra" size={18} />
                  <div>
                    <div className="font-semibold text-forest">Food</div>
                    <div className="text-forest-2 text-sm">{prop.food_available ? "Meals available on site" : "Bring / cook your own"}</div>
                  </div>
                </div>
              )}
              {prop.internet_details && (
                <div className="rounded-xl border border-warm bg-white p-4 flex items-start gap-3">
                  <Wifi className="text-forest" size={18} />
                  <div>
                    <div className="font-semibold text-forest">Internet</div>
                    <div className="text-forest-2 text-sm">{prop.internet_details}</div>
                  </div>
                </div>
              )}
            </section>
          )}

          {prop.safety_features?.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold text-forest mb-3 flex items-center gap-2"><ShieldIcon size={18} /> Safety</h3>
              <div className="flex flex-wrap gap-2">{prop.safety_features.map((a) => <span key={a} className="tag">{a}</span>)}</div>
            </section>
          )}

          {prop.house_rules?.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold text-forest mb-3">House rules</h3>
              <ul className="list-disc pl-5 space-y-1 text-forest-2">{prop.house_rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </section>
          )}

          {prop.nearby_places?.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold text-forest mb-3">Nearby</h3>
              <div className="flex flex-wrap gap-2">{prop.nearby_places.map((n) => <span key={n} className="tag">{n}</span>)}</div>
            </section>
          )}

          {prop.location?.google_maps_url && (
            <section>
              <h3 className="text-xl font-semibold text-forest mb-3">Location</h3>
              <a
                data-testid="google-maps-link"
                href={prop.location.google_maps_url}
                target="_blank" rel="noreferrer"
                className="btn-secondary inline-flex"
              >
                <MapPin size={16} /> Open in Google Maps
              </a>
            </section>
          )}
        </div>

        {/* Right - Sticky action card */}
        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl border border-warm bg-white p-6">
              <div className="label-overline mb-1">Monthly rent</div>
              <div className="text-3xl font-black text-forest">₹{prop.monthly_rent.toLocaleString("en-IN")}</div>
              <div className="text-sm text-forest-2 mt-1">+ ₹{prop.security_deposit.toLocaleString("en-IN")} security deposit</div>
            </div>
            <LockedContact property={prop} onUnlocked={refresh} />
            <VisitBooking propertyId={prop.id} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-warm bg-white p-4">
      <div className="flex items-center gap-2 text-forest-2 text-xs uppercase tracking-wider mb-1">{icon} {label}</div>
      <div className="text-forest font-bold text-lg">{value}</div>
    </div>
  );
}
