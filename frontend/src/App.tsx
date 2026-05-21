import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/Layout';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Features } from './pages/Features';
import { Pricing } from './pages/Pricing';
import { Contact } from './pages/Contact';
import { Apply } from './pages/Apply';
import { ApplySuccess } from './pages/ApplySuccess';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminApplications } from './pages/admin/AdminApplications';
import { AdminApplicationDetail } from './pages/admin/AdminApplicationDetail';
import { AdminMarketingAgents } from './pages/admin/AdminMarketingAgents';
import { useAuth } from './context/AuthContext';
import type { ReactNode } from 'react';
import { NotFound } from './pages/NotFound';

const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-slate-500">Loading…</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/apply/success" element={<ApplySuccess />} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="applications/:id" element={<AdminApplicationDetail />} />
        <Route path="marketing-agents" element={<AdminMarketingAgents />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
