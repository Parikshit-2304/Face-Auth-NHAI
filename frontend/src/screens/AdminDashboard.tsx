import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { syncService } from '../services/syncService';

interface AdminDashboardProps {
  onNavigate: (screen: string) => void;
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: string;
  accent?: 'navy' | 'green' | 'red' | 'gold';
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent = 'navy', sub }) => {
  const accentColors = {
    navy: { bg: 'rgba(17,41,107,0.06)', icon: '#11296B', num: '#11296B' },
    green: { bg: 'rgba(22,163,74,0.06)', icon: '#16A34A', num: '#16A34A' },
    red: { bg: 'rgba(191,6,3,0.06)', icon: '#BF0603', num: '#BF0603' },
    gold: { bg: 'rgba(255,203,5,0.10)', icon: '#92710A', num: '#92710A' },
  }[accent];

  return (
    <div className="nhai-card" style={styles.statCard}>
      <div style={{ ...styles.statIconBox, background: accentColors.bg }}>
        <span className="material-symbols-outlined" style={{ color: accentColors.icon, fontSize: 20 }}>
          {icon}
        </span>
      </div>
      <div style={styles.statContent}>
        <p style={styles.statLabel}>{label}</p>
        <p style={{ ...styles.statValue, color: accentColors.num }}>{value}</p>
        {sub && <p style={styles.statSub}>{sub}</p>}
      </div>
    </div>
  );
};

