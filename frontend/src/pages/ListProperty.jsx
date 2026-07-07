import { useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Upload, ChevronRight, ChevronLeft, Loader2, CheckCircle2, X } from "lucide-react";
import { fileUrl } from "../lib/api";

const TYPES = [
  { v: "apartment", l: "Apartment" },
  { v: "independent_house", l: "Independent House" },
  { v: "villa", l: "Villa" },
  { v: "pg", l: "PG / Hostel" },
  { v: "studio", l: "Studio" },
];

const FURNISH = [
  { v: "unfurnished", l: "Unfurnished" },
  { v: "semi", l: "Semi-furnished" },
  { v: "full", l: "Fully furnished" },
];

const AMENITIES = ["Parking", "Lift", "Power Backup", "Security", "Swimming Pool", "Gym", "Garden", "Clubhouse", "Water Supply 24x7"];
const SAFETY = ["CCTV", "Gated Community", "Fire Alarm", "Intercom", "Security Guard"];

export default function ListProperty() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    property_type: "apartment",
    title: "",
    photos: [],
    address: "",
    city: "",
    location: { lat: null, lng: null, google_maps_url: "" },
    monthly_rent: "",
    security_deposit: "",
    available_from: new Date().toISOString().split("T")[0],
    rooms: 1,
    furnishing: "semi",
    description: "",
    contact_phone: "",
    contact_email: "",
    amenities: [],
    food_available: null,
    internet_details: "",
    nearby_places: [],
    safety_features: [],
    house_rules: [],
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const upload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const { data } = await api.post(`/uploads?folder=properties`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        uploaded.push(data.storage_path);
      } catch (e) {
        toast.error(`Upload failed: ${file.name}`);
      }
    }
    set("photos", [...form.photos, ...uploaded]);
    setUploading(false);
  };

  const submit = async () => {
    if (form.photos.length === 0) { toast.error("Add at least one photo"); return; }
    if (!form.title || !form.address || !form.city || !form.contact_phone) { toast.error("Fill required fields"); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        monthly_rent: Number(form.monthly_rent),
        security_deposit: Number(form.security_deposit),
        rooms: Number(form.rooms),
      };
      const { data } = await api.post("/properties", payload);
      if (data.status === "approved") toast.success("Property published!");
      else if (data.status === "rejected") toast.error("AI flagged this listing. Reason: " + (data.ai_verdict?.reasons?.[0] || "Please review"));
      else toast.success("Submitted for review");
      nav("/dashboard/owner");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit");
    }
    setSubmitting(false);
  };

  const toggleArr = (key, val) => {
    const arr = form[key];
    set(key, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const stepBadge = (n, label) => (
    <div className={`flex items-center gap-2 ${step >= n ? "text-forest" : "text-muted"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > n ? "bg-olive text-white" : step === n ? "bg-terra text-white" : "bg-white border border-warm"}`}>
        {step > n ? <CheckCircle2 size={14} /> : n}
      </div>
      <span className="text-sm font-semibold hidden md:inline">{label}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-black text-forest mb-2">List your property</h1>
      <p className="text-forest-2 mb-8">Add just the essentials to publish. Optional details later boost your ranking.</p>

      <div className="flex items-center gap-4 mb-10">
        {stepBadge(1, "Essentials")}
        <div className="flex-1 h-px bg-warm" />
        {stepBadge(2, "Photos")}
        <div className="flex-1 h-px bg-warm" />
        {stepBadge(3, "Optional")}
      </div>

      {step === 1 && (
        <div className="space-y-5 bg-white border border-warm rounded-xl p-6">
          <div>
            <label className="label-overline">Property type *</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {TYPES.map((t) => (
                <button
                  key={t.v}
                  data-testid={`type-${t.v}`}
                  type="button"
                  onClick={() => set("property_type", t.v)}
                  className={`p-3 rounded-lg border text-sm font-semibold ${form.property_type === t.v ? "border-terra bg-terra/5 text-forest" : "border-warm text-forest-2"}`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-overline">Title *</label>
            <input data-testid="list-title" className="input-field mt-1" placeholder="Cozy 2BHK near Indiranagar metro" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-overline">Monthly rent (₹) *</label>
              <input data-testid="list-rent" type="number" className="input-field mt-1" value={form.monthly_rent} onChange={(e) => set("monthly_rent", e.target.value)} />
            </div>
            <div>
              <label className="label-overline">Security deposit (₹) *</label>
              <input data-testid="list-deposit" type="number" className="input-field mt-1" value={form.security_deposit} onChange={(e) => set("security_deposit", e.target.value)} />
            </div>
            <div>
              <label className="label-overline">BHK / Rooms *</label>
              <input data-testid="list-rooms" type="number" min="0" className="input-field mt-1" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} />
            </div>
            <div>
              <label className="label-overline">Available from *</label>
              <input data-testid="list-available" type="date" className="input-field mt-1" value={form.available_from} onChange={(e) => set("available_from", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-overline">Furnishing *</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {FURNISH.map((f) => (
                <button
                  key={f.v}
                  type="button"
                  data-testid={`furnish-${f.v}`}
                  onClick={() => set("furnishing", f.v)}
                  className={`p-3 rounded-lg border text-sm font-semibold ${form.furnishing === f.v ? "border-terra bg-terra/5 text-forest" : "border-warm text-forest-2"}`}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-overline">Address *</label>
              <input data-testid="list-address" className="input-field mt-1" placeholder="Street, area" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div>
              <label className="label-overline">City *</label>
              <input data-testid="list-city" className="input-field mt-1" placeholder="Bengaluru" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-overline">Google Maps link (optional)</label>
            <input data-testid="list-maps-url" className="input-field mt-1" placeholder="https://maps.google.com/..." value={form.location.google_maps_url} onChange={(e) => set("location", { ...form.location, google_maps_url: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-overline">Contact phone *</label>
              <input data-testid="list-contact-phone" className="input-field mt-1" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
            </div>
            <div>
              <label className="label-overline">Contact email</label>
              <input data-testid="list-contact-email" type="email" className="input-field mt-1" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-overline">Short description *</label>
            <textarea data-testid="list-description" className="input-field mt-1" rows={4} placeholder="Describe the space, neighborhood, best features…" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="flex justify-end pt-2">
            <button data-testid="list-next-1" onClick={() => setStep(2)} className="btn-primary">Next: Photos <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 bg-white border border-warm rounded-xl p-6">
          <label className="label-overline">Property photos *</label>
          <label htmlFor="photo-input" className="block border-2 border-dashed border-warm rounded-xl p-10 text-center cursor-pointer hover:bg-bone">
            <Upload className="mx-auto mb-3 text-forest-2" />
            <div className="text-forest font-semibold">Drag & drop or click to upload</div>
            <div className="text-forest-2 text-sm mt-1">JPG, PNG, WEBP · Up to 8MB each</div>
            <input id="photo-input" data-testid="photo-input" type="file" multiple accept="image/*" className="hidden" onChange={(e) => upload(Array.from(e.target.files))} />
          </label>
          {uploading && <div className="text-forest-2 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Uploading…</div>}
          {form.photos.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {form.photos.map((p, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden aspect-square">
                  <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => set("photos", form.photos.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1"
                    data-testid={`remove-photo-${i}`}
                  ><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <button data-testid="list-prev-2" onClick={() => setStep(1)} className="btn-secondary"><ChevronLeft size={16} /> Back</button>
            <button data-testid="list-next-2" onClick={() => setStep(3)} className="btn-primary">Next: Optional <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5 bg-white border border-warm rounded-xl p-6">
          <p className="text-forest-2 text-sm">These improve your listing's search ranking. All optional — you can add them later.</p>

          <div>
            <label className="label-overline">Amenities</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  data-testid={`amenity-${a}`}
                  onClick={() => toggleArr("amenities", a)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${form.amenities.includes(a) ? "bg-olive-bg text-olive border-olive/40" : "bg-white text-forest-2 border-warm"}`}
                >{a}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-overline">Food available on site?</label>
              <div className="flex gap-2 mt-2">
                {[{v: true, l: "Yes"}, {v: false, l: "No"}, {v: null, l: "Skip"}].map((o) => (
                  <button key={String(o.v)} type="button" onClick={() => set("food_available", o.v)}
                    className={`px-4 py-2 rounded-lg border text-sm font-semibold ${form.food_available === o.v ? "border-terra bg-terra/5" : "border-warm"}`}
                    data-testid={`food-${o.l}`}
                  >{o.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-overline">Internet</label>
              <input data-testid="internet-details" className="input-field mt-2" placeholder="e.g. 100 Mbps fiber included" value={form.internet_details} onChange={(e) => set("internet_details", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label-overline">Safety features</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SAFETY.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleArr("safety_features", a)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${form.safety_features.includes(a) ? "bg-olive-bg text-olive border-olive/40" : "bg-white text-forest-2 border-warm"}`}
                  data-testid={`safety-${a}`}
                >{a}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-overline">Nearby places (comma-separated)</label>
            <input
              data-testid="nearby-input"
              className="input-field mt-2"
              placeholder="Metro station, IT park, hospital, school"
              onBlur={(e) => set("nearby_places", e.target.value.split(",").map(x => x.trim()).filter(Boolean))}
            />
          </div>

          <div>
            <label className="label-overline">House rules (one per line)</label>
            <textarea
              data-testid="rules-input"
              rows={3} className="input-field mt-2"
              placeholder="No smoking&#10;No pets"
              onBlur={(e) => set("house_rules", e.target.value.split("\n").map(x => x.trim()).filter(Boolean))}
            />
          </div>

          <div className="flex justify-between pt-2">
            <button data-testid="list-prev-3" onClick={() => setStep(2)} className="btn-secondary"><ChevronLeft size={16} /> Back</button>
            <button data-testid="list-submit" onClick={submit} disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : null} Submit listing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
