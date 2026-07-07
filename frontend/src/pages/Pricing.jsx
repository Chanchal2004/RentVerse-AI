import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Crown, Check, Loader2 } from "lucide-react";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const PLAN_META = {
  monthly: { title: "Monthly", price: 99, sub: "billed monthly", best: false },
  quarterly: { title: "Quarterly", price: 249, sub: "3 months · save 16%", best: true },
  yearly: { title: "Yearly", price: 799, sub: "12 months · save 33%", best: false },
};

export default function Pricing() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(null);
  const [sub, setSub] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api.get("/payments/config").then(({ data }) => setConfig(data));
    if (user) api.get("/payments/subscription").then(({ data }) => setSub(data));
  }, [user]);

  const buy = async (plan) => {
    if (!user) { nav("/login"); return; }
    setLoading(plan);
    try {
      const { data: order } = await api.post("/payments/order", { purpose: "premium", plan });
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("SDK failed");
      const rz = new window.Razorpay({
        key: order.key_id,
        amount: order.amount, currency: "INR", order_id: order.order_id,
        name: "Rentily Premium",
        description: `${PLAN_META[plan].title} plan`,
        prefill: { name: user.name, email: user.email, contact: user.phone || "" },
        theme: { color: "#D26955" },
        handler: async (resp) => {
          try {
            await api.post("/payments/verify", { ...resp, purpose: "premium", plan });
            toast.success("Welcome to Premium!");
            await refresh();
            nav("/dashboard/tenant");
          } catch { toast.error("Verification failed"); }
        },
        modal: { ondismiss: () => setLoading(null) },
      });
      rz.open();
    } catch (e) {
      if (e.response?.status === 503) toast.error("Payments not yet configured");
      else toast.error(e.response?.data?.detail || "Failed");
      setLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="label-overline mb-3">Premium</div>
        <h1 className="text-5xl font-black tracking-tight text-forest">Unlimited unlocks.<br />No limits, no wait.</h1>
        <p className="text-forest-2 mt-4 max-w-xl mx-auto">One subscription unlocks every property contact instantly — for the length of your plan.</p>
      </div>

      {!config?.configured && (
        <div className="mb-8 rounded-xl border border-warm bg-white p-4 text-forest-2 text-sm text-center">
          ⚠︎ Razorpay keys not yet configured by admin. You can still browse plans; checkout will activate once keys are added.
        </div>
      )}

      {sub?.active && (
        <div className="mb-8 rounded-xl border border-warm bg-olive-bg p-5 text-center" data-testid="active-sub-banner">
          <Crown className="inline text-olive" /> You're Premium until <b>{new Date(sub.premium_until).toLocaleDateString("en-IN")}</b>.
        </div>
      )}

      {/* Yearly hero */}
      <div className="rounded-2xl border border-warm bg-forest text-white p-8 mb-6 flex flex-col md:flex-row items-center justify-between gap-6" data-testid="plan-yearly-card">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-terra">Best value</div>
          <div className="text-4xl font-black mt-1">Yearly · ₹799</div>
          <div className="opacity-80 mt-1">12 months of unlimited unlocks · saves ₹389 vs monthly</div>
        </div>
        <button data-testid="buy-yearly" onClick={() => buy("yearly")} disabled={!!loading} className="btn-primary text-lg px-8 py-4">
          {loading === "yearly" ? <Loader2 className="animate-spin" size={16} /> : <Crown size={16} />} Go Premium Yearly
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {["monthly", "quarterly"].map((plan) => {
          const m = PLAN_META[plan];
          return (
            <div key={plan} className={`rounded-2xl border p-8 bg-white ${m.best ? "border-terra" : "border-warm"}`} data-testid={`plan-${plan}-card`}>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold text-forest">{m.title}</div>
                {m.best && <span className="pill pill-approved">Popular</span>}
              </div>
              <div className="text-4xl font-black text-forest mt-2">₹{m.price}</div>
              <div className="text-forest-2 text-sm">{m.sub}</div>
              <ul className="mt-6 space-y-2 text-sm text-forest-2">
                <li className="flex gap-2"><Check size={16} className="text-olive" /> Unlimited contact unlocks</li>
                <li className="flex gap-2"><Check size={16} className="text-olive" /> Priority visit slots</li>
                <li className="flex gap-2"><Check size={16} className="text-olive" /> Direct in-app chat with owners</li>
              </ul>
              <button data-testid={`buy-${plan}`} onClick={() => buy(plan)} disabled={!!loading} className="btn-primary w-full justify-center mt-6">
                {loading === plan ? <Loader2 className="animate-spin" size={16} /> : null} Get {m.title}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-center text-forest-2 text-sm">
        Or one-off unlock a single property for <b className="text-forest">₹29</b> — from any property page.
      </div>
    </div>
  );
}
