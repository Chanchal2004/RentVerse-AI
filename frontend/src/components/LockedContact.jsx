import { useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Lock, Unlock, Crown, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function LockedContact({ property, onUnlocked }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  if (property.contact_unlocked) {
    return (
      <div className="rounded-xl border border-warm bg-olive-bg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Unlock size={16} className="text-olive" />
          <span className="label-overline text-olive">Owner Contact</span>
        </div>
        <div className="text-forest font-semibold text-lg" data-testid="unlocked-contact-name">
          {property.owner_name}
        </div>
        {property.contact_phone && (
          <a
            href={`tel:${property.contact_phone}`}
            data-testid="unlocked-contact-phone"
            className="text-forest text-lg block mt-1"
          >
            📞 {property.contact_phone}
          </a>
        )}
        {property.contact_email && (
          <div className="text-forest-2 text-sm mt-1" data-testid="unlocked-contact-email">
            ✉︎ {property.contact_email}
          </div>
        )}
      </div>
    );
  }

  const handleUnlock = async () => {
    if (!user) { nav("/login"); return; }
    if (user.role !== "tenant") { toast.error("Only tenants can unlock contacts"); return; }
    setLoading(true);
    try {
      const { data: order } = await api.post("/payments/order", {
        purpose: "unlock",
        property_id: property.id,
      });
      const ok = await loadRazorpayScript();
      if (!ok) { toast.error("Failed to load payment SDK"); setLoading(false); return; }
      const rz = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "Rentily",
        description: `Unlock contact for ${property.title}`,
        prefill: { name: user.name, email: user.email, contact: user.phone || "" },
        theme: { color: "#D26955" },
        handler: async (resp) => {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              purpose: "unlock",
              property_id: property.id,
            });
            toast.success("Contact unlocked!");
            onUnlocked && onUnlocked();
          } catch (e) {
            toast.error("Payment verification failed");
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rz.open();
    } catch (e) {
      if (e.response?.status === 503) {
        toast.error("Payments not yet configured. Contact admin.");
      } else {
        toast.error(e.response?.data?.detail || "Failed to start payment");
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-warm bg-bone p-6 min-h-[180px]">
      {/* Placeholder content behind blur */}
      <div className="pointer-events-none select-none opacity-70">
        <div className="label-overline mb-2">Owner Contact</div>
        <div className="h-6 bg-forest/10 rounded w-2/3 mb-2" />
        <div className="h-5 bg-forest/10 rounded w-1/2" />
      </div>
      <div className="locked-blur">
        <Lock className="text-forest mb-2" size={28} />
        <div className="text-forest font-bold text-lg mb-1">Contact locked</div>
        <div className="text-forest-2 text-sm mb-3">Unlock owner phone & email</div>
        <button
          data-testid="unlock-contact-button"
          onClick={handleUnlock}
          disabled={loading}
          className="btn-dark"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
          Unlock for ₹29
        </button>
        <button
          data-testid="upgrade-premium-link"
          onClick={() => nav("/pricing")}
          className="mt-3 text-sm text-terra font-semibold inline-flex items-center gap-1"
        >
          <Crown size={14} /> Or go Premium — unlimited unlocks
        </button>
      </div>
    </div>
  );
}
