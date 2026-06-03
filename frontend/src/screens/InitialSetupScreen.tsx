import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';

interface InitialSetupScreenProps {
  onSetupComplete: (role: 'admin' | 'supervisor') => void;
}

export const InitialSetupScreen: React.FC<InitialSetupScreenProps> = ({ onSetupComplete }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!username || !password || !fullName) {
        throw new Error('Please fill in all required fields');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }

      // Initialize database
      await dbService.init();

      // Check if user already exists
      const existingUser = await dbService.getUserByUsername(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Create admin user
      const newUser = await authService.createUserAccount(
        username,
        password,
        'admin',
        {
          full_name: fullName,
          email: email || undefined
        }
      );

      // Save to database
      await dbService.addUser(newUser);

      // Authenticate the user
      const session = await authService.authenticateUser(username, password, newUser);
      if (session) {
        setSuccess(true);
        // Store session in localStorage for persistence
        localStorage.setItem('auth_session', JSON.stringify(session));
        
        setTimeout(() => {
          onSetupComplete('admin');
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-8 max-w-sm mx-auto w-full">
        <div className="text-center">
          <div className="mb-4 inline-block bg-primary-fixed border border-primary/10 p-4 rounded-3xl shadow-sm">
            <span className="material-symbols-outlined text-primary text-5xl font-bold select-none">
              check_circle
            </span>
          </div>
          <h2 className="text-2xl font-black text-primary tracking-tight select-none">
            Setup Complete!
          </h2>
          <p className="text-sm text-on-surface-variant mt-2">
            Admin account created successfully. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col items-center justify-center py-8 max-w-sm mx-auto w-full">
      <div className="text-center mb-8">
        <div className="mb-4 inline-block bg-primary-fixed border border-primary/10 p-4 rounded-3xl shadow-sm">
          <span className="material-symbols-outlined text-primary text-5xl font-bold select-none">
            security
          </span>
        </div>
        <h2 className="text-2xl font-black text-primary tracking-tight select-none uppercase">
          Initial Setup
        </h2>
        <p className="text-xs text-on-surface-variant max-w-[280px] mx-auto mt-1 opacity-70">
          Create your first admin account
        </p>
      </div>

      <form onSubmit={handleSetup} className="w-full bg-white border border-outline-variant p-6 rounded-2xl shadow-md flex flex-col gap-4">
        {error && (
          <div className="w-full text-center text-xs text-error font-semibold bg-error-container/20 border border-error/20 p-2.5 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            Full Name *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-3 py-2 border border-outline rounded-lg bg-surface-container text-on-surface text-sm focus:outline-none focus:border-primary"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            Email (Optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            className="w-full px-3 py-2 border border-outline rounded-lg bg-surface-container text-on-surface text-sm focus:outline-none focus:border-primary"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            Username *
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            className="w-full px-3 py-2 border border-outline rounded-lg bg-surface-container text-on-surface text-sm focus:outline-none focus:border-primary"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            Password *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            className="w-full px-3 py-2 border border-outline rounded-lg bg-surface-container text-on-surface text-sm focus:outline-none focus:border-primary"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            Confirm Password *
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••"
            className="w-full px-3 py-2 border border-outline rounded-lg bg-surface-container text-on-surface text-sm focus:outline-none focus:border-primary"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all mt-2"
        >
          {loading ? 'Creating Account...' : 'Create Admin Account'}
        </button>

        <p className="text-[10px] text-on-surface-variant text-center">
          * Required fields
        </p>
      </form>
    </div>
  );
};
