import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-forest-2">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
