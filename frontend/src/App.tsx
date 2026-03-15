import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/Layout/AppLayout';
import { authApi } from './api/endpoints';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import OrdersList from './pages/Orders/OrdersList';
import OrderCreate from './pages/Orders/OrderCreate'; 
import OrderDetail from './pages/Orders/OrderDetail';
import Financial from './pages/Financial';
import Courier from './pages/Courier';
import ReceptionistWorkflow from './pages/ReceptionistWorkflow';
import TechnicianWorkflow from './pages/TechnicianWorkflow';
import PathologistWorkflow from './pages/PathologistWorkflow';
import Receiving from './pages/Receiving';
import Histology from './pages/Histology';
import IHC from './pages/IHC';
import Cytology from './pages/Cytology';
import PathologistReview from './pages/PathologistReview';
import PathologistCaseView from './pages/PathologistCaseView';
import Reports from './pages/Reports';
import ReportsManagement from './pages/ReportsManagement';
import Inventory from './pages/Inventory';
import SampleDetail from './pages/Inventory/SampleDetail';
import WorkflowSelect from './pages/Workflow/WorkflowSelect';
import WorkflowExecute from './pages/Workflow/WorkflowExecute';
import WorkflowComplete from './pages/Workflow/WorkflowComplete';
import WorkflowHistory from './pages/Workflow/WorkflowHistory';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import BackendSettings from './pages/BackendSettings';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminDoctors from './pages/Admin/AdminDoctors';
import AdminTestTypes from './pages/Admin/AdminTestTypes';
import AdminWorkflowTemplates from './pages/Admin/AdminWorkflowTemplates';
import AdminSettings from './pages/Admin/AdminSettings';
import DoctorPortal from './pages/DoctorPortal';
import PlaceholderPage from './pages/PlaceholderPage';
import DigitalPathology from './pages/DigitalPathology';
import PatientPortal from './pages/PatientPortal';
import PatientPortalOrderDetail from './pages/PatientPortalOrderDetail';
import OrderOnline from './pages/OrderOnline';

function AuthLoader({ children }: { children: React.ReactNode }) {
  const { token, setAuth, clearAuth } = useAuthStore();
  const { data, isSuccess, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().then((r) => r.data),
    enabled: !!token,
    retry: false,
  });
  useEffect(() => {
    if (isSuccess && data) setAuth(data, token!);
    if (isError) clearAuth();
  }, [isSuccess, isError, data, token, setAuth, clearAuth]);
  return <>{children}</>;
}

function HomeOrApp() {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) {
    if (location.pathname !== '/') return <Navigate to="/" replace />;
    return <Landing />;
  }
  return (
    <ProtectedRoute>
      <AuthLoader>
        <AppLayout />
      </AuthLoader>
    </ProtectedRoute>
  );
}

export default function App() {
  useEffect(() => {
    const onUnauth = () => useAuthStore.getState().clearAuth();
    window.addEventListener('lims_unauthorized', onUnauth);
    return () => window.removeEventListener('lims_unauthorized', onUnauth);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/patient-portal" element={<PatientPortal />} />
      <Route path="/patient-portal/order/:orderId" element={<PatientPortalOrderDetail />} />
      <Route path="/order-online" element={<OrderOnline />} />
      <Route
        path="/*"
        element={<HomeOrApp />}
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<OrdersList />} />
        <Route path="orders/create" element={<OrderCreate />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="financial" element={<Financial />} />
        <Route path="courier" element={<Courier />} />
        <Route path="receptionist/workflow" element={<ReceptionistWorkflow />} />
        <Route path="technician/workflow" element={<TechnicianWorkflow />} />
        <Route path="pathologist/workflow" element={<PathologistWorkflow />} />
        <Route path="receiving" element={<Receiving />} />
        <Route path="histology" element={<Histology />} />
        <Route path="ihc" element={<IHC />} />
        <Route path="cytology" element={<Cytology />} />
        <Route path="digital-pathology" element={<DigitalPathology />} />
        <Route path="pathologist-review" element={<PathologistReview />} />
        <Route path="pathologist-review/:orderId" element={<PathologistCaseView />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports-management" element={<ReportsManagement />} />
        <Route path="doctor-portal" element={<DoctorPortal />} />
        <Route path="test-packages" element={<PlaceholderPage title="Test packages" />} />
        <Route path="backend-settings" element={<BackendSettings />} />
        <Route path="settings" element={<Settings />} />
        <Route path="archiving" element={<PlaceholderPage title="Archiving" />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="inventory/sample/:id" element={<SampleDetail />} />
        <Route path="workflow/select" element={<WorkflowSelect />} />
        <Route path="workflow/execute/:id" element={<WorkflowExecute />} />
        <Route path="workflow/complete/:id" element={<WorkflowComplete />} />
        <Route path="workflow/history" element={<WorkflowHistory />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="admin/doctors" element={<AdminDoctors />} />
        <Route path="admin/workflow-templates" element={<AdminWorkflowTemplates />} />
        <Route path="admin/settings" element={<AdminSettings />} />
        <Route path="admin/test-types" element={<AdminTestTypes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
