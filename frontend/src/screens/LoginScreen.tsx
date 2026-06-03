import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { syncService } from '../services/syncService';

interface LoginScreenProps {
  onLoginSuccess: (role: 'admin' | 'supervisor') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalWorkers: 0, pendingSyncCount: 0 });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        await dbService.init();
        const workers = await dbService.getAllWorkers();
        const queue = await dbService.getSyncQueue();
        setStats({
          totalWorkers: workers.length,
          pendingSyncCount: queue.length
        });
      } catch (e) {
        console.error('Failed to load database stats for login screen:', e);
      }
    };

    loadStats();
    
    // Listen for sync updates to refresh stats
    const unsubscribe = syncService.subscribe(loadStats);
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (!username || !password) {
        throw new Error('Please enter username and password');
      }

      await dbService.init();

      // Get user from database
      const user = await dbService.getUserByUsername(username);
      if (!user) {
        throw new Error('Invalid username or password');
      }

      // Authenticate
      const session = await authService.authenticateUser(username, password, user);
      if (!session) {
        throw new Error('Invalid username or password');
      }

      // Store session in localStorage
      localStorage.setItem('auth_session', JSON.stringify(session));

      // Call success handler
      onLoginSuccess(user.role as 'admin' | 'supervisor');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Login failed');
      setPassword('');
      
      // Shake animation
      const container = document.getElementById('login-form');
      if (container) {
        container.classList.add('animate-bounce');
        setTimeout(() => container.classList.remove('animate-bounce'), 500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center py-8 max-w-sm mx-auto w-full">
      {/* Brand/Identity Header */}
      <div className="text-center mb-8">
        <div className="mb-4 inline-block bg-primary-fixed border border-primary/10 p-4 rounded-3xl shadow-sm">
          <span className="material-symbols-outlined text-primary text-5xl font-bold select-none">
            admin_panel_settings
          </span>
        </div>
        <h2 className="text-2xl font-black text-primary tracking-tight select-none uppercase">
          Worker Authentication
        </h2>
        <p className="text-xs text-on-surface-variant max-w-[280px] mx-auto mt-1 opacity-70">
          NHAI Hackathon 7.0 Role-Based Access Control System
        </p>
      </div>

      {/* Database Quick Stats */}
      <div className="w-full bg-surface-container-low border border-outline-variant p-3.5 rounded-2xl flex justify-around mb-6 text-center shadow-inner">
        <div>
          <p className="text-[10px] text-outline font-semibold tracking-wider uppercase">Enrolled Workers</p>
          <p className="text-lg font-extrabold text-primary">{stats.totalWorkers}</p>
        </div>
        <div className="border-r border-outline-variant my-1" />
        <div>
          <p className="text-[10px] text-outline font-semibold tracking-wider uppercase">Pending Sync</p>
          <p className={`text-lg font-extrabold ${stats.pendingSyncCount > 0 ? 'text-red-600' : 'text-secondary'}`}>
            {stats.pendingSyncCount}
          </p>
        </div>
      </div>

      {/* Login Form */}
      <form id="login-form" onSubmit={handleLogin} className="w-full bg-white border border-outline-variant p-6 rounded-2xl shadow-md flex flex-col gap-4">
        {errorMsg && (
          <div className="w-full text-center text-xs text-error font-semibold bg-error-container/20 border border-error/20 p-2.5 rounded-lg">
            {errorMsg}
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="w-full px-3 py-2 border border-outline rounded-lg bg-surface-container text-on-surface text-sm focus:outline-none focus:border-primary"
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-outline rounded-lg bg-surface-container text-on-surface text-sm focus:outline-none focus:border-primary pr-10"
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-outline-variant hover:text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-lg">
                {showPassword ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all mt-2"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="text-[10px] text-on-surface-variant text-center mt-2">
          Role-Based Access Control with Secure Authentication
        </p>
      </form>
    </div>
  );
};
