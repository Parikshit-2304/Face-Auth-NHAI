import React, { useState, useEffect, useRef } from 'react';
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
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    updateQueueCount();
    const unsub = syncService.subscribe(() => {
      setIsOnline(syncService.isDeviceOnline());
      setIsSyncing(syncService.isSyncInProgress());
      setLogs([...syncService.getLogs()]);
      updateQueueCount();
    });
    return () => unsub();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const updateQueueCount = async () => {
    try {
      await dbService.init();
      const queue = await dbService.getSyncQueue();
      setQueueCount(queue.length);
    } catch {}
  };

  const handleSyncNow = async () => { await syncService.syncNow(); };
  const handleToggleOffline = () => { syncService.setForcedOffline(isOnline); };
  const handleClearLogs = () => { syncService.clearLogs(); };

  const logTypeColor = {
    success: '#4ade80',
    error: '#f87171',
    pending: '#60a5fa',
    info: '#94a3b8',
  } as const;

  const logTypeIcon = {
    success: '✓',
    error: '✗',
    pending: '⟳',
    info: 'ℹ',
  } as const;

  return (
    <div style={styles.page} className="fade-in">
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div>
          <h2 style={styles.title}>Sync Center</h2>
          <p style={styles.subtitle}>Network sync queue and AWS upload management</p>
        </div>
      </div>

      {/* Status cards */}
      <div style={styles.statusGrid}>
        {/* Network state */}
        <div
          className="nhai-card"
          style={{
            ...styles.statusCard,
            ...(isOnline
              ? { borderColor: '#BBF7D0', background: '#F0FDF4' }
              : { borderColor: '#FECACA', background: '#FEF2F2' }),
          }}
        >
          <div style={styles.statusCardTop}>
            <div
              style={{
                ...styles.statusCardIcon,
                background: isOnline ? 'rgba(22,163,74,0.12)' : 'rgba(191,6,3,0.12)',
                border: `1px solid ${isOnline ? 'rgba(22,163,74,0.20)' : 'rgba(191,6,3,0.20)'}`,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: isOnline ? '#16A34A' : '#BF0603' }}
              >
                {isOnline ? 'wifi' : 'wifi_off'}
              </span>
            </div>
            <div>
              <p style={styles.statusCardLabel}>Network State</p>
              <p style={{ ...styles.statusCardValue, color: isOnline ? '#16A34A' : '#BF0603' }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </p>
              <p style={styles.statusCardSub}>
                {isOnline ? 'Connected to AWS endpoint' : 'Data queued locally'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleOffline}
            style={{
              ...styles.statusCardBtn,
              color: isOnline ? '#BF0603' : '#16A34A',
              borderColor: isOnline ? '#FECACA' : '#BBF7D0',
              background: isOnline ? 'rgba(191,6,3,0.05)' : 'rgba(22,163,74,0.05)',
            }}
          >
            {isOnline ? 'Simulate Offline' : 'Go Online'}
          </button>
        </div>

        {/* Sync queue */}
        <div className="nhai-card" style={styles.statusCard}>
          <div style={styles.statusCardTop}>
            <div style={{ ...styles.statusCardIcon, background: 'rgba(17,41,107,0.06)', border: '1px solid rgba(17,41,107,0.12)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#11296B' }}>
                backup
              </span>
            </div>
            <div>
              <p style={styles.statusCardLabel}>Sync Queue</p>
              <p
                style={{
                  ...styles.statusCardValue,
                  color: queueCount > 0 ? '#D97706' : '#16A34A',
                }}
              >
                {queueCount}
              </p>
              <p style={styles.statusCardSub}>
                {queueCount > 0 ? 'Records pending upload' : 'Queue is empty'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={isSyncing || !isOnline}
            className="nhai-btn-primary"
            style={{ width: '100%', fontSize: 12, padding: '9px 14px' }}
          >
            {isSyncing ? (
              <>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 15, animation: 'spin 1s linear infinite' }}
                >
                  sync
                </span>
                Syncing…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>cloud_sync</span>
                Sync Now
              </>
            )}
          </button>
        </div>

        {/* Device health */}
        <div className="nhai-card" style={styles.statusCard}>
          <div style={styles.statusCardTop}>
            <div style={{ ...styles.statusCardIcon, background: 'rgba(17,41,107,0.06)', border: '1px solid rgba(17,41,107,0.12)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#11296B' }}>
                shield
              </span>
            </div>
            <div>
              <p style={styles.statusCardLabel}>Device Health</p>
              <p style={{ ...styles.statusCardValue, color: '#16A34A' }}>SECURE</p>
              <p style={styles.statusCardSub}>AES-256 · 24h retention</p>
            </div>
          </div>
          <button
            onClick={() => syncService.runAutoPurge()}
            className="nhai-btn-secondary"
            style={{ width: '100%', fontSize: 12, padding: '9px 14px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>cleaning_services</span>
            Trigger Purge Check
          </button>
        </div>
      </div>

      {/* Sync console */}
      <div style={styles.console}>
        {/* Console header */}
        <div style={styles.consoleHeader}>
          <div style={styles.consoleHeaderLeft}>
            {/* Traffic lights */}
            <div style={styles.trafficLights}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <div style={styles.consoleDivider} />
            <div
              style={{
                ...styles.consoleDot,
                background: isSyncing ? '#60a5fa' : '#4ade80',
                boxShadow: isSyncing
                  ? '0 0 0 3px rgba(96,165,250,0.20)'
                  : '0 0 0 3px rgba(74,222,128,0.20)',
                animation: isSyncing ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
            />
            <span style={styles.consoleTitle}>
              nhai-sync-terminal — {isSyncing ? 'syncing…' : 'idle'}
            </span>
          </div>
          <button onClick={handleClearLogs} style={styles.clearLogsBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
            <span style={styles.clearLogsText}>Clear</span>
          </button>
        </div>

        {/* Log output */}
        <div style={styles.logsArea}>
          {logs.length === 0 ? (
            <div style={styles.logsEmpty}>
              <span style={styles.logsEmptyPrompt}>$</span>
              <span style={styles.logsEmptyText}>Console idle. Logs will appear during sync events.</span>
              <span style={styles.cursor}>█</span>
            </div>
          ) : (
            <>
              {logs.map((log, idx) => {
                const type = (log.type as keyof typeof logTypeColor) || 'info';
                return (
                  <div key={idx} style={styles.logLine}>
                    <span style={styles.logTimestamp}>[{log.timestamp}]</span>
                    <span
                      style={{
                        ...styles.logType,
                        color: logTypeColor[type] || '#94a3b8',
                      }}
                    >
                      {logTypeIcon[type] || '·'}
                    </span>
                    <span
                      style={{
                        ...styles.logTypeLabel,
                        color: logTypeColor[type] || '#94a3b8',
                      }}
                    >
                      [{log.type.toUpperCase()}]
                    </span>
                    <span style={styles.logMessage}>{log.message}</span>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </>
          )}
        </div>

        {/* Console footer */}
        <div style={styles.consoleFooter}>
          <span style={styles.consoleFooterText}>
            {logs.length} event{logs.length !== 1 ? 's' : ''} logged
          </span>
          <span style={styles.consoleFooterRight}>
            NHAI Sync v3.0 · AES-256
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16, paddingTop: 8 },
  header: { display: 'flex', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, background: '#F7F8FC', border: '1px solid #DDE1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#0D1B3E',
  },
  title: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: '#0D1B3E', margin: 0 },
  subtitle: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#8892AB', marginTop: 2 },
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  statusCard: { padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 },
  statusCardTop: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  statusCardIcon: {
    width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  statusCardLabel: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#8892AB', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 },
  statusCardValue: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 20, lineHeight: 1.2, margin: '3px 0 0' },
  statusCardSub: { fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#8892AB', marginTop: 2 },
  statusCardBtn: {
    width: '100%', padding: '9px 14px', border: '1.5px solid', borderRadius: 10, cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
  },
  // Console
  console: {
    background: '#0d1117',
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 340,
  },
  consoleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: '#161b22',
  },
  consoleHeaderLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  trafficLights: { display: 'flex', gap: 5 },
  consoleDivider: { width: 1, height: 14, background: 'rgba(255,255,255,0.08)' },
  consoleDot: { width: 8, height: 8, borderRadius: '50%' },
  consoleTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: '0.04em',
  },
  clearLogsBtn: {
    display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
    cursor: 'pointer', color: 'rgba(255,255,255,0.30)', padding: '3px 6px', borderRadius: 6,
    transition: 'color 0.15s',
  },
  clearLogsText: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'inherit',
  },
  logsArea: {
    flex: 1, padding: '14px 16px', overflowY: 'auto', maxHeight: 320,
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  logsEmpty: {
    display: 'flex', alignItems: 'center', gap: 8, paddingTop: 40, justifyContent: 'center',
  },
  logsEmptyPrompt: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#4ade80',
  },
  logsEmptyText: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.25)',
  },
  cursor: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.35)',
    animation: 'pulse 1s ease-in-out infinite',
  },
  logLine: {
    display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5,
    padding: '1px 0',
  },
  logTimestamp: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.20)',
    flexShrink: 0, paddingTop: 1,
  },
  logType: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, flexShrink: 0,
    width: 12, textAlign: 'center',
  },
  logTypeLabel: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, flexShrink: 0,
  },
  logMessage: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.70)',
    wordBreak: 'break-all',
  },
  consoleFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#161b22',
  },
  consoleFooterText: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.20)',
  },
  consoleFooterRight: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.15)',
  },
};