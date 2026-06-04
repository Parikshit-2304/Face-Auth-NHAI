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
    isOnline: syncService.isDeviceOnline(),
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        await dbService.init();
        const attendance = await dbService.getAllAttendance();
        const queue = await dbService.getSyncQueue();
        const workers = await dbService.getAllWorkers();
        const todayStr = new Date().toDateString();
        const todayCount = attendance.filter(
          (a) => new Date(a.timestamp).toDateString() === todayStr && a.verified === 'Verified'
        ).length;
        setStats({
          todayAttendanceCount: todayCount,
          pendingSyncCount: queue.length,
          totalWorkers: workers.length,
          isOnline: syncService.isDeviceOnline(),
        });
      } catch {}
    };
    loadStats();
    const unsub = syncService.subscribe(loadStats);
    return () => unsub();
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={styles.page} className="fade-in">
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <p style={styles.dateLine}>{dateStr}</p>
          <h2 style={styles.pageTitle}>Supervisor View</h2>
        </div>
        <div style={styles.timeBadge}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#11296B' }}>schedule</span>
          <span style={styles.timeText}>{timeStr}</span>
        </div>
      </div>

      {/* Site context */}
      <div className="nhai-card" style={styles.siteCard}>
        <div style={styles.siteLeft}>
          <div style={styles.siteIconBox}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#11296B' }}>
              location_on
            </span>
          </div>
          <div>
            <p style={styles.siteLabel}>Active Site</p>
            <p style={styles.siteName}>Remote Alpha</p>
            <p style={styles.shiftLabel}>Morning Shift · 06:00 AM – 02:00 PM</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: stats.isOnline ? '#16A34A' : '#BF0603',
              boxShadow: stats.isOnline
                ? '0 0 0 3px rgba(22,163,74,0.20)'
                : '0 0 0 3px rgba(191,6,3,0.20)',
            }}
          />
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: stats.isOnline ? '#16A34A' : '#BF0603',
            }}
          >
            {stats.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={styles.statsGrid}>
        {[
          {
            label: 'Scanned Today',
            value: stats.todayAttendanceCount,
            icon: 'how_to_reg',
            color: '#11296B',
            bg: 'rgba(17,41,107,0.06)',
          },
          {
            label: 'Pending Upload',
            value: stats.pendingSyncCount,
            icon: 'cloud_upload',
            color: stats.pendingSyncCount > 0 ? '#BF0603' : '#16A34A',
            bg:
              stats.pendingSyncCount > 0
                ? 'rgba(191,6,3,0.06)'
                : 'rgba(22,163,74,0.06)',
          },
          {
            label: 'Total Workers',
            value: stats.totalWorkers,
            icon: 'groups',
            color: '#00509D',
            bg: 'rgba(0,80,157,0.06)',
          },
        ].map((s) => (
          <div key={s.label} className="nhai-card" style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: s.bg }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: s.color }}
              >
                {s.icon}
              </span>
            </div>
            <p style={{ ...styles.statValue, color: s.color }}>{s.value}</p>
            <p style={styles.statLabel}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Primary CTA — Biometric scan */}
      <button
        onClick={() => onNavigate('attendance_scanner')}
        style={styles.scanCTA}
      >
        <div style={styles.scanCTALeft}>
          <div style={styles.scanCTAIcon}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 32, color: '#FFDB57' }}
            >
              face_unlock
            </span>
          </div>
          <div>
            <h3 style={styles.scanCTATitle}>Verify Personnel</h3>
            <p style={styles.scanCTADesc}>
              Run biometric scan to log attendance. Real-time liveness and similarity comparison in under 1 second.
            </p>
          </div>
        </div>
        <div style={styles.scanCTAArrow}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'rgba(255,255,255,0.60)' }}>
            arrow_forward
          </span>
        </div>
      </button>

      {/* Secondary actions */}
      <div style={styles.actionsRow}>
        {[
          {
            title: 'Worker Directory',
            desc: `${stats.totalWorkers} workers enrolled`,
            icon: 'folder_shared',
            screen: 'worker_directory',
          },
          {
            title: 'Verification Logs',
            desc: 'Audit scan history and scores',
            icon: 'history',
            screen: 'settings',
          },
        ].map((a) => (
          <div
            key={a.title}
            className="nhai-card nhai-card-action"
            onClick={() => onNavigate(a.screen)}
            style={styles.actionCard}
          >
            <div style={styles.actionIconBox}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: '#11296B' }}
              >
                {a.icon}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={styles.actionTitle}>{a.title}</p>
              <p style={styles.actionDesc}>{a.desc}</p>
            </div>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18, color: '#DDE1EC' }}
            >
              chevron_right
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    paddingBottom: 16,
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  dateLine: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#8892AB',
    marginBottom: 2,
  },
  pageTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 26,
    color: '#0D1B3E',
    margin: 0,
  },
  timeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: '#F7F8FC',
    border: '1px solid #DDE1EC',
    borderRadius: 10,
    padding: '6px 12px',
  },
  timeText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    fontSize: 13,
    color: '#11296B',
  },
  siteCard: {
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  siteLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  siteIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'rgba(17,41,107,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  siteLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    color: '#8892AB',
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    margin: 0,
  },
  siteName: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 15,
    color: '#0D1B3E',
    margin: '2px 0 0',
  },
  shiftLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    color: '#8892AB',
    marginTop: 1,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  statCard: {
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    textAlign: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 26,
    lineHeight: 1,
    margin: 0,
  },
  statLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 10,
    fontWeight: 600,
    color: '#8892AB',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    margin: 0,
    textAlign: 'center',
  },
  scanCTA: {
    width: '100%',
    background: 'linear-gradient(135deg, #11296B 0%, #00509D 100%)',
    border: 'none',
    borderRadius: 20,
    padding: '20px 24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    boxShadow: '0 8px 32px rgba(17,41,107,0.25)',
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  scanCTALeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  scanCTAIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scanCTATitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 18,
    color: '#FFFFFF',
    margin: 0,
    lineHeight: 1.2,
  },
  scanCTADesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 5,
    lineHeight: 1.5,
  },
  scanCTAArrow: {
    flexShrink: 0,
  },
  actionsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  actionCard: {
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(17,41,107,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    color: '#0D1B3E',
    margin: 0,
  },
  actionDesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#8892AB',
    marginTop: 2,
  },
};