interface ActionCardProps {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
  variant?: 'default' | 'featured' | 'alert';
  badge?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title, description, icon, onClick, variant = 'default', badge
}) => {
  const isFeatured = variant === 'featured';
  const isAlert = variant === 'alert';

  return (
    <div
      className="nhai-card nhai-card-action"
      onClick={onClick}
      style={{
        ...styles.actionCard,
        ...(isFeatured ? styles.actionCardFeatured : {}),
        ...(isAlert ? styles.actionCardAlert : {}),
      }}
    >
      <div style={styles.actionCardTop}>
        <div
          style={{
            ...styles.actionIconBox,
            ...(isFeatured ? styles.actionIconBoxFeatured : {}),
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 22,
              color: isFeatured ? '#FFDB57' : '#11296B',
            }}
          >
            {icon}
          </span>
        </div>
        {badge && (
          <div
            className="nhai-badge"
            style={{
              ...(isAlert
                ? { background: '#FEF2F2', color: '#BF0603', border: '1px solid #FECACA' }
                : isFeatured
                ? { background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }
                : { background: 'rgba(22,163,74,0.10)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.25)' }),
            }}
          >
            {badge}
          </div>
        )}
      </div>
      <div style={styles.actionCardBody}>
        <h3
          style={{
            ...styles.actionTitle,
            color: isFeatured ? '#FFFFFF' : '#0D1B3E',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            ...styles.actionDesc,
            color: isFeatured ? 'rgba(255,255,255,0.70)' : '#8892AB',
          }}
        >
          {description}
        </p>
      </div>
      <div style={styles.actionArrow}>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 18,
            color: isFeatured ? 'rgba(255,255,255,0.60)' : '#DDE1EC',
          }}
        >
          arrow_forward
        </span>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalWorkers: 0,
    pendingSync: 0,
    unverifiedCount: 0,
    isOnline: syncService.isDeviceOnline(),
  });
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

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
          unverifiedCount: unverified.filter((u) => u.review_status === 'pending').length,
          isOnline: syncService.isDeviceOnline(),
        });
      } catch {}
    };
    loadStats();
    const unsub = syncService.subscribe(loadStats);
    return () => unsub();
  }, []);

  return (
    <div style={styles.page} className="fade-in">
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div>
          <p style={styles.greetingText}>{greeting}, Admin</p>
          <h2 style={styles.pageTitle}>Command Center</h2>
          <p style={styles.pageSubtitle}>
            Gate access control · Biometric registry · Workforce management
          </p>
        </div>
        <div
          className="nhai-badge nhai-badge-primary"
          style={{ alignSelf: 'flex-start', marginTop: 4 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
            security
          </span>
          SECURE NODE α
        </div>
      </div>

      {/* Metrics row */}
      <div style={styles.statsGrid}>
        <StatCard
          label="Workers Enrolled"
          value={stats.totalWorkers}
          icon="badge"
          accent="navy"
          sub="On this device"
        />
        <StatCard
          label="Pending Sync"
          value={stats.pendingSync}
          icon="cloud_sync"
          accent={stats.pendingSync > 0 ? 'red' : 'green'}
          sub={stats.pendingSync > 0 ? 'Needs upload' : 'All synced'}
        />
        <StatCard
          label="Reviews"
          value={stats.unverifiedCount}
          icon="assignment_ind"
          accent={stats.unverifiedCount > 0 ? 'red' : 'green'}
          sub={stats.unverifiedCount > 0 ? 'Pending review' : 'No pending'}
        />
        <StatCard
          label="Network"
          value={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: stats.isOnline ? '#16A34A' : '#BF0603',
                  display: 'inline-block',
                  boxShadow: stats.isOnline
                    ? '0 0 0 3px rgba(22,163,74,0.20)'
                    : '0 0 0 3px rgba(191,6,3,0.20)',
                }}
              />
              {stats.isOnline ? 'Online' : 'Offline'}
            </span>
          }
          icon={stats.isOnline ? 'wifi' : 'wifi_off'}
          accent={stats.isOnline ? 'green' : 'red'}
        />
      </div>

      {/* Primary actions */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Quick Actions</h3>
      </div>

      <div style={styles.actionsGrid}>
        {/* Featured — Sync Center */}
        <div style={{ gridColumn: '1 / -1' }}>
          <ActionCard
            title="Sync Center"
            description="Inspect queue logs, serialized payloads, and trigger manual synchronization to AWS endpoints."
            icon="sync_lock"
            onClick={() => onNavigate('sync_center')}
            variant="featured"
            badge={stats.pendingSync > 0 ? `${stats.pendingSync} Pending` : 'All Synced'}
          />
        </div>

        <ActionCard
          title="Enroll Worker"
          description="Register new field personnel offline with liveness and face quality gates."
          icon="person_add"
          onClick={() => onNavigate('add_worker')}
        />
        <ActionCard
          title="Worker Directory"
          description="Search, filter, and inspect enrolled biometric templates."
          icon="group"
          onClick={() => onNavigate('worker_directory')}
        />
        <ActionCard
          title="Review Logs"
          description="Audit unverified entries and approve or reject attendance records."
          icon="fact_check"
          onClick={() => onNavigate('admin_review')}
          variant={stats.unverifiedCount > 0 ? 'alert' : 'default'}
          badge={stats.unverifiedCount > 0 ? `${stats.unverifiedCount} New` : undefined}
        />
        <ActionCard
          title="User Management"
          description="Create and manage user accounts with role-based access control."
          icon="manage_accounts"
          onClick={() => onNavigate('user_management')}
        />
        <ActionCard
          title="Settings"
          description="Configure matching thresholds, liveness parameters, and cloud endpoints."
          icon="settings"
          onClick={() => onNavigate('settings')}
        />
      </div>

      {/* Security status */}
      <div
        className="nhai-card"
        style={{ ...styles.securityCard, marginTop: 8 }}
      >
        <div style={styles.securityHeader}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: '#11296B' }}
          >
            shield_lock
          </span>
          <h3 style={styles.securityTitle}>Cryptographic Environment Status</h3>
        </div>
        <div style={styles.securityPills}>
          {[
            { icon: 'verified_user', text: 'AES-256 local DB encryption' },
            { icon: 'schedule', text: 'Auto 24h purge active' },
            { icon: 'memory', text: 'Hardware acceleration' },
          ].map((item) => (
            <div key={item.text} style={styles.securityPill}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 13, color: '#16A34A' }}
              >
                {item.icon}
              </span>
              <span style={styles.securityPillText}>{item.text}</span>
            </div>
          ))}
        </div>
        <p style={styles.securityNote}>
          Biometric signatures (512D embeddings) are encrypted locally using AES-GCM before storage.
          Raw capture frames are processed in-memory and purged immediately after verification.
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    paddingBottom: 16,
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    paddingTop: 8,
  },
  greetingText: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: '#8892AB',
    marginBottom: 2,
  },
  pageTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 26,
    color: '#0D1B3E',
    lineHeight: 1.2,
    margin: 0,
  },
  pageSubtitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#8892AB',
    marginTop: 3,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statContent: { flex: 1, minWidth: 0 },
  statLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    color: '#8892AB',
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    margin: 0,
  },
  statValue: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 22,
    color: '#11296B',
    lineHeight: 1.2,
    margin: '2px 0 0',
  },
  statSub: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 10,
    color: '#8892AB',
    margin: '1px 0 0',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    color: '#4A5578',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    margin: 0,
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  actionCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  actionCardFeatured: {
    background: 'linear-gradient(135deg, #11296B 0%, #00509D 100%)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 8px 32px rgba(17,41,107,0.25)',
    minHeight: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '20px 24px',
  },
  actionCardAlert: {
    borderColor: 'rgba(191,6,3,0.20)',
    background: '#FFFAFA',
  },
  actionCardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(17,41,107,0.07)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionIconBoxFeatured: {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  actionCardBody: { flex: 1 },
  actionTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    color: '#0D1B3E',
    margin: 0,
    lineHeight: 1.3,
  },
  actionDesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#8892AB',
    marginTop: 4,
    lineHeight: 1.5,
  },
  actionArrow: {
    alignSelf: 'flex-end',
    marginTop: 'auto',
  },
  securityCard: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  securityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  securityTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    color: '#11296B',
    margin: 0,
    letterSpacing: '0.02em',
  },
  securityPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  securityPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: 999,
    padding: '4px 10px',
  },
  securityPillText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    color: '#16A34A',
  },
  securityNote: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#8892AB',
    lineHeight: 1.6,
    margin: 0,
  },
};