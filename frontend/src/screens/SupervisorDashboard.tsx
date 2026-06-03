import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { syncService } from '../services/syncService';

interface SupervisorDashboardProps {
  onNavigate: (screen: string) => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    todayAttendanceCount: 0,
    pendingSyncCount: 0,
    totalWorkers: 0,
    isOnline: syncService.isDeviceOnline()
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        await dbService.init();
        const attendance = await dbService.getAllAttendance();
        const queue = await dbService.getSyncQueue();
        const workers = await dbService.getAllWorkers();
        
        // Count verified logs today
        const todayStr = new Date().toDateString();
        const todayCount = attendance.filter(
          a => new Date(a.timestamp).toDateString() === todayStr && a.verified === 'Verified'
        ).length;

        setStats({
          todayAttendanceCount: todayCount,
          pendingSyncCount: queue.length,
          totalWorkers: workers.length,
          isOnline: syncService.isDeviceOnline()
        });
      } catch (e) {
        console.error('Failed to load supervisor stats:', e);
      }
    };

    loadStats();
    const unsubscribe = syncService.subscribe(loadStats);
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Context/Shift Info Header */}
      <div className="bg-surface-container-low border border-outline-variant p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              location_on
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-primary">Active Site: Remote Alpha</h3>
            <p className="text-xs text-on-surface-variant">Shift: Morning (06:00 AM - 02:00 PM)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-outline-variant px-3 py-1.5 rounded-full shadow-sm text-xs font-semibold w-fit self-end">
          <span className="material-symbols-outlined text-sm animate-pulse text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
            schedule
          </span>
          <span>Shift Supervisor: Marcus Thorne</span>
        </div>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-outline-variant p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-outline tracking-wider uppercase">Marked Today</p>
            <p className="text-3xl font-black text-primary mt-1">{stats.todayAttendanceCount}</p>
          </div>
          <span className="material-symbols-outlined text-primary/30 text-5xl">how_to_reg</span>
        </div>

        <div className="bg-white border border-outline-variant p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-outline tracking-wider uppercase">Pending Uploads</p>
            <p className={`text-3xl font-black mt-1 ${stats.pendingSyncCount > 0 ? 'text-red-500 animate-pulse' : 'text-secondary'}`}>
              {stats.pendingSyncCount}
            </p>
          </div>
          <span className="material-symbols-outlined text-error/30 text-5xl">cloud_queue</span>
        </div>

        <div className="bg-white border border-outline-variant p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-outline tracking-wider uppercase">Auth Mode</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`h-2.5 w-2.5 rounded-full ${stats.isOnline ? 'bg-secondary animate-pulse' : 'bg-red-500 animate-pulse'}`}></span>
              <p className="text-xl font-bold">{stats.isOnline ? 'ONLINE' : 'LOCAL ONLY'}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-outline/30 text-5xl">
            {stats.isOnline ? 'cloud_done' : 'cloud_off'}
          </span>
        </div>
      </section>

      {/* Large Featured verification trigger card */}
      <div 
        onClick={() => onNavigate('attendance_scanner')}
        className="w-full bg-primary text-white p-6 rounded-3xl shadow-lg flex flex-col justify-between hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer group min-h-[180px] border border-white/10"
      >
        <div className="flex justify-between items-start">
          <div className="bg-white/15 p-4 rounded-2xl border border-white/10">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              face_unlock
            </span>
          </div>
          <span className="bg-white/20 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            Start Scanner
          </span>
        </div>
        <div className="mt-6">
          <h3 className="text-xl font-black tracking-tight uppercase leading-none mb-1">Verify Personnel</h3>
          <p className="text-xs opacity-80 max-w-[480px]">
            Run biometric scan to log attendance. Real-time liveness and similarity comparison are executed locally in &lt;1 second.
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Enrolled directory */}
        <div 
          onClick={() => onNavigate('worker_directory')}
          className="bg-white border border-outline-variant p-5 rounded-2xl flex items-center gap-4 hover:border-primary active:scale-[0.98] transition-all cursor-pointer shadow-sm group"
        >
          <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl font-bold">folder_shared</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-on-surface leading-tight">Worker Directory</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Search and view details of workers enrolled on this device ({stats.totalWorkers}).</p>
          </div>
        </div>

        {/* History logs */}
        <div 
          onClick={() => onNavigate('settings')} // Can point to history or settings, let's configure settings or similar logs
          className="bg-white border border-outline-variant p-5 rounded-2xl flex items-center gap-4 hover:border-primary active:scale-[0.98] transition-all cursor-pointer shadow-sm group"
        >
          <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl font-bold">history</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-on-surface leading-tight">Verification Logs</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Audit details of local face scans, liveness failures, and matching scores.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
