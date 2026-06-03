import React, { useEffect, useState } from 'react';
import { syncService } from '../services/syncService';

interface LayoutProps {
  children: React.ReactNode;
  role: 'guest' | 'admin' | 'supervisor';
  onLogout: () => void;
  onNavigate?: (screen: string) => void;
  activeScreen?: string;
  currentUser?: { user_id: string; username: string; role: string } | null;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  role,
  onLogout,
  onNavigate,
  currentUser
}) => {
  const [isOnline, setIsOnline] = useState(syncService.isDeviceOnline());

  useEffect(() => {
    const handleSyncUpdate = () => {
      setIsOnline(syncService.isDeviceOnline());
    };

    const unsubscribe = syncService.subscribe(handleSyncUpdate);
    return () => unsubscribe();
  }, []);

  const triggerSyncNow = async () => {
    await syncService.syncNow();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background select-none">
      {/* Top Navigation Bar */}
      <header className="bg-primary text-white shadow-md fixed top-0 w-full z-50 flex justify-between items-center px-4 h-16">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate && onNavigate('dashboard')}>
          <span className="material-symbols-outlined text-3xl font-bold select-none" style={{ fontVariationSettings: "'FILL' 1" }}>
            shield
          </span>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-none tracking-wide select-none">SecureAuth</h1>
            <span className="text-[10px] font-mono opacity-80 uppercase tracking-widest leading-none mt-1">Datalake 3.0</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Mock Network Switch Toggle for Presentation */}
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
            <span className="text-[10px] font-bold uppercase tracking-wider hidden xs:block">
              {isOnline ? 'Online' : 'Offline'} Mode
            </span>
            <button
              onClick={() => syncService.setForcedOffline(isOnline)}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer duration-200 ${
                isOnline ? 'bg-secondary' : 'bg-red-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  isOnline ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sync Trigger Shortcut */}
          {role !== 'guest' && (
            <button
              onClick={triggerSyncNow}
              className="relative p-2 rounded-lg hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-white/10"
              title="Sync Queue Now"
            >
              <span className={`material-symbols-outlined ${syncService.isSyncInProgress() ? 'animate-spin' : ''}`}>
                sync
              </span>
            </button>
          )}

          {/* User Profile Info */}
          {role !== 'guest' && currentUser && (
            <div className="flex items-center gap-2 hover:bg-white/15 p-1 rounded-lg transition-colors cursor-pointer" onClick={onLogout}>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-none">@{currentUser.username}</p>
                <p className="text-[10px] opacity-75 mt-0.5">{currentUser.role.toUpperCase()}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center border border-white/30 overflow-hidden font-bold text-sm">
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main App Workspace */}
      <main className="flex-grow pt-20 pb-20 px-4 w-full max-w-4xl mx-auto flex flex-col">
        {children}
      </main>

      {/* Persistence Status Bar (Footer Shell) */}
      <footer className="w-full bg-surface-container border-t border-outline-variant py-2.5 px-4 flex items-center justify-between fixed bottom-0 left-0 z-40">
        <div className="flex items-center gap-3">
          {!isOnline ? (
            <div className="flex items-center gap-1.5 text-error font-semibold text-xs bg-error-container/20 border border-error/20 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[16px] animate-pulse">signal_cellular_connected_no_internet_4_bar</span>
              <span>DEVICE OFFLINE (LOCAL AUTH ACTIVE)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-secondary font-semibold text-xs bg-secondary-container/20 border border-secondary/20 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>SECURE AWS NODE CONNECTION</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-medium text-xs font-mono">
            <span className="material-symbols-outlined text-[16px]">sync_lock</span>
            <span>AES-256 VAULT ACTIVE</span>
          </div>
          <span className="text-[9px] font-mono text-outline uppercase tracking-widest hidden xs:block">
            V3.0.0-PROD
          </span>
        </div>
      </footer>
    </div>
  );
};
