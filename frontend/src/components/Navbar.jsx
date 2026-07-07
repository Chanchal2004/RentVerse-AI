import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Home, LogOut, User, Shield, PlusCircle } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-warm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" data-testid="brand-home-link" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-forest text-white flex items-center justify-center">
            <Home size={18} />
          </div>
          <span className="text-xl font-black tracking-tight text-forest">Rentily</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-forest-2">
          <Link to="/" data-testid="nav-search" className="hover:text-forest">Search</Link>
          <Link to="/pricing" data-testid="nav-pricing" className="hover:text-forest">Premium</Link>
          {user?.role === "owner" && (
            <Link to="/list-property" data-testid="nav-list-property" className="hover:text-forest inline-flex items-center gap-1">
              <PlusCircle size={16} /> List Property
            </Link>
          )}
          {user?.role === "admin" && (
            <Link to="/admin" data-testid="nav-admin" className="hover:text-forest inline-flex items-center gap-1">
              <Shield size={16} /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                data-testid="nav-dashboard"
                to={user.role === "admin" ? "/admin" : user.role === "owner" ? "/dashboard/owner" : "/dashboard/tenant"}
                className="btn-secondary text-sm py-2"
              >
                <User size={16} className="inline mr-1" />
                {user.name.split(" ")[0]}
              </Link>
              <button
                data-testid="nav-logout"
                onClick={() => { logout(); nav("/"); }}
                className="text-forest-2 hover:text-forest"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link data-testid="nav-login" to="/login" className="btn-secondary text-sm py-2">Log in</Link>
              <Link data-testid="nav-register" to="/register" className="btn-primary text-sm py-2">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
