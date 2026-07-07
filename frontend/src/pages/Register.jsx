import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, User, Home } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState("tenant");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register({ ...form, role });
      toast.success("Account created");
      nav(u.role === "owner" ? "/kyc" : "/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-6">
      <h1 className="text-4xl font-black tracking-tight mb-2 text-forest">Create your account</h1>
      <p className="text-forest-2 mb-8">Rent smarter, list faster.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          data-testid="role-tenant"
          type="button"
          onClick={() => setRole("tenant")}
          className={`p-4 rounded-xl border text-left ${role === "tenant" ? "border-terra bg-white shadow-sm" : "border-warm bg-white/50"}`}
        >
          <User size={20} className="mb-2 text-forest" />
          <div className="font-semibold text-forest">I'm a Tenant</div>
          <div className="text-xs text-forest-2">Looking for a home</div>
        </button>
        <button
          data-testid="role-owner"
          type="button"
          onClick={() => setRole("owner")}
          className={`p-4 rounded-xl border text-left ${role === "owner" ? "border-terra bg-white shadow-sm" : "border-warm bg-white/50"}`}
        >
          <Home size={20} className="mb-2 text-forest" />
          <div className="font-semibold text-forest">I'm an Owner</div>
          <div className="text-xs text-forest-2">Listing a property</div>
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label-overline block mb-1">Full name</label>
          <input data-testid="reg-name" required className="input-field" value={form.name} onChange={on("name")} />
        </div>
        <div>
          <label className="label-overline block mb-1">Email</label>
          <input data-testid="reg-email" type="email" required className="input-field" value={form.email} onChange={on("email")} />
        </div>
        <div>
          <label className="label-overline block mb-1">Phone</label>
          <input data-testid="reg-phone" className="input-field" value={form.phone} onChange={on("phone")} />
        </div>
        <div>
          <label className="label-overline block mb-1">Password</label>
          <input data-testid="reg-password" type="password" required minLength={6} className="input-field" value={form.password} onChange={on("password")} />
        </div>
        <button data-testid="reg-submit" type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="animate-spin" size={16} /> : null} Create account
        </button>
      </form>
      <p className="mt-6 text-forest-2 text-sm">
        Already have an account? <Link to="/login" data-testid="login-link" className="text-terra font-semibold">Log in</Link>
      </p>
    </div>
  );
}
