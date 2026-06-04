import React, { useState, useEffect } from 'react';
import { dbService, type UnverifiedAttendanceRecord } from '../services/dbService';

interface AdminReviewScreenProps {
  onBack: () => void;
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

const statusConfig = {
  pending: {
    bg: '#FFFBEB', border: '#FDE68A', color: '#D97706',
    icon: 'schedule', badge: { background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' },
    rowBg: '#FFFCF4',
  },
  approved: {
    bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A',
    icon: 'check_circle', badge: { background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' },
    rowBg: '#F0FDF4',
  },
  rejected: {
    bg: '#FEF2F2', border: '#FECACA', color: '#BF0603',
    icon: 'cancel', badge: { background: '#FEF2F2', color: '#BF0603', border: '1px solid #FECACA' },
    rowBg: '#FEF8F8',
  },
} as const;

export const AdminReviewScreen: React.FC<AdminReviewScreenProps> = ({ onBack }) => {
  const [records, setRecords] = useState<UnverifiedAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('pending');

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      await dbService.init();
      const all = await dbService.getUnverifiedAttendance();
      setRecords(all);
    } catch (e) {
      console.error('Failed to load unverified records:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (attendanceId: string, status: 'approved' | 'rejected') => {
    setProcessingId(attendanceId);
    try {
      await dbService.updateUnverifiedReview(attendanceId, status, 'admin');
      await loadRecords();
    } catch (e) {
      console.error('Review update failed:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = records.filter((r) => filter === 'all' || r.review_status === filter);
  const counts = {
    pending: records.filter((r) => r.review_status === 'pending').length,
    approved: records.filter((r) => r.review_status === 'approved').length,
    rejected: records.filter((r) => r.review_status === 'rejected').length,
  };

  return (
    <div style={styles.page} className="fade-in">
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={styles.title}>Admin Review</h2>
          <p style={styles.subtitle}>Audit and adjudicate unverified attendance entries</p>
        </div>
        <button onClick={loadRecords} style={styles.refreshBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#11296B' }}>refresh</span>
        </button>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        {([
          { key: 'pending', label: 'Pending Review', icon: 'schedule' },
          { key: 'approved', label: 'Approved', icon: 'check_circle' },
          { key: 'rejected', label: 'Rejected', icon: 'cancel' },
        ] as const).map(({ key, label, icon }) => {
          const cfg = statusConfig[key];
          return (
            <div
              key={key}
              style={{
                ...styles.statCard,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: cfg.color }}
              >
                {icon}
              </span>
              <div>
                <p style={{ ...styles.statNum, color: cfg.color }}>{counts[key]}</p>
                <p style={{ ...styles.statLabel, color: cfg.color }}>{label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div style={styles.filterTabs}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterTab,
              ...(filter === f ? styles.filterTabActive : styles.filterTabInactive),
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && counts[f as keyof typeof counts] > 0 && (
              <span
                style={{
                  ...styles.filterBadge,
                  background: filter === f ? 'rgba(255,255,255,0.20)' : '#EDEFF5',
                  color: filter === f ? 'white' : '#4A5578',
                }}
              >
                {counts[f as keyof typeof counts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Records */}
      {loading ? (
        <div style={styles.loadingState}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="nhai-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '70%', borderRadius: 6 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <span className="material-symbols-outlined" style={{ fontSize: 34, color: '#DDE1EC' }}>
              {records.length === 0 ? 'fact_check' : 'filter_list_off'}
            </span>
          </div>
          <p style={styles.emptyTitle}>
            {records.length === 0 ? 'No unverified entries' : `No ${filter} entries`}
          </p>
          <p style={styles.emptyDesc}>
            {records.length === 0
              ? 'All attendance scans have been matched successfully.'
              : 'Try changing the filter above.'}
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map((r) => {
            const cfg = statusConfig[r.review_status as keyof typeof statusConfig] || statusConfig.pending;
            const isProcessing = processingId === r.attendance_id;

            return (
              <div
                key={r.attendance_id}
                className="nhai-card"
                style={{ overflow: 'hidden' }}
              >
                {/* Status stripe */}
                <div style={{ height: 3, background: cfg.color, opacity: 0.60 }} />

                <div style={{ padding: '14px 18px' }}>
                  {/* Top row */}
                  <div style={styles.recordTop}>
                    <div style={styles.recordLeft}>
                      <div
                        style={{
                          ...styles.recordStatusIcon,
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 18, color: cfg.color }}
                        >
                          {cfg.icon}
                        </span>
                      </div>
                      <div>
                        <p style={styles.recordTitle}>Unverified Entry</p>
                        <p style={styles.recordId}>{r.attendance_id}</p>
                      </div>
                    </div>
                    <span
                      className="nhai-badge"
                      style={cfg.badge}
                    >
                      {r.review_status}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div style={styles.detailGrid}>
                    <div style={styles.detailItem}>
                      <p style={styles.detailLabel}>Site</p>
                      <p style={styles.detailValue}>{r.site_id}</p>
                    </div>
                    <div style={styles.detailItem}>
                      <p style={styles.detailLabel}>Timestamp</p>
                      <p style={styles.detailValue}>{new Date(r.timestamp).toLocaleString()}</p>
                    </div>
                    <div style={styles.detailItem}>
                      <p style={styles.detailLabel}>Embedding</p>
                      <p style={{ ...styles.detailValue, color: '#11296B' }}>
                        {r.embedding.length}D ✓
                      </p>
                    </div>
                    {r.reviewed_by && (
                      <div style={styles.detailItem}>
                        <p style={styles.detailLabel}>Reviewed By</p>
                        <p style={styles.detailValue}>{r.reviewed_by}</p>
                      </div>
                    )}
                  </div>

                  {r.reviewed_by && r.reviewed_at && (
                    <p style={styles.reviewedAt}>
                      Reviewed at {new Date(r.reviewed_at).toLocaleString()}
                    </p>
                  )}

                  {/* Action buttons */}
                  {r.review_status === 'pending' && (
                    <div style={styles.actionRow}>
                      <button
                        onClick={() => handleReview(r.attendance_id, 'approved')}
                        disabled={isProcessing}
                        style={{
                          ...styles.actionBtn,
                          background: '#16A34A',
                          opacity: isProcessing ? 0.6 : 1,
                        }}
                      >
                        {isProcessing ? (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 15, animation: 'spin 1s linear infinite' }}
                          >
                            sync
                          </span>
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check</span>
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(r.attendance_id, 'rejected')}
                        disabled={isProcessing}
                        style={{
                          ...styles.actionBtn,
                          background: '#BF0603',
                          opacity: isProcessing ? 0.6 : 1,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16, paddingTop: 8 },
  header: { display: 'flex', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, background: '#F7F8FC', border: '1px solid #DDE1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#0D1B3E',
  },
  title: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: '#0D1B3E', margin: 0 },
  subtitle: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#8892AB', marginTop: 2 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 12, background: '#F7F8FC', border: '1px solid #DDE1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  statCard: {
    borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
  },
  statNum: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, margin: 0, lineHeight: 1,
  },
  statLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 600, margin: '2px 0 0',
    letterSpacing: '0.03em',
  },
  filterTabs: {
    display: 'flex', gap: 4, background: '#F7F8FC', border: '1px solid #DDE1EC',
    borderRadius: 14, padding: 4,
  },
  filterTab: {
    flex: 1, padding: '8px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700,
    letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    transition: 'all 0.15s',
  },
  filterTabActive: { background: '#11296B', color: 'white', boxShadow: '0 2px 8px rgba(17,41,107,0.20)' },
  filterTabInactive: { background: 'transparent', color: '#8892AB' },
  filterBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 18, height: 18, borderRadius: 999,
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, padding: '0 4px',
  },
  loadingState: { display: 'flex', flexDirection: 'column', gap: 10 },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '48px 24px', gap: 10, textAlign: 'center',
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: '50%', background: '#F7F8FC', border: '1px solid #DDE1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: '#4A5578', margin: 0 },
  emptyDesc: { fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#8892AB', margin: 0, maxWidth: 280, lineHeight: 1.5 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  recordTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  recordLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  recordStatusIcon: {
    width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  recordTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#0D1B3E', margin: 0 },
  recordId: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#8892AB', marginTop: 2 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 20px', marginBottom: 8 },
  detailItem: {},
  detailLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#8892AB',
    letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0,
  },
  detailValue: { fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: '#0D1B3E', marginTop: 2 },
  reviewedAt: { fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#8892AB', marginBottom: 8 },
  actionRow: { display: 'flex', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    color: 'white', border: 'none', borderRadius: 10, padding: '9px 12px', cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700,
    transition: 'all 0.15s',
  },
};