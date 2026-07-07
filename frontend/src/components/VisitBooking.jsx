import { useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function VisitBooking({ propertyId }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("11:00");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) { nav("/login"); return; }
    if (user.role !== "tenant") { toast.error("Only tenants can request visits"); return; }
    if (!date) { toast.error("Pick a date"); return; }
    setLoading(true);
    try {
      const iso = new Date(`${date}T${time}:00`).toISOString();
      await api.post("/visits", { property_id: propertyId, requested_datetime: iso, message });
      toast.success("Visit request sent to owner");
      setMessage(""); setDate("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to book");
    }
    setLoading(false);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="rounded-xl border border-warm bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon size={18} className="text-terra" />
        <h4 className="text-lg font-semibold text-forest">Schedule a visit</h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-overline mb-1 block">Date</label>
          <input
            type="date"
            data-testid="visit-date-input"
            className="input-field"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label-overline mb-1 block">Time</label>
          <input
            type="time"
            data-testid="visit-time-input"
            className="input-field"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
      <textarea
        data-testid="visit-message-input"
        className="input-field mt-3"
        rows={2}
        placeholder="Message to owner (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        data-testid="visit-book-button"
        onClick={submit}
        disabled={loading}
        className="btn-primary w-full mt-3 justify-center"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CalendarIcon size={16} />}
        Request visit
      </button>
    </div>
  );
}
