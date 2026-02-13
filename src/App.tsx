import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/theme-provider';
import MaintenanceScreen from './components/MaintenanceScreen';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/HomePage';
import AgentesPage from './pages/dashboard/AgentesPage';
import UbicacionesPage from './pages/dashboard/UbicacionesPage';
import ConsultasPage from './pages/dashboard/ConsultasPage';
import AnaliticasPage from './pages/dashboard/AnaliticasPage';
import EquipoPage from './pages/dashboard/EquipoPage';
import ConfiguracionPage from './pages/dashboard/ConfiguracionPage';
import KommoPage from './pages/dashboard/KommoPage';
import HubSpotPage from './pages/dashboard/HubSpotPage';
import TokensPage from './pages/dashboard/TokensPage';
import AdminPage from './pages/admin/AdminPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminTokensPage from './pages/admin/AdminTokensPage';
import AdminKommoPage from './pages/admin/AdminKommoPage';
import AdminWebhooksPage from './pages/admin/AdminWebhooksPage';
import AdminMetaCapiPage from './pages/admin/AdminMetaCapiPage';
import AdminClientsPage from './pages/admin/AdminClientsPage';
import AdminClientsNewPage from './pages/admin/AdminClientsNewPage';
import AdminClientsEditPage from './pages/admin/AdminClientsEditPage';
import AdminTestingPage from './pages/admin/AdminTestingPage';
import DashboardLayout from './components/DashboardLayout';

// Función para obtener el estado de mantenimiento
// TODO: Mover esto a una configuración del backend o variable de entorno
function getMaintenanceMode(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('maintenanceMode');
  return stored === 'true';
}

// Función para verificar si el usuario actual es admin (para permitir acceso durante mantenimiento)
function isAdminUser(): boolean {
  if (typeof window === 'undefined') return false;
  const role = localStorage.getItem('role') || 
    document.cookie
      .split('; ')
      .find(row => row.startsWith('role='))
      ?.split('=')[1];
  return role === 'SuperAdmin';
}

// Componente para proteger rutas durante mantenimiento
function MaintenanceRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkMaintenance = () => {
      const mode = getMaintenanceMode();
      const admin = isAdminUser();
      setMaintenanceMode(mode);
      setIsAdmin(admin);
    };

    // Verificar inmediatamente al montar y cuando cambie la ruta
    checkMaintenance();
    
    // Verificar periódicamente para cambios en localStorage/cookies
    const interval = setInterval(checkMaintenance, 300);
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'maintenanceMode' || e.key === 'role') {
        checkMaintenance();
      }
    };
    
    // Escuchar cambios en localStorage desde otras pestañas
    window.addEventListener('storage', handleStorageChange);
    
    // Escuchar cambios en localStorage desde la misma pestaña
    const handleCustomStorageChange = () => {
      checkMaintenance();
    };
    window.addEventListener('maintenanceModeChanged', handleCustomStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('maintenanceModeChanged', handleCustomStorageChange);
    };
  }, [location.pathname]); // Agregar location.pathname como dependencia

  // Si está en modo mantenimiento
  if (maintenanceMode) {
    // Si es admin, permitir acceso a TODAS las rutas
    if (isAdmin) {
      return <>{children}</>;
    }
    
    // Para usuarios no-admin, mostrar pantalla de mantenimiento en TODAS las rutas (incluyendo /login)
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <MaintenanceRoute>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            {/* Raíz: siempre redirigir a login para que la URL por defecto sea /login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Dashboard Routes */}
            <Route path="/home" element={<DashboardLayout><HomePage /></DashboardLayout>} />
            <Route path="/agentes" element={<DashboardLayout><AgentesPage /></DashboardLayout>} />
            <Route path="/ubicaciones" element={<DashboardLayout><UbicacionesPage /></DashboardLayout>} />
            <Route path="/consultas" element={<DashboardLayout><ConsultasPage /></DashboardLayout>} />
            <Route path="/analiticas" element={<DashboardLayout><AnaliticasPage /></DashboardLayout>} />
            <Route path="/equipo" element={<DashboardLayout><EquipoPage /></DashboardLayout>} />
            <Route path="/configuracion" element={<DashboardLayout><ConfiguracionPage /></DashboardLayout>} />
            <Route path="/kommo" element={<DashboardLayout><KommoPage /></DashboardLayout>} />
            <Route path="/kommo/:accountIndex" element={<DashboardLayout><KommoPage /></DashboardLayout>} />
            <Route path="/hubspot" element={<DashboardLayout><HubSpotPage /></DashboardLayout>} />
            <Route path="/tokens" element={<DashboardLayout><TokensPage /></DashboardLayout>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<DashboardLayout><AdminPage /></DashboardLayout>} />
            <Route path="/admin/users" element={<DashboardLayout><AdminUsersPage /></DashboardLayout>} />
            <Route path="/admin/tokens" element={<DashboardLayout><AdminTokensPage /></DashboardLayout>} />
            <Route path="/admin/kommo" element={<DashboardLayout><AdminKommoPage /></DashboardLayout>} />
            <Route path="/admin/webhooks" element={<DashboardLayout><AdminWebhooksPage /></DashboardLayout>} />
            <Route path="/admin/meta-capi" element={<DashboardLayout><AdminMetaCapiPage /></DashboardLayout>} />
            <Route path="/admin/clients" element={<DashboardLayout><AdminClientsPage /></DashboardLayout>} />
            <Route path="/admin/clients/new" element={<DashboardLayout><AdminClientsNewPage /></DashboardLayout>} />
            <Route path="/admin/clients/:id" element={<DashboardLayout><AdminClientsEditPage /></DashboardLayout>} />
            <Route path="/admin/testing" element={<DashboardLayout><AdminTestingPage /></DashboardLayout>} />
          </Routes>
        </MaintenanceRoute>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
