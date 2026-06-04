import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import { syncService } from '../services/syncService';

interface SettingsScreenProps {
  onBack: () => void;
}

// ── Reusable Toggle ────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      ...toggleStyles.track,
      background: checked ? '#11296B' : '#DDE1EC',
    }}
  >
    <div
      style={{
        ...toggleStyles.thumb,
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
      }}
    />
  </div>
);

const toggleStyles: Record<string, React.CSSProperties> = {
  track: {
    position: 'relative',
    width: 44,
    height: 24,
    borderRadius: 999,
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  },
  thumb: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'white',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  },
};

// ── Setting row ────────────────────────────────────────────────
interface SettingRowProps {
  icon: string;
  label: string;
  description: string;
  children: React.ReactNode;
}
const SettingRow: React.FC<SettingRowProps> = ({ icon, label, description, children }) => (
  <div style={rowStyles.row}>
    <div style={rowStyles.iconBox}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#11296B' }}>
        {icon}
      </span>
    </div>
    <div style={rowStyles.body}>
      <span style={rowStyles.label}>{label}</span>
      <span style={rowStyles.desc}>{description}</span>
    </div>
    <div style={rowStyles.control}>{children}</div>
  </div>
);

const rowStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '16px 0',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(17,41,107,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  label: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    color: '#0D1B3E',
    lineHeight: 1.3,
  },
  desc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    color: '#8892AB',
    lineHeight: 1.5,
    maxWidth: 320,
  },
  control: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    marginTop: 4,
  },
};

// ── Section heading ────────────────────────────────────────────
const SectionHeading: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <div style={sectionStyles.heading}>
    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#8892AB' }}>
      {icon}
    </span>
    <span style={sectionStyles.headingText}>{title}</span>
  </div>
);

const sectionStyles: Record<string, React.CSSProperties> = {
  heading: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
    marginBottom: 4,
  },
  headingText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    color: '#8892AB',
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
  },
};

