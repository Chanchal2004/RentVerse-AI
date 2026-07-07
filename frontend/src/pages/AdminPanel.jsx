import { useEffect, useState } from "react";
import { api, fileUrl } from "../lib/api";
import { toast } from "sonner";
import { ShieldCheck, Users, IndianRupee, Home, X } from "lucide-react";

export default function AdminPanel() {
  const [tab, setTab] = useState("properties");
  const [stats, setStats] = useState(null);
  const [props, setProps] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [kycs, setKycs] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [preview, setPreview] = useState(null);

  const loadStats = () => api.get("/admin/stats").then(({ data }) => setStats(data));
  const loadProps = (s) => api.get("/admin/properties", { params: { status: s } }).then(({ data }) => setProps(data));
  const loadKyc = () => api.get("/admin/kyc").then(({ data }) => setKycs(data));
  const loadUsers = () => api.get("/admin/users").then(({ data }) => setUsers(data));
  const loadPayments = () => api.get("/admin/payments").then(({ data }) => setPayments(data));

  useEffect(() => { loadStats(); }, []);
  useEffect(() => {
    if (tab === "properties") loadProps(statusFilter);
    if (tab === "kyc") loadKyc();
    if (tab === "users") loadUsers();
    if (tab === "payments") loadPayments();
  }, [tab, statusFilter]);

  const propAction = async (id, action, note) => {
    try {
      await api.post(`/admin/properties/${id}/action`, { action, note });
      toast.success("Done");
      loadProps(statusFilter); loadStats();
    } catch (e) { toast.error("Failed"); }
  };
  const kycAction = async (id, action, note) => {
    try {
      await api.post(`/admin/kyc/${id}/action`, { action, note });
      toast.success("Done");
      loadKyc(); loadStats();
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-4xl font-black text-forest">Admin Control Room</h1>
      <p className="text-forest-2 mb-6">Oversee listings, KYC, users and payments.</p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <StatCard icon={<Home size={16} />} label="Pending" value={stats.properties.pending} tone="pending" />
          <StatCard icon={<Home size={16} />} label="Approved" value={stats.properties.approved} tone="approved" />
          <StatCard icon={<ShieldCheck size={16} />} label="KYC Pending" value={stats.kyc_pending} tone="pending" />
          <StatCard icon={<Users size={16} />} label="Users" value={stats.users} tone="info" />
          <StatCard icon={<IndianRupee size={16} />} label="Revenue" value={`₹${(stats.revenue_paise / 100).toLocaleString("en-IN")}`} tone="approved" />
        </div>
      )}

      <div className="flex gap-1 border-b border-warm mb-6">
        {["properties", "kyc", "users", "payments"].map((t) => (
          <button
            key={t}
            data-testid={`admin-tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-semibold capitalize ${tab === t ? "border-b-2 border-terra text-forest" : "text-forest-2"}`}
          >{t}</button>
        ))}
      </div>

      {tab === "properties" && (
        <div>
          <div className="flex gap-2 mb-4">
            {["pending", "approved", "rejected", "suspended", "needs_info"].map((s) => (
              <button
                key={s}
                data-testid={`filter-${s}`}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-sm border ${statusFilter === s ? "bg-forest text-white border-forest" : "bg-white text-forest-2 border-warm"}`}
              >{s.replace("_", " ")}</button>
            ))}
          </div>
          <div className="space-y-3">
            {props.map((p) => (
              <div key={p.id} className="rounded-xl border border-warm bg-white p-4 flex gap-4" data-testid={`admin-prop-${p.id}`}>
                <img src={fileUrl(p.photos?.[0])} alt="" className="w-32 h-24 object-cover rounded-lg bg-gray-100" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`pill pill-${p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "pending"}`}>{p.status}</span>
                    <span className="text-xs text-forest-2">by {p.owner_name}</span>
                    {p.owner_kyc_status === "approved" && <span className="pill pill-approved">KYC OK</span>}
                  </div>
                  <div className="font-semibold text-forest">{p.title}</div>
                  <div className="text-sm text-forest-2">{p.city} · ₹{p.monthly_rent.toLocaleString("en-IN")}/mo · {p.rooms} BHK · {p.furnishing}</div>
                  {p.ai_verdict && (
                    <div className="text-xs text-forest-2 mt-1">
                      AI: <b>{p.ai_verdict.verdict}</b> ({(p.ai_verdict.confidence * 100).toFixed(0)}%) — {p.ai_verdict.reasons?.join("; ")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setPreview(p)} className="btn-secondary text-sm py-1.5" data-testid={`admin-view-${p.id}`}>View</button>
                  <button onClick={() => propAction(p.id, "approve")} className="btn-primary text-sm py-1.5" data-testid={`admin-approve-${p.id}`}>Approve</button>
                  <button onClick={() => propAction(p.id, "reject", prompt("Reason?") || "")} className="btn-secondary text-sm py-1.5 !text-danger !border-danger/40" data-testid={`admin-reject-${p.id}`}>Reject</button>
                  <button onClick={() => propAction(p.id, "suspend", prompt("Reason?") || "")} className="btn-secondary text-sm py-1.5" data-testid={`admin-suspend-${p.id}`}>Suspend</button>
                  <button onClick={() => propAction(p.id, "request_info", prompt("What info?") || "")} className="btn-secondary text-sm py-1.5" data-testid={`admin-info-${p.id}`}>Ask info</button>
                </div>
              </div>
            ))}
            {props.length === 0 && <div className="text-forest-2 text-center py-10">No listings.</div>}
          </div>
        </div>
      )}

      {tab === "kyc" && (
        <div className="space-y-3">
          {kycs.map((k) => (
            <div key={k.id} className="rounded-xl border border-warm bg-white p-4 flex gap-4" data-testid={`admin-kyc-${k.id}`}>
              <img src={fileUrl(k.id_document_url)} alt="" className="w-32 h-24 object-cover rounded-lg bg-gray-100" />
              <img src={fileUrl(k.selfie_url)} alt="" className="w-24 h-24 object-cover rounded-lg bg-gray-100" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`pill pill-${k.status}`}>{k.status}</span>
                  <span className="text-xs text-forest-2">{k.document_type}</span>
                </div>
                <div className="font-semibold text-forest">{k.full_name_on_document}</div>
                <div className="text-sm text-forest-2">{k.user_email}</div>
              </div>
              {k.status === "pending" && (
                <div className="flex flex-col gap-2">
                  <button onClick={() => kycAction(k.id, "approve")} className="btn-primary text-sm py-1.5" data-testid={`kyc-approve-${k.id}`}>Approve</button>
                  <button onClick={() => kycAction(k.id, "reject", prompt("Reason?") || "")} className="btn-secondary text-sm py-1.5" data-testid={`kyc-reject-${k.id}`}>Reject</button>
                </div>
              )}
            </div>
          ))}
          {kycs.length === 0 && <div className="text-forest-2 text-center py-10">No KYC submissions.</div>}
        </div>
      )}

      {tab === "users" && (
        <div className="rounded-xl border border-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bone">
              <tr className="text-left">
                <th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">KYC</th><th className="p-3">Premium</th><th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-warm">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3 text-forest-2">{u.email}</td>
                  <td className="p-3"><span className="pill pill-info">{u.role}</span></td>
                  <td className="p-3"><span className={`pill pill-${u.kyc_status === "approved" ? "approved" : "pending"}`}>{u.kyc_status}</span></td>
                  <td className="p-3">{u.is_premium ? "Yes" : "—"}</td>
                  <td className="p-3 text-forest-2">{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "payments" && (
        <div className="rounded-xl border border-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bone">
              <tr className="text-left"><th className="p-3">Purpose</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Order ID</th><th className="p-3">User</th><th className="p-3">When</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-warm">
                  <td className="p-3">{p.purpose} {p.plan ? `(${p.plan})` : ""}</td>
                  <td className="p-3">₹{(p.amount / 100).toLocaleString("en-IN")}</td>
                  <td className="p-3"><span className={`pill pill-${p.status === "paid" ? "approved" : "pending"}`}>{p.status}</span></td>
                  <td className="p-3 text-xs font-mono text-forest-2">{p.razorpay_order_id}</td>
                  <td className="p-3 text-forest-2">{p.user_id.slice(0, 8)}</td>
                  <td className="p-3 text-forest-2">{new Date(p.created_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="text-2xl font-bold">{preview.title}</h3>
              <button onClick={() => setPreview(null)}><X /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(preview.photos || []).map((p, i) => <img key={i} src={fileUrl(p)} alt="" className="w-full h-24 object-cover rounded" />)}
            </div>
            <p className="text-forest-2 whitespace-pre-line mb-4">{preview.description}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><b>Type:</b> {preview.property_type}</div>
              <div><b>City:</b> {preview.city}</div>
              <div><b>Rent:</b> ₹{preview.monthly_rent}</div>
              <div><b>Deposit:</b> ₹{preview.security_deposit}</div>
              <div><b>Rooms:</b> {preview.rooms}</div>
              <div><b>Furnishing:</b> {preview.furnishing}</div>
              <div className="col-span-2"><b>Address:</b> {preview.address}</div>
              <div className="col-span-2"><b>Contact:</b> {preview.contact_phone} · {preview.contact_email}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-warm bg-white p-4">
      <div className={`text-xs uppercase tracking-wider font-bold text-forest-2 flex items-center gap-1`}>{icon} {label}</div>
      <div className="text-2xl font-black text-forest mt-1">{value}</div>
    </div>
  );
}
