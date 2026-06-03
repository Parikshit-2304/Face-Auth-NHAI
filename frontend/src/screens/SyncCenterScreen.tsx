import React, { useState, useEffect } from 'react';
import { syncService, type SyncLog } from '../services/syncService';
import { dbService } from '../services/dbService';

interface SyncCenterScreenProps {
  onBack: () => void;
}

export const SyncCenterScreen: React.FC<SyncCenterScreenProps> = ({ onBack }) => {
  const [isOnline, setIsOnline] = useState(syncService.isDeviceOnline());
  const [isSyncing, setIsSyncing] = useState(syncService.isSyncInProgress());
  const [logs, setLogs] = useState<SyncLog[]>(syncService.getLogs());
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Refresh queue count
    updateQueueCount();

    // Subscribe to sync service updates
    const unsubscribe = syncService.subscribe(() => {
      setIsOnline(syncService.isDeviceOnline());
      setIsSyncing(syncService.isSyncInProgress());
      setLogs([...syncService.getLogs()]);
      updateQueueCount();
    });

    return () => unsubscribe();
  }, []);

  const updateQueueCount = async () => {
    try {
      await dbService.init();
      const queue = await dbService.getSyncQueue();
      setQueueCount(queue.length);
    } catch (e) {
      console.error('Failed to get queue count:', e);
    }
  };

  const handleSyncNow = async () => {
    await syncService.syncNow();
  };

  const handleToggleOffline = () => {
    syncService.setForcedOffline(isOnline);
  };

  const handleClearLogs = () => {
    syncService.clearLogs();
  };

  return (
    <div className="flex flex-col gap-6 py-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-surface-container-high transition cursor-pointer">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">SYNC CENTER</h2>
          <p className="text-xs text-on-surface-variant">Manage network sync queue and AWS upload status</p>
        </div>
      </div>

      {/* Grid of Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connection Status Card */}
        <div className="bg-white border border-outline-variant p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`material-symbols-outlined text-xl ${isOnline ? 'text-secondary' : 'text-error'}`}>
                {isOnline ? 'wifi' : 'wifi_off'}
              </span>
              <h3 className="font-bold text-sm text-on-surface">Network State</h3>
            </div>
            <p className={`text-xl font-black ${isOnline ? 'text-secondary' : 'text-error'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-1">
              {isOnline ? 'Connected to AWS' : 'Data queued locally'}
            </p>
          </div>
          <button
            onClick={handleToggleOffline}
            className={`mt-4 w-full py-2 border rounded-xl text-xs font-bold transition cursor-pointer ${
              isOnline
                ? 'border-error text-error hover:bg-error/5'
                : 'border-secondary text-secondary hover:bg-secondary/5'
            }`}
          >
            {isOnline ? 'Go Offline (Simulated)' : 'Go Online'}
          </button>
        </div>

        {/* Sync Queue Card */}
        <div className="bg-white border border-outline-variant p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-xl text-primary">backup</span>
              <h3 className="font-bold text-sm text-on-surface">Sync Queue</h3>
            </div>
            <p className="text-2xl font-black text-primary">{queueCount}</p>
            <p className="text-[10px] text-on-surface-variant mt-1">
              Pending local records
            </p>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={isSyncing || !isOnline}
            className="mt-4 w-full bg-primary text-white py-2 rounded-xl text-xs font-bold hover:brightness-110 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            {isSyncing ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                Syncing…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">sync</span>
                Sync Now
              </>
            )}
          </button>
        </div>

        {/* Retention / Purge Card */}
        <div className="bg-white border border-outline-variant p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-xl text-outline">verified_user</span>
              <h3 className="font-bold text-sm text-on-surface">Device Health</h3>
            </div>
            <p className="text-xl font-black text-on-surface">SECURE</p>
            <p className="text-[10px] text-on-surface-variant mt-1">
              AES-256 vault encryption. Local data retention period: 24 hours.
            </p>
          </div>
          <button
            onClick={() => syncService.runAutoPurge()}
            className="mt-4 w-full border border-outline-variant text-on-surface py-2 rounded-xl text-xs font-bold hover:bg-surface-container-low transition cursor-pointer"
          >
            Trigger Purge Check
          </button>
        </div>
      </div>

      {/* Sync Console Logs */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 shadow-inner flex flex-col flex-1 min-h-[300px]">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-primary animate-ping' : 'bg-secondary'}`}></div>
            <span className="text-white text-xs font-bold uppercase tracking-wider font-mono">Sync Terminal Output</span>
          </div>
          <button
            onClick={handleClearLogs}
            className="text-neutral-400 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Clear Logs
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[350px] font-mono text-[11px] space-y-2 pr-2 custom-scrollbar">
          {logs.length === 0 ? (
            <div className="text-neutral-500 text-center py-16">
              Console idle. Logs will appear during sync events.
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="flex gap-3 leading-relaxed items-start">
                <span className="text-neutral-600 shrink-0 select-none">[{log.timestamp}]</span>
                <span className={`shrink-0 font-bold ${
                  log.type === 'success' ? 'text-secondary' :
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'pending' ? 'text-primary' :
                  'text-neutral-400'
                }`}>
                  [{log.type.toUpperCase()}]
                </span>
                <span className="text-neutral-300 break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
