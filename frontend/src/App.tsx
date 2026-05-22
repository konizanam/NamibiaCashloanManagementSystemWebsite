import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/Layout';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Features } from './pages/Features';
import { Pricing } from './pages/Pricing';
import { Contact } from './pages/Contact';
import { Apply } from './pages/Apply';
import { ApplyEdit } from './pages/ApplyEdit';
import { ApplySuccess } from './pages/ApplySuccess';
import { Login } from './pages/Login';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminApplications } from './pages/admin/AdminApplications';
import { AdminApplicationDetail } from './pages/admin/AdminApplicationDetail';
import { AdminMarketingAgents } from './pages/admin/AdminMarketingAgents';
import { AdminCommissions } from './pages/admin/AdminCommissions';
import { AgentLayout } from './pages/agent/AgentLayout';
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { AgentCommissions } from './pages/agent/AgentCommissions';
import { AgentMicrolenders } from './pages/agent/AgentMicrolenders';
import { AgentApplications } from './pages/agent/AgentApplications';
import { MicrolenderPortal } from './pages/microlender/MicrolenderPortal';
import { useAuth } from './context/AuthContext';
import type { Role } from './api/types';
import type { ReactNode } from 'react';
import { NotFound } from './pages/NotFound';

const RequireRole = ({ role, children }: { role: Role; children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    // Logged in but wrong role — bounce to their own home.
    const homes: Record<Role, string> = { admin: '/admin', marketing_agent: '/agent', microlender: '/' };
    return <Navigate to={homes[user.role]} replace />;
  }
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
        <Route path="/apply/edit/:token" element={<ApplyEdit />} />
        <Route path="/apply/success" element={<ApplySuccess />} />
        <Route path="/login" element={<Login />} />
        {/* Legacy admin login URL */}
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="applications/:id" element={<AdminApplicationDetail />} />
        <Route path="marketing-agents" element={<AdminMarketingAgents />} />
        <Route path="commissions" element={<AdminCommissions />} />
      </Route>

      <Route
        path="/agent"
        element={
          <RequireRole role="marketing_agent">
            <AgentLayout />
          </RequireRole>
        }
      >
        <Route index element={<AgentDashboard />} />
        <Route path="commissions" element={<AgentCommissions />} />
        <Route path="microlenders" element={<AgentMicrolenders />} />
        <Route path="applications" element={<AgentApplications />} />
      </Route>

      <Route
        path="/portal"
        element={
          <RequireRole role="microlender">
            <MicrolenderPortal />
          </RequireRole>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
