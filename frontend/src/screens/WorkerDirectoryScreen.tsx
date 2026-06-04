import React, { useState, useEffect } from 'react';
import { dbService, type WorkerRecord } from '../services/dbService';

interface WorkerDirectoryScreenProps {
  onBack: () => void;
}

export const WorkerDirectoryScreen: React.FC<WorkerDirectoryScreenProps> = ({ onBack }) => {
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadWorkers(); }, []);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      await dbService.init();
      const all = await dbService.getAllWorkers();
      setWorkers(all);
    } catch (e) {
      console.error('Failed to load workers:', e);
    } finally {
      setLoading(false);
    }
  };

  const uniqueSites = Array.from(new Set(workers.map((w) => w.site_id)));

  const filtered = workers.filter((w) => {
    const matchesSearch =
      !searchQuery ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.worker_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSite = siteFilter === 'all' || w.site_id === siteFilter;
    return matchesSearch && matchesSite;
  });

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

  // Avatar color based on name hash
  const avatarColor = (name: string) => {
    const colors = ['#11296B', '#00509D', '#16A34A', '#D97706', '#7C3AED'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div style={styles.page} className="fade-in">
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={styles.title}>Worker Directory</h2>
          <p style={styles.subtitle}>
            {workers.length} worker{workers.length !== 1 ? 's' : ''} enrolled on this device
          </p>
        </div>
        <button
          onClick={loadWorkers}
          style={styles.refreshBtn}
          title="Refresh"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#11296B' }}>
            refresh
          </span>
        </button>
      </div>

      {/* Search + Filter */}
      <div style={styles.searchRow}>
        <div style={styles.searchWrap}>
          <span
            className="material-symbols-outlined"
            style={styles.searchIcon}
          >
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID…"
            className="nhai-input"
            style={{ paddingLeft: 42 }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={styles.clearSearch}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          )}
        </div>
        <select
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="nhai-input"
          style={{ width: 'auto', minWidth: 120 }}
        >
          <option value="all">All Sites</option>
          {uniqueSites.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Results summary */}
      {!loading && workers.length > 0 && (
        <div style={styles.resultsSummary}>
          <span style={styles.resultsText}>
            Showing <strong>{filtered.length}</strong> of <strong>{workers.length}</strong> workers
          </span>
          {(searchQuery || siteFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setSiteFilter('all'); }}
              style={styles.clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={styles.loadingState}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="nhai-card" style={styles.skeletonCard}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 11, width: '40%', borderRadius: 6 }} />
              </div>
              <div className="skeleton" style={{ height: 24, width: 64, borderRadius: 999 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#DDE1EC' }}>
              {workers.length === 0 ? 'person_add' : 'search_off'}
            </span>
          </div>
          <p style={styles.emptyTitle}>
            {workers.length === 0 ? 'No workers enrolled yet' : 'No results found'}
          </p>
          <p style={styles.emptyDesc}>
            {workers.length === 0
              ? 'Use the Admin Dashboard to enroll workers with biometric profiles.'
              : 'Try adjusting your search query or site filter.'}
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map((w) => {
            const isExpanded = expandedId === w.worker_id;
            const isSynced = w.sync_status === 'synced';
            const color = avatarColor(w.name);

            return (
              <div
                key={w.worker_id}
                className="nhai-card"
                style={{
                  ...styles.workerCard,
                  ...(isExpanded ? styles.workerCardExpanded : {}),
                }}
              >
                {/* Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : w.worker_id)}
                  style={styles.workerRow}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      ...styles.avatar,
                      background: `${color}15`,
                      border: `1.5px solid ${color}30`,
                    }}
                  >
                    <span
                      style={{
                        ...styles.avatarText,
                        color: color,
                      }}
                    >
                      {getInitials(w.name)}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={styles.workerInfo}>
                    <p style={styles.workerName}>{w.name}</p>
                    <p style={styles.workerId}>{w.worker_id}</p>
                  </div>

                  {/* Site + Sync */}
                  <div style={styles.workerMeta}>
                    <span style={styles.workerSite}>{w.site_id}</span>
                    <span
                      className="nhai-badge"
                      style={
                        isSynced
                          ? { background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }
                          : { background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }
                      }
                    >
                      {isSynced ? 'Synced' : 'Pending'}
                    </span>
                  </div>

                  {/* Chevron */}
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 20,
                      color: '#DDE1EC',
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      flexShrink: 0,
                    }}
                  >
                    expand_more
                  </span>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={styles.expandedDetails} className="fade-in">
                    <div style={styles.detailGrid}>
                      {[
                        { label: 'Site ID', value: w.site_id },
                        { label: 'Enrolled On', value: new Date(w.created_at).toLocaleDateString() },
                        {
                          label: 'Front Embedding',
                          value: `${w.embedding_front.length}D ✓`,
                          valueColor: '#16A34A',
                        },
                        {
                          label: 'Left Embedding',
                          value: `${w.embedding_left.length}D ✓`,
                          valueColor: '#16A34A',
                        },
                        {
                          label: 'Right Embedding',
                          value: `${w.embedding_right.length}D ✓`,
                          valueColor: '#16A34A',
                        },
                        {
                          label: 'Encryption',
                          value: 'AES-256-GCM ✓',
                          valueColor: '#11296B',
                        },
                      ].map((d) => (
                        <div key={d.label} style={styles.detailItem}>
                          <p style={styles.detailLabel}>{d.label}</p>
                          <p
                            style={{
                              ...styles.detailValue,
                              ...(d.valueColor ? { color: d.valueColor } : {}),
                            }}
                          >
                            {d.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
  searchRow: { display: 'flex', gap: 10 },
  searchWrap: { flex: 1, position: 'relative' },
  searchIcon: {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    fontSize: 18, color: '#8892AB', pointerEvents: 'none', zIndex: 1,
  } as React.CSSProperties,
  clearSearch: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#8892AB', display: 'flex', alignItems: 'center', padding: 0,
  } as React.CSSProperties,
  resultsSummary: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  resultsText: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#8892AB' },
  clearFilters: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#11296B',
    background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
  },
  loadingState: { display: 'flex', flexDirection: 'column', gap: 10 },
  skeletonCard: { padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 },
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
  workerCard: { overflow: 'hidden', transition: 'all 0.2s' },
  workerCardExpanded: { borderColor: 'rgba(17,41,107,0.20)', boxShadow: '0 4px 16px rgba(17,41,107,0.08)' },
  workerRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer',
    transition: 'background 0.15s',
  },
  avatar: {
    width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  avatarText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 14, lineHeight: 1,
  },
  workerInfo: { flex: 1, minWidth: 0 },
  workerName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#0D1B3E', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  workerId: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#8892AB', marginTop: 2 },
  workerMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  workerSite: { fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#4A5578', fontWeight: 500 },
  expandedDetails: {
    borderTop: '1px solid #EEF0F8',
    background: '#F7F8FC',
    padding: '14px 18px',
  },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 24px' },
  detailItem: {},
  detailLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#8892AB',
    letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0,
  },
  detailValue: {
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: '#0D1B3E', marginTop: 2,
  },
};