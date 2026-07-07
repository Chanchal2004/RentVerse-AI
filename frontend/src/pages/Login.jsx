import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success("Welcome back");
      nav(u.role === "admin" ? "/admin" : u.role === "owner" ? "/dashboard/owner" : "/dashboard/tenant");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto py-24 px-6">
      <h1 className="text-4xl font-black tracking-tight mb-2 text-forest">Welcome back</h1>
      <p className="text-forest-2 mb-8">Log in to continue your home search.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label-overline block mb-1">Email</label>
          <input data-testid="login-email" type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label-overline block mb-1">Password</label>
          <input data-testid="login-password" type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button data-testid="login-submit" type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="animate-spin" size={16} /> : null} Log in
        </button>
      </form>
      <p className="mt-6 text-forest-2 text-sm">
        New here? <Link to="/register" data-testid="register-link" className="text-terra font-semibold">Create an account</Link>
      </p>
    </div>
  );
}
