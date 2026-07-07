import { useEffect, useState } from "react";
import { api, fileUrl } from "../lib/api";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Crown, Calendar, MessageCircle, KeyRound } from "lucide-react";

export default function DashboardTenant() {
  const { user } = useAuth();
  const [tab, setTab] = useState("unlocks");
  const [unlocks, setUnlocks] = useState([]);
  const [visits, setVisits] = useState([]);
  const [sub, setSub] = useState(null);

  useEffect(() => {
    api.get("/payments/my-unlocks").then(({ data }) => setUnlocks(data));
    api.get("/visits/my").then(({ data }) => setVisits(data));
    api.get("/payments/subscription").then(({ data }) => setSub(data));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-forest">Hey {user.name.split(" ")[0]}</h1>
          <p className="text-forest-2">Your saved contacts, visits, and premium status.</p>
        </div>
        {sub?.active ? (
          <span className="pill pill-approved"><Crown size={14} /> Premium · until {new Date(sub.premium_until).toLocaleDateString("en-IN")}</span>
        ) : (
          <Link to="/pricing" className="btn-primary" data-testid="upgrade-cta">
            <Crown size={16} /> Go Premium
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <aside className="md:col-span-3">
          <nav className="space-y-1">
            <SideBtn active={tab === "unlocks"} onClick={() => setTab("unlocks")} icon={<KeyRound size={16} />} label={`Unlocked (${unlocks.length})`} testid="tab-unlocks" />
            <SideBtn active={tab === "visits"} onClick={() => setTab("visits")} icon={<Calendar size={16} />} label={`Visit Requests (${visits.length})`} testid="tab-visits" />
            <SideBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageCircle size={16} />} label="Messages" testid="tab-chat" />
          </nav>
        </aside>

        <main className="md:col-span-9">
          {tab === "unlocks" && (
            <div className="space-y-3">
              {unlocks.length === 0 ? (
                <EmptyState title="No unlocks yet" body="Unlock a property's contact to see it here permanently." cta="Browse homes" to="/" />
              ) : (
                unlocks.map((u) => (
                  <div key={u.property.id} className="rounded-xl border border-warm bg-white p-4 flex items-center gap-4" data-testid={`unlock-row-${u.property.id}`}>
                    <img src={fileUrl(u.property.photos?.[0])} alt="" className="w-24 h-20 object-cover rounded-lg bg-gray-100" />
                    <div className="flex-1">
                      <Link to={`/properties/${u.property.id}`} className="font-semibold text-forest hover:underline">{u.property.title}</Link>
                      <div className="text-sm text-forest-2">{u.property.city} · ₹{u.property.monthly_rent.toLocaleString("en-IN")}/mo</div>
                      <div className="text-sm text-forest mt-1">📞 {u.property.contact_phone} {u.property.contact_email && `· ✉︎ ${u.property.contact_email}`}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "visits" && (
            <div className="space-y-3">
              {visits.length === 0 ? (
                <EmptyState title="No visits scheduled" body="Book a visit from a property page." />
              ) : (
                visits.map((v) => (
                  <div key={v.id} className="rounded-xl border border-warm bg-white p-4" data-testid={`visit-row-${v.id}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Link to={`/properties/${v.property_id}`} className="font-semibold text-forest hover:underline">{v.property_title}</Link>
                        <div className="text-sm text-forest-2">{new Date(v.requested_datetime).toLocaleString("en-IN")}</div>
                      </div>
                      <span className={`pill pill-${v.status === "confirmed" ? "approved" : v.status === "rejected" ? "rejected" : "pending"}`}>{v.status}</span>
                    </div>
                    {v.message && <p className="text-forest-2 text-sm mt-2">Your note: {v.message}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "chat" && <ChatList />}
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

function EmptyState({ title, body, cta, to }) {
  return (
    <div className="rounded-xl border border-dashed border-warm bg-white p-12 text-center">
      <div className="text-forest font-semibold">{title}</div>
      <div className="text-forest-2 text-sm mt-1 mb-4">{body}</div>
      {cta && <Link to={to} className="btn-primary inline-flex" data-testid="empty-cta">{cta}</Link>}
    </div>
  );
}

function ChatList() {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => { api.get("/chat/threads").then(({ data }) => setThreads(data)); }, []);
  useEffect(() => {
    if (!active) return;
    api.get(`/chat/thread/${active.other_user_id}`).then(({ data }) => setMessages(data));
  }, [active]);

  const send = async () => {
    if (!text.trim() || !active) return;
    await api.post("/chat/messages", { to_user_id: active.other_user_id, text, property_id: active.property_id });
    setText("");
    const { data } = await api.get(`/chat/thread/${active.other_user_id}`);
    setMessages(data);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px]">
      <div className="border border-warm rounded-xl bg-white p-3 overflow-y-auto">
        {threads.length === 0 && <div className="p-4 text-forest-2 text-sm text-center">No conversations yet.</div>}
        {threads.map((t) => (
          <button key={t.thread_id} onClick={() => setActive(t)} data-testid={`thread-${t.thread_id}`}
            className={`w-full text-left p-3 rounded-lg mb-1 ${active?.thread_id === t.thread_id ? "bg-bone" : "hover:bg-bone/50"}`}>
            <div className="font-semibold text-forest text-sm">{t.other_name}</div>
            <div className="text-xs text-forest-2 truncate">{t.last_message}</div>
          </button>
        ))}
      </div>
      <div className="md:col-span-2 border border-warm rounded-xl bg-white flex flex-col">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-forest-2 text-sm">Select a conversation</div>
        ) : (
          <>
            <div className="p-3 border-b border-warm font-semibold">{active.other_name}</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${m.from_user_id === active.other_user_id ? "bg-bone" : "bg-terra text-white ml-auto"}`}>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-warm flex gap-2">
              <input data-testid="chat-input" className="input-field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" onKeyDown={(e) => e.key === "Enter" && send()} />
              <button data-testid="chat-send" onClick={send} className="btn-primary">Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
