import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginScreen } from './screens/LoginScreen';
import { InitialSetupScreen } from './screens/InitialSetupScreen';
import { AdminDashboard } from './screens/AdminDashboard';
import { SupervisorDashboard } from './screens/SupervisorDashboard';
import { AddWorkerScreen } from './screens/AddWorkerScreen';
import { AttendanceScannerScreen } from './screens/AttendanceScannerScreen';
import { WorkerDirectoryScreen } from './screens/WorkerDirectoryScreen';
import { AdminReviewScreen } from './screens/AdminReviewScreen';
import { SyncCenterScreen } from './screens/SyncCenterScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { UserManagementScreen } from './screens/UserManagementScreen';
import { dbService } from './services/dbService';
import { authService } from './services/authService';

function App() {
  const [role, setRole] = useState<'guest' | 'admin' | 'supervisor'>('guest');
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<{ user_id: string; username: string; role: string } | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');
        await dbService.init();
        console.log('Database initialized');

        // Check if there's a saved session
        const savedSession = localStorage.getItem('auth_session');
        if (savedSession) {
          console.log('Found saved session');
          const session = JSON.parse(savedSession);
          const user = await dbService.getUser(session.user_id);
          
          if (user && user.is_active) {
            setRole(user.role as 'admin' | 'supervisor');
            setCurrentUser({
              user_id: user.user_id,
              username: user.username,
              role: user.role
            });
            setIsLoading(false);
            return;
          }
        }

        // Check if there are any admin users
        const adminUsers = await dbService.getAllAdminUsers();
        console.log('Admin users found:', adminUsers.length);
        if (adminUsers.length === 0) {
          setSetupRequired(true);
        }

        setIsLoading(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Failed to initialize app:', errorMsg);
        setInitError(errorMsg);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleLogin = (selectedRole: 'admin' | 'supervisor') => {
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setRole(selectedRole);
      setCurrentUser({
        user_id: session.user_id,
        username: session.username,
        role: selectedRole
      });
      setCurrentScreen('dashboard');
    }
  };

  const handleSetupComplete = (selectedRole: 'admin' | 'supervisor') => {
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setRole(selectedRole);
      setCurrentUser({
        user_id: session.user_id,
        username: session.username,
        role: selectedRole
      });
      setCurrentScreen('dashboard');
      setSetupRequired(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_session');
    authService.logout();
    setRole('guest');
    setCurrentUser(null);
    setCurrentScreen('dashboard');
  };

  // Error state - show error message
  if (initError) {
    return (
      <Layout role="guest" onLogout={handleLogout}>
        <div className="flex-grow flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg max-w-md">
            <h2 className="text-lg font-bold text-red-900 mb-2">Initialization Error</h2>
            <p className="text-red-700 text-sm mb-4">{initError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout role="guest" onLogout={handleLogout}>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block bg-primary-fixed border border-primary/10 p-4 rounded-3xl shadow-sm">
              <span className="material-symbols-outlined text-primary text-5xl font-bold select-none animate-pulse">
                security
              </span>
            </div>
            <p className="text-on-surface-variant">Initializing...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (setupRequired) {
    return (
      <Layout role="guest" onLogout={handleLogout}>
        <InitialSetupScreen onSetupComplete={handleSetupComplete} />
      </Layout>
    );
  }

  if (role === 'guest') {
    return (
      <Layout role="guest" onLogout={handleLogout}>
        <LoginScreen onLoginSuccess={handleLogin} />
      </Layout>
    );
  }

  // Active Screen Selector
  const renderScreen = () => {
    if (role === 'admin') {
      switch (currentScreen) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setCurrentScreen} />;
        case 'add_worker':
          return <AddWorkerScreen onBack={() => setCurrentScreen('dashboard')} />;
        case 'worker_directory':
          return <WorkerDirectoryScreen onBack={() => setCurrentScreen('dashboard')} />;
        case 'admin_review':
          return <AdminReviewScreen onBack={() => setCurrentScreen('dashboard')} />;
        case 'sync_center':
          return <SyncCenterScreen onBack={() => setCurrentScreen('dashboard')} />;
        case 'settings':
          return <SettingsScreen onBack={() => setCurrentScreen('dashboard')} />;
        case 'user_management':
          return currentUser ? <UserManagementScreen onBack={() => setCurrentScreen('dashboard')} currentUser={currentUser} /> : <AdminDashboard onNavigate={setCurrentScreen} />;
        default:
          return <AdminDashboard onNavigate={setCurrentScreen} />;
      }
    } else { // supervisor
      switch (currentScreen) {
        case 'dashboard':
          return <SupervisorDashboard onNavigate={setCurrentScreen} />;
        case 'attendance_scanner':
          return <AttendanceScannerScreen onBack={() => setCurrentScreen('dashboard')} />;
        case 'worker_directory':
          return <WorkerDirectoryScreen onBack={() => setCurrentScreen('dashboard')} />;
        case 'settings':
          return <SettingsScreen onBack={() => setCurrentScreen('dashboard')} />;
        default:
          return <SupervisorDashboard onNavigate={setCurrentScreen} />;
      }
    }
  };

  return (
    <Layout
      role={role}
      onLogout={handleLogout}
      onNavigate={setCurrentScreen}
      activeScreen={currentScreen}
      currentUser={currentUser}
    >
      {renderScreen()}
    </Layout>
  );
}

export default App;
