import { useEffect, useState } from "react";
import { api, fileUrl } from "../lib/api";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Home, Calendar, ShieldCheck, PlusCircle } from "lucide-react";
import { toast } from "sonner";

export default function DashboardOwner() {
  const { user } = useAuth();
  const [tab, setTab] = useState("props");
  const [props, setProps] = useState([]);
  const [visits, setVisits] = useState([]);

  const load = () => {
    api.get(`/properties`, { params: { owner_id: user.id, limit: 100 } }).then(({ data }) => setProps(data.items));
    api.get("/visits/my").then(({ data }) => setVisits(data));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const actVisit = async (id, action) => {
    try {
      await api.patch(`/visits/${id}`, { action });
      toast.success("Updated");
      load();
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-4xl font-black text-forest">Owner Dashboard</h1>
          <p className="text-forest-2">Manage listings, visits, and KYC.</p>
        </div>
        <div className="flex gap-3">
          {user.kyc_status !== "approved" && (
            <Link to="/kyc" className="btn-secondary" data-testid="kyc-cta">
              <ShieldCheck size={16} /> {user.kyc_status === "pending" ? "KYC Pending" : "Complete KYC"}
            </Link>
          )}
          <Link to="/list-property" className="btn-primary" data-testid="new-listing-cta">
            <PlusCircle size={16} /> New listing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <aside className="md:col-span-3">
          <nav className="space-y-1">
            <SideBtn active={tab === "props"} onClick={() => setTab("props")} icon={<Home size={16} />} label={`My Properties (${props.length})`} testid="tab-props" />
            <SideBtn active={tab === "visits"} onClick={() => setTab("visits")} icon={<Calendar size={16} />} label={`Visit Requests (${visits.length})`} testid="tab-visits" />
            <SideBtn active={tab === "kyc"} onClick={() => setTab("kyc")} icon={<ShieldCheck size={16} />} label="KYC Status" testid="tab-kyc" />
          </nav>
        </aside>
        <main className="md:col-span-9">
          {tab === "props" && (
            <div className="space-y-3">
              {props.length === 0 ? (
                <div className="rounded-xl border border-dashed border-warm bg-white p-12 text-center">
                  <div className="font-semibold text-forest">No listings yet</div>
                  <div className="text-forest-2 text-sm mt-1 mb-4">Publish your first property in under 2 minutes.</div>
                  <Link to="/list-property" className="btn-primary inline-flex">New listing</Link>
                </div>
              ) : (
                props.map((p) => (
                  <div key={p.id} className="rounded-xl border border-warm bg-white p-4 flex items-center gap-4" data-testid={`owner-prop-${p.id}`}>
                    <img src={fileUrl(p.photos?.[0])} alt="" className="w-28 h-24 object-cover rounded-lg bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`pill pill-${p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : p.status === "suspended" ? "suspended" : p.status === "needs_info" ? "info" : "pending"}`}>{p.status.replace("_", " ")}</span>
                        {p.views > 0 && <span className="text-xs text-forest-2">{p.views} views</span>}
                      </div>
                      <Link to={`/properties/${p.id}`} className="font-semibold text-forest hover:underline">{p.title}</Link>
                      <div className="text-sm text-forest-2">{p.city} · ₹{p.monthly_rent.toLocaleString("en-IN")}/mo · {p.rooms} BHK</div>
                      {p.admin_note && <div className="text-xs text-danger mt-1">Admin note: {p.admin_note}</div>}
                      {p.ai_verdict?.reasons?.length > 0 && p.status === "pending" && (
                        <div className="text-xs text-forest-2 mt-1">AI notes: {p.ai_verdict.reasons.join("; ")}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "visits" && (
            <div className="space-y-3">
              {visits.length === 0 ? (
                <div className="rounded-xl border border-dashed border-warm bg-white p-12 text-center text-forest-2">No visit requests yet.</div>
              ) : (
                visits.map((v) => (
                  <div key={v.id} className="rounded-xl border border-warm bg-white p-4" data-testid={`visit-req-${v.id}`}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="font-semibold text-forest">{v.tenant_name}</div>
                        <div className="text-sm text-forest-2">Wants to visit <Link to={`/properties/${v.property_id}`} className="underline">{v.property_title}</Link></div>
                        <div className="text-sm text-forest mt-1">🗓 {new Date(v.requested_datetime).toLocaleString("en-IN")}</div>
                        {v.tenant_phone && <div className="text-sm text-forest-2">📞 {v.tenant_phone}</div>}
                        {v.message && <div className="text-sm text-forest-2 mt-1">"{v.message}"</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`pill pill-${v.status === "confirmed" ? "approved" : v.status === "rejected" ? "rejected" : v.status === "completed" ? "info" : "pending"}`}>{v.status}</span>
                      </div>
                    </div>
                    {v.status === "requested" && (
                      <div className="flex gap-2 mt-3">
                        <button className="btn-primary py-2 text-sm" data-testid={`visit-confirm-${v.id}`} onClick={() => actVisit(v.id, "confirm")}>Confirm</button>
                        <button className="btn-secondary py-2 text-sm" data-testid={`visit-reject-${v.id}`} onClick={() => actVisit(v.id, "reject")}>Decline</button>
                      </div>
                    )}
                    {v.status === "confirmed" && (
                      <button className="btn-secondary py-2 text-sm mt-3" data-testid={`visit-complete-${v.id}`} onClick={() => actVisit(v.id, "complete")}>Mark completed</button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "kyc" && (
            <div className="rounded-xl border border-warm bg-white p-6">
              <h3 className="text-xl font-semibold text-forest">KYC Verification</h3>
              <p className="text-forest-2 mt-2">Current status: <span className={`pill pill-${user.kyc_status === "approved" ? "approved" : user.kyc_status === "pending" ? "pending" : user.kyc_status === "rejected" ? "rejected" : "suspended"}`}>{user.kyc_status.replace("_", " ")}</span></p>
              <Link to="/kyc" className="btn-primary inline-flex mt-4" data-testid="kyc-manage">
                <ShieldCheck size={16} /> Manage KYC
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SideBtn({ active, icon, label, onClick, testid }) {
  return (
    <button data-testid={testid} onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${active ? "bg-white border border-warm text-forest" : "text-forest-2 hover:bg-white/50"}`}>
      {icon} {label}
    </button>
  );
}
