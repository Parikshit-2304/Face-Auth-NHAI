import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { syncService } from '../services/syncService';

interface AdminDashboardProps {
  onNavigate: (screen: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalWorkers: 0,
    pendingSync: 0,
    unverifiedCount: 0,
    isOnline: syncService.isDeviceOnline()
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        await dbService.init();
        const workers = await dbService.getAllWorkers();
        const queue = await dbService.getSyncQueue();
        const unverified = await dbService.getUnverifiedAttendance();
        
        setStats({
          totalWorkers: workers.length,
          pendingSync: queue.length,
          unverifiedCount: unverified.filter(u => u.review_status === 'pending').length,
          isOnline: syncService.isDeviceOnline()
        });
      } catch (e) {
        console.error('Failed to load admin stats:', e);
      }
    };

    loadStats();
    const unsubscribe = syncService.subscribe(loadStats);
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Page Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">ADMIN COMMAND CENTER</h2>
          <p className="text-xs text-on-surface-variant">Gate Access Authorization & Biometric Registry</p>
        </div>
        <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold font-mono">
          SECURE_NODE_ALPHA
        </span>
      </div>

      {/* Stats Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container-low border border-outline-variant p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-outline tracking-wider uppercase">Workers Registered</p>
            <p className="text-3xl font-black text-primary mt-1">{stats.totalWorkers}</p>
          </div>
          <span className="material-symbols-outlined text-primary/30 text-5xl">badge</span>
        </div>

        <div className="bg-surface-container-low border border-outline-variant p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-outline tracking-wider uppercase">Pending Sync Queue</p>
            <p className={`text-3xl font-black mt-1 ${stats.pendingSync > 0 ? 'text-error' : 'text-secondary'}`}>
              {stats.pendingSync}
            </p>
          </div>
          <span className="material-symbols-outlined text-error/30 text-5xl">cloud_sync</span>
        </div>

        <div className="bg-surface-container-low border border-outline-variant p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-outline tracking-wider uppercase">Network Gateway</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-3 w-3 rounded-full ${stats.isOnline ? 'bg-secondary animate-pulse' : 'bg-red-500 animate-pulse'}`}></span>
              <p className="text-xl font-bold text-on-surface">{stats.isOnline ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-outline/30 text-5xl">
            {stats.isOnline ? 'wifi' : 'wifi_off'}
          </span>
        </div>
      </section>

      {/* Bento Grid Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        {/* Sync Center (Featured Card) */}
        <div 
          onClick={() => onNavigate('sync_center')}
          className="md:col-span-2 bg-primary text-white p-6 rounded-2xl shadow-md flex flex-col justify-between hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer group min-h-[160px]"
        >
          <div className="flex justify-between items-start">
            <div className="bg-white/15 p-3 rounded-xl border border-white/10">
              <span className="material-symbols-outlined text-3xl font-bold select-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                sync_lock
              </span>
            </div>
            {stats.pendingSync > 0 ? (
              <span className="text-[10px] font-bold bg-error text-white border border-red-500/30 px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                Action Required ({stats.pendingSync} pending)
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-secondary text-white px-3 py-1 rounded-full uppercase tracking-wider">
                Sync Synced
              </span>
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-black tracking-tight mb-1 uppercase">Sync Center Monitor</h3>
            <p className="text-xs opacity-75">Inspect queue logs, serialized payloads, and trigger manual synchronization to AWS endpoints.</p>
          </div>
        </div>

        {/* Add Worker Wizard */}
        <div 
          onClick={() => onNavigate('add_worker')}
          className="bg-white border border-outline-variant p-6 rounded-2xl flex flex-col justify-between hover:border-primary active:scale-[0.98] transition-all cursor-pointer group min-h-[160px] shadow-sm"
        >
          <div className="text-primary group-hover:scale-110 transition-transform duration-200">
            <span className="material-symbols-outlined text-4xl">person_add</span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-on-surface leading-tight">Enroll Worker</h3>
            <p className="text-xs text-on-surface-variant mt-1">Register new field personnel offline with strict face quality and liveness gates.</p>
          </div>
        </div>

        {/* Worker Directory */}
        <div 
          onClick={() => onNavigate('worker_directory')}
          className="bg-white border border-outline-variant p-6 rounded-2xl flex flex-col justify-between hover:border-primary active:scale-[0.98] transition-all cursor-pointer group min-h-[160px] shadow-sm"
        >
          <div className="text-primary group-hover:scale-110 transition-transform duration-200">
            <span className="material-symbols-outlined text-4xl">group</span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-on-surface leading-tight">Worker Directory</h3>
            <p className="text-xs text-on-surface-variant mt-1">Search, filter, and inspect enrolled biometrics templates and sync status.</p>
          </div>
        </div>

        {/* Unverified Reviews */}
        <div 
          onClick={() => onNavigate('admin_review')}
          className="bg-white border border-outline-variant p-6 rounded-2xl flex flex-col justify-between hover:border-primary active:scale-[0.98] transition-all cursor-pointer group min-h-[160px] shadow-sm"
        >
          <div className={`${stats.unverifiedCount > 0 ? 'text-error animate-pulse' : 'text-primary'} group-hover:scale-110 transition-transform duration-200`}>
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              assignment_ind
            </span>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface leading-tight">Review Logs</h3>
              {stats.unverifiedCount > 0 && (
                <span className="bg-error/10 text-error px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {stats.unverifiedCount} New
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Audit unverified worker entries, manually approve/reject or link logs.</p>
          </div>
        </div>

        {/* System Settings */}
        <div 
          onClick={() => onNavigate('settings')}
          className="bg-white border border-outline-variant p-6 rounded-2xl flex flex-col justify-between hover:border-primary active:scale-[0.98] transition-all cursor-pointer group min-h-[160px] shadow-sm"
        >
          <div className="text-primary group-hover:scale-110 transition-transform duration-200">
            <span className="material-symbols-outlined text-4xl">settings_applications</span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-on-surface leading-tight">Config System</h3>
            <p className="text-xs text-on-surface-variant mt-1">Configure cosine matching thresholds, lighting parameters, and purge settings.</p>
          </div>
        </div>
        {/* User Management */}
        <div 
          onClick={() => onNavigate('user_management')}
          className="bg-white border border-outline-variant p-6 rounded-2xl flex flex-col justify-between hover:border-primary active:scale-[0.98] transition-all cursor-pointer group min-h-[160px] shadow-sm"
        >
          <div className="text-primary group-hover:scale-110 transition-transform duration-200">
            <span className="material-symbols-outlined text-4xl">people</span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-on-surface leading-tight">User Management</h3>
            <p className="text-xs text-on-surface-variant mt-1">Create, activate, deactivate users and manage role-based access permissions.</p>
          </div>
        </div>      </div>

      {/* System Cryptographic Integrity Indicator */}
      <div className="mt-4 bg-surface-container-high/60 rounded-2xl p-5 border border-outline-variant relative overflow-hidden shadow-sm">
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">shield_lock</span>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest leading-none">Sealed Cryptographic Environment</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 bg-white border border-outline-variant px-3 py-1.5 rounded-full text-[10px] font-semibold text-on-surface shadow-sm">
              <span className="material-symbols-outlined text-[14px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <span>AES-256 local DB encryption</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-outline-variant px-3 py-1.5 rounded-full text-[10px] font-semibold text-on-surface shadow-sm">
              <span className="material-symbols-outlined text-[14px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <span>Automatic 24h Purge Active</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-outline-variant px-3 py-1.5 rounded-full text-[10px] font-semibold text-on-surface shadow-sm">
              <span className="material-symbols-outlined text-[14px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <span>Hardware acceleration enabled</span>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
            Biometric signatures (512D embeddings) are encrypted locally using AES-GCM before storage on the device filesystem. Raw capture photos are processed exclusively in-memory and are purged immediately.
          </p>
        </div>
      </div>
    </div>
  );
};
