import "@/App.css";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import RequireAuth from "@/components/RequireAuth";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import PropertyDetail from "@/pages/PropertyDetail";
import ListProperty from "@/pages/ListProperty";
import KycFlow from "@/pages/KycFlow";
import DashboardTenant from "@/pages/DashboardTenant";
import DashboardOwner from "@/pages/DashboardOwner";
import AdminPanel from "@/pages/AdminPanel";
import Pricing from "@/pages/Pricing";

function Shell() {
  return (
    <>
      <Navbar />
      <main className="min-h-[70vh]"><Outlet /></main>
      <footer className="border-t border-warm bg-white mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-forest-2 text-sm flex flex-wrap gap-4 justify-between">
          <div>© {new Date().getFullYear()} Rentily · Rent without the broker.</div>
          <div className="flex gap-4">
            <a href="/pricing" className="hover:text-forest">Premium</a>
            <a href="/list-property" className="hover:text-forest">List a property</a>
          </div>
        </div>
      </footer>
    </>
  );
}

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-forest-2">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "owner") return <Navigate to="/dashboard/owner" replace />;
  return <Navigate to="/dashboard/tenant" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/list-property" element={<RequireAuth roles={["owner", "admin"]}><ListProperty /></RequireAuth>} />
            <Route path="/kyc" element={<RequireAuth><KycFlow /></RequireAuth>} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/dashboard/tenant" element={<RequireAuth roles={["tenant"]}><DashboardTenant /></RequireAuth>} />
            <Route path="/dashboard/owner" element={<RequireAuth roles={["owner"]}><DashboardOwner /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth roles={["admin"]}><AdminPanel /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
