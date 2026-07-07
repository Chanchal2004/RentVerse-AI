import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Upload, Loader2, ChevronLeft } from "lucide-react";
import { fileUrl } from "../lib/api";
import { useAuth } from "../lib/auth";

const DOCS = [
  { v: "aadhaar", l: "Aadhaar" },
  { v: "pan", l: "PAN Card" },
  { v: "driving_license", l: "Driving License" },
];

export default function KycFlow() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({
    document_type: "aadhaar",
    id_document_url: "",
    selfie_url: "",
    ownership_proof_url: "",
    full_name_on_document: "",
  });
  const [busy, setBusy] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/kyc/me").then(({ data }) => {
      if (data.status && data.status !== "not_submitted") setExisting(data);
    });
  }, []);

  const uploadOne = async (key, file) => {
    setBusy((b) => ({ ...b, [key]: true }));
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/uploads?folder=kyc", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, [key]: data.storage_path }));
      toast.success("Uploaded");
    } catch (e) { toast.error("Upload failed"); }
    setBusy((b) => ({ ...b, [key]: false }));
  };

  const submit = async () => {
    if (!form.id_document_url || !form.selfie_url || !form.full_name_on_document) {
      toast.error("Upload ID + selfie and enter name");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/kyc/submit", form);
      toast.success("KYC submitted. Our team will review shortly.");
      await refresh();
      nav("/dashboard/owner");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    setSubmitting(false);
  };

  if (existing) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6">
        <Link to="/dashboard/owner" className="inline-flex items-center gap-1 text-forest-2 mb-4 text-sm"><ChevronLeft size={16} /> Back</Link>
        <h1 className="text-4xl font-black text-forest mb-4">KYC Status</h1>
        <div className="rounded-xl border border-warm bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="text-olive" />
            <div className="text-lg font-semibold">Status: <span className={`pill pill-${existing.status}`}>{existing.status}</span></div>
          </div>
          <p className="text-forest-2 text-sm">Submitted: {new Date(existing.submitted_at).toLocaleString("en-IN")}</p>
          {existing.reviewer_note && <p className="mt-3 text-forest-2">Reviewer note: {existing.reviewer_note}</p>}
          {existing.status === "rejected" && (
            <button className="btn-primary mt-4" data-testid="kyc-resubmit" onClick={() => setExisting(null)}>Resubmit KYC</button>
          )}
        </div>
      </div>
    );
  }

  const UploadBox = ({ k, label, testid }) => (
    <div>
      <label className="label-overline">{label}</label>
      <label className="mt-2 block border-2 border-dashed border-warm rounded-xl p-6 text-center cursor-pointer hover:bg-bone">
        {form[k] ? (
          <img src={fileUrl(form[k])} className="mx-auto h-32 object-contain rounded" alt="" />
        ) : (
          <div>
            <Upload className="mx-auto text-forest-2 mb-1" />
            <div className="text-sm text-forest-2">Click to upload</div>
          </div>
        )}
        <input data-testid={testid} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files[0] && uploadOne(k, e.target.files[0])} />
      </label>
      {busy[k] && <div className="text-xs text-forest-2 mt-1 flex items-center gap-1"><Loader2 size={12} className="animate-spin" />Uploading…</div>}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <Link to={user?.role === "owner" ? "/dashboard/owner" : "/dashboard/tenant"} className="inline-flex items-center gap-1 text-forest-2 mb-4 text-sm">
        <ChevronLeft size={16} /> Back
      </Link>
      <h1 className="text-4xl font-black text-forest">Owner KYC</h1>
      <p className="text-forest-2 mt-2 mb-8">Verify once. Get a "KYC Verified" badge on all your listings — 3× more tenant enquiries.</p>

      <div className="space-y-6 bg-white border border-warm rounded-xl p-6">
        <div>
          <label className="label-overline">Document type *</label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {DOCS.map((d) => (
              <button
                key={d.v} type="button"
                data-testid={`doc-${d.v}`}
                onClick={() => setForm({ ...form, document_type: d.v })}
                className={`p-3 rounded-lg border text-sm font-semibold ${form.document_type === d.v ? "border-terra bg-terra/5" : "border-warm"}`}
              >{d.l}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-overline">Full name on document *</label>
          <input data-testid="kyc-name" className="input-field mt-1" value={form.full_name_on_document} onChange={(e) => setForm({ ...form, full_name_on_document: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UploadBox k="id_document_url" label="ID Document *" testid="upload-id" />
          <UploadBox k="selfie_url" label="Selfie holding ID *" testid="upload-selfie" />
        </div>
        <UploadBox k="ownership_proof_url" label="Ownership proof (optional)" testid="upload-proof" />

        <button data-testid="kyc-submit" onClick={submit} disabled={submitting} className="btn-primary w-full justify-center">
          {submitting ? <Loader2 className="animate-spin" size={16} /> : null} Submit for verification
        </button>
      </div>
    </div>
  );
}
