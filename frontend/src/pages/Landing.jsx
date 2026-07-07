import { useEffect, useState } from "react";
import { api } from "../lib/api";
import PropertyCard from "../components/PropertyCard";
import { Search, Sparkles, ShieldCheck, KeyRound, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai"];

export default function Landing() {
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [rooms, setRooms] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProps = async () => {
    setLoading(true);
    const params = {};
    if (city) params.city = city;
    if (q) params.q = q;
    if (maxRent) params.max_rent = Number(maxRent);
    if (rooms) params.rooms = Number(rooms);
    try {
      const { data } = await api.get("/properties", { params });
      setItems(data.items);
    } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchProps(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative section-pad">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <div className="label-overline mb-4">India · No brokerage · Verified owners</div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-none text-forest">
              Find a home,<br />not a hustle.
            </h1>
            <p className="mt-6 text-lg text-forest-2 max-w-lg leading-relaxed">
              Rentily connects tenants directly with KYC-verified owners. AI-screened listings, transparent unlocks, and scheduled visits — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link data-testid="hero-cta-search" to="#search" className="btn-primary">
                <Search size={16} /> Explore homes
              </Link>
              <Link data-testid="hero-cta-list" to="/register" className="btn-secondary">List your property</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-forest-2">
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-olive" /> KYC verified owners</div>
              <div className="flex items-center gap-2"><Sparkles size={16} className="text-terra" /> AI-screened listings</div>
              <div className="flex items-center gap-2"><Calendar size={16} className="text-forest" /> Visit scheduling</div>
            </div>
          </div>
          <div className="md:col-span-5 grid grid-cols-6 grid-rows-6 gap-3 h-[520px]">
            <img src="https://images.pexels.com/photos/9308434/pexels-photo-9308434.jpeg" alt="" className="col-span-4 row-span-4 rounded-xl object-cover w-full h-full" />
            <img src="https://images.pexels.com/photos/7148779/pexels-photo-7148779.jpeg" alt="" className="col-span-2 row-span-3 rounded-xl object-cover w-full h-full" />
            <img src="https://images.pexels.com/photos/8438253/pexels-photo-8438253.jpeg" alt="" className="col-span-2 row-span-3 rounded-xl object-cover w-full h-full" />
            <img src="https://images.unsplash.com/photo-1542559204-832ecc9bbb88" alt="" className="col-span-6 row-span-2 rounded-xl object-cover w-full h-full" />
          </div>
        </div>
      </section>

      {/* SEARCH */}
      <section id="search" className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="bg-white border border-warm rounded-2xl p-4 md:p-6 shadow-lg shadow-forest/5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="label-overline mb-1 block">City</label>
              <select
                data-testid="search-city"
                className="input-field"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">All cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="label-overline mb-1 block">Search</label>
              <input
                data-testid="search-query"
                className="input-field"
                placeholder="e.g. 2BHK near Koramangala"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label-overline mb-1 block">Max Rent</label>
              <input
                data-testid="search-max-rent"
                type="number"
                className="input-field"
                placeholder="₹"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
              />
            </div>
            <div className="md:col-span-1">
              <label className="label-overline mb-1 block">BHK</label>
              <select
                data-testid="search-bhk"
                className="input-field"
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
              >
                <option value="">Any</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                data-testid="search-submit"
                onClick={fetchProps}
                className="btn-primary w-full justify-center"
              >
                <Search size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-forest">Live listings</h2>
          <span className="text-forest-2 text-sm">{items.length} home{items.length !== 1 ? "s" : ""}</span>
        </div>
        {loading ? (
          <div className="text-forest-2">Loading properties…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-warm bg-white p-12 text-center text-forest-2">
            <div className="text-forest font-semibold mb-1">No properties match your filters yet.</div>
            <div className="text-sm">Try broadening your search — or be the first to list one!</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white border-y border-warm">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-forest mb-12 max-w-xl">
            Rent without brokers, dead-ends, or trust issues.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <ShieldCheck className="text-olive" size={24} />, title: "1. Verified owners", body: "Every owner submits KYC. Every listing is AI-screened before it appears — no fake homes." },
              { icon: <KeyRound className="text-terra" size={24} />, title: "2. Unlock only what you love", body: "Save free. Pay ₹29 to unlock owner contact for that home. Or go Premium for unlimited unlocks." },
              { icon: <Calendar className="text-forest" size={24} />, title: "3. Book visits inside the app", body: "Pick a slot. Owner confirms. Chat happens in-app — no midnight calls to strangers." },
            ].map((f, i) => (
              <div key={i} className="border border-warm rounded-xl p-6 bg-bone">
                <div className="w-12 h-12 rounded-lg bg-white border border-warm flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-forest-2 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