// ── Main component ─────────────────────────────────────────────
export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [threshold, setThreshold] = useState(() =>
    parseFloat(localStorage.getItem('nhai_match_threshold') || '0.85'),
  );
  const [bypassLiveness, setBypassLiveness] = useState(
    () => localStorage.getItem('nhai_bypass_liveness') === 'true',
  );
  const [forceFallback, setForceFallback] = useState(
    () => localStorage.getItem('nhai_force_fallback_model') === 'true',
  );
  const [awsEndpoint, setAwsEndpoint] = useState(
    () =>
      localStorage.getItem('nhai_aws_endpoint') ||
      'https://aws.nhai-auth.internal/api/v1/sync',
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem('nhai_match_threshold', threshold.toString());
    localStorage.setItem('nhai_bypass_liveness', bypassLiveness.toString());
    localStorage.setItem('nhai_force_fallback_model', forceFallback.toString());
    localStorage.setItem('nhai_aws_endpoint', awsEndpoint);
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 700);
  };

  const handleResetDatabase = async () => {
    if (
      !window.confirm(
        'Are you absolutely sure you want to delete ALL local database records? This will delete all enrolled workers and attendance logs, and cannot be undone.',
      )
    )
      return;
    try {
      await dbService.init();
      const db = (dbService as any).db;
      if (db) {
        const tx = db.transaction(
          ['workers', 'attendance', 'unverified_attendance', 'sync_queue'],
          'readwrite',
        );
        tx.objectStore('workers').clear();
        tx.objectStore('attendance').clear();
        tx.objectStore('unverified_attendance').clear();
        tx.objectStore('sync_queue').clear();
      }
      syncService.clearLogs();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (e) {
      console.error('Reset database failed:', e);
      alert('Failed to reset local database.');
    }
  };

  // Threshold level label
  const thresholdLabel =
    threshold >= 0.92 ? 'Very High' : threshold >= 0.88 ? 'High' : threshold >= 0.82 ? 'Balanced' : 'Permissive';
  const thresholdColor =
    threshold >= 0.92 ? '#16A34A' : threshold >= 0.88 ? '#11296B' : threshold >= 0.82 ? '#D97706' : '#BF0603';

  return (
    <div style={styles.page} className="fade-in">
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div>
          <h2 style={styles.title}>Settings</h2>
          <p style={styles.subtitle}>Configure biometric parameters and system settings</p>
        </div>
      </div>

      {/* ── Biometric Configuration ─────────────────────────── */}
      <div className="nhai-card" style={styles.section}>
        <SectionHeading icon="fingerprint" title="Biometric Configuration" />

        {/* Threshold slider */}
        <div style={styles.sliderSection}>
          <div style={styles.sliderHeader}>
            <div style={styles.sliderLabelWrap}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#11296B' }}>
                tune
              </span>
              <div>
                <p style={styles.sliderLabel}>Cosine Similarity Threshold</p>
                <p style={styles.sliderDesc}>
                  Higher values increase security but require better image quality.
                </p>
              </div>
            </div>
            <div style={styles.thresholdBadge}>
              <span style={{ ...styles.thresholdNum, color: thresholdColor }}>
                {(threshold * 100).toFixed(0)}%
              </span>
              <span style={{ ...styles.thresholdLevel, color: thresholdColor }}>
                {thresholdLabel}
              </span>
            </div>
          </div>

          {/* Custom slider */}
          <div style={styles.sliderTrackWrap}>
            <input
              type="range"
              min="0.70"
              max="0.98"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={styles.sliderTicks}>
              {['70%', '80%', '90%', '98%'].map((t) => (
                <span key={t} style={styles.sliderTick}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Liveness toggle */}
        <SettingRow
          icon="face"
          label="Bypass Liveness Verification"
          description="When enabled, captures instantly once face quality validates—skipping blink and head rotation tests. Useful for testing."
        >
          <Toggle checked={bypassLiveness} onChange={setBypassLiveness} />
        </SettingRow>

        <div style={styles.divider} />

        {/* Fallback model toggle */}
        <SettingRow
          icon="memory"
          label="Force Landmark Projection Fallback"
          description="Run without MobileFaceNet ONNX model, using only MediaPipe landmarks. Reduces startup memory."
        >
          <Toggle checked={forceFallback} onChange={setForceFallback} />
        </SettingRow>
      </div>

      {/* ── Cloud Configuration ──────────────────────────────── */}
      <div className="nhai-card" style={styles.section}>
        <SectionHeading icon="cloud" title="Cloud Configuration" />

        <SettingRow
          icon="dns"
          label="AWS Cloud Endpoint Gateway"
          description="The HTTPS endpoint used to sync local records to the cloud."
        >
          <></>
        </SettingRow>
        <input
          type="text"
          value={awsEndpoint}
          onChange={(e) => setAwsEndpoint(e.target.value)}
          placeholder="https://aws.nhai-auth.internal/api/v1/sync"
          className="nhai-input"
          style={{ marginTop: 4 }}
        />
      </div>

      {/* ── Save button ──────────────────────────────────────── */}
      <div style={styles.saveRow}>
        {saveSuccess && (
          <div style={styles.saveSuccess} className="fade-in">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#16A34A' }}>
              check_circle
            </span>
            <span style={styles.saveSuccessText}>Settings saved successfully</span>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="nhai-btn-primary"
          style={{ marginLeft: 'auto' }}
        >
          {saving ? (
            <>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 15, animation: 'spin 1s linear infinite' }}
              >
                sync
              </span>
              Saving…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>save</span>
              Save Configuration
            </>
          )}
        </button>
      </div>

      {/* ── Danger Zone ─────────────────────────────────────── */}
      <div style={styles.dangerZone}>
        <div style={styles.dangerHeader}>
          <div style={styles.dangerIconBox}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#BF0603' }}>
              warning
            </span>
          </div>
          <div>
            <p style={styles.dangerTitle}>Danger Zone</p>
            <p style={styles.dangerDesc}>
              Destructive operations that cannot be undone. Verify with supervisors before proceeding.
            </p>
          </div>
        </div>

        {resetSuccess && (
          <div style={styles.resetSuccess} className="fade-in">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#16A34A' }}>
              check_circle
            </span>
            <span style={styles.resetSuccessText}>
              All database tables cleared. System has been reset.
            </span>
          </div>
        )}

        <div style={styles.dangerRow}>
          <div>
            <p style={styles.dangerActionLabel}>Purge & Clear Local Database</p>
            <p style={styles.dangerActionDesc}>
              Permanently deletes all enrolled workers, attendance logs, and sync queue entries.
            </p>
          </div>
          <button
            onClick={handleResetDatabase}
            className="nhai-btn-danger"
            style={{ flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              delete_forever
            </span>
            Purge Database
          </button>
        </div>
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
    paddingTop: 8,
    maxWidth: 640,
    width: '100%',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#F7F8FC',
    border: '1px solid #DDE1EC',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    color: '#0D1B3E',
  },
  title: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 22,
    color: '#0D1B3E',
    margin: 0,
  },
  subtitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#8892AB',
    marginTop: 2,
  },
  section: {
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
  },
  divider: {
    height: 1,
    background: '#EEF0F8',
    margin: '4px 0',
  },
  // Slider
  sliderSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '14px 0',
  },
  sliderHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sliderLabelWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  sliderLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    color: '#0D1B3E',
    margin: 0,
    lineHeight: 1.3,
  },
  sliderDesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    color: '#8892AB',
    margin: '3px 0 0',
    lineHeight: 1.5,
  },
  thresholdBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 1,
  },
  thresholdNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1,
  },
  thresholdLevel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  sliderTrackWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sliderTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingLeft: 2,
    paddingRight: 2,
  },
  sliderTick: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: '#8892AB',
  },
  // Save row
  saveRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  saveSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: 8,
    padding: '6px 12px',
  },
  saveSuccessText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: '#16A34A',
  },
  // Danger zone
  dangerZone: {
    background: '#FFFAFA',
    border: '1px solid rgba(191,6,3,0.20)',
    borderRadius: 20,
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  dangerHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  dangerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(191,6,3,0.08)',
    border: '1px solid rgba(191,6,3,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dangerTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    color: '#BF0603',
    margin: 0,
  },
  dangerDesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#8892AB',
    marginTop: 3,
    lineHeight: 1.5,
  },
  dangerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    background: 'rgba(191,6,3,0.04)',
    border: '1px solid rgba(191,6,3,0.12)',
    borderRadius: 12,
    padding: '14px 16px',
  },
  dangerActionLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    color: '#0D1B3E',
    margin: 0,
  },
  dangerActionDesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    color: '#8892AB',
    marginTop: 3,
    lineHeight: 1.4,
  },
  resetSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: 10,
    padding: '10px 14px',
  },
  resetSuccessText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: '#16A34A',
  },
};