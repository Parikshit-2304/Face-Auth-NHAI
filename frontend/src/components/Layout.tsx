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
  currentUser,
}) => {
  const [isOnline, setIsOnline] = useState(syncService.isDeviceOnline());
  const [syncing, setSyncing] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleSyncUpdate = () => {
      setIsOnline(syncService.isDeviceOnline());
      setSyncing(syncService.isSyncInProgress());
    };
    const unsubscribe = syncService.subscribe(handleSyncUpdate);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const el = document.querySelector('main');
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    await syncService.syncNow();
    setSyncing(false);
  };

  return (
    <div style={styles.root}>
      {/* ── TOP HEADER ─────────────────────────────────────── */}
      <header style={{ ...styles.header, ...(scrolled ? styles.headerScrolled : {}) }}>
        {/* Brand */}
        <button
          onClick={() => onNavigate?.('dashboard')}
          style={styles.brand}
        >
          {/* NHAI Logo placeholder — swap src when bundling */}
          <div style={styles.logoBox}>
            <img
              src="../src/assets/nhai-logo.png"
              alt="NHAI"
              style={styles.logoImg}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <span style={styles.logoFallback}>N</span>
          </div>
          <div style={styles.brandText}>
            <span style={styles.brandName}>NHAI</span>
            <span style={styles.brandSub}>Field Auth Platform</span>
          </div>
        </button>

        {/* Right controls */}
        <div style={styles.headerRight}>
          {/* Connectivity pill */}
          <div
            onClick={() => syncService.setForcedOffline(isOnline)}
            style={{
              ...styles.connectPill,
              background: isOnline
                ? 'rgba(22,163,74,0.10)'
                : 'rgba(191,6,3,0.10)',
              border: `1px solid ${isOnline ? 'rgba(22,163,74,0.25)' : 'rgba(191,6,3,0.25)'}`,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                ...styles.dot,
                background: isOnline ? '#16A34A' : '#BF0603',
                boxShadow: isOnline
                  ? '0 0 0 3px rgba(22,163,74,0.20)'
                  : '0 0 0 3px rgba(191,6,3,0.20)',
              }}
            />
            <span
              style={{
                ...styles.connectLabel,
                color: isOnline ? '#16A34A' : '#BF0603',
              }}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Sync button */}
          {role !== 'guest' && (
            <button
              onClick={triggerSync}
              title="Sync now"
              style={styles.iconBtn}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 18,
                  animation: syncing ? 'spin 1s linear infinite' : 'none',
                  color: '#11296B',
                }}
              >
                sync
              </span>
            </button>
          )}

          {/* User avatar */}
          {role !== 'guest' && currentUser && (
            <button onClick={onLogout} style={styles.userBtn}>
              <div style={styles.userMeta}>
                <span style={styles.userName}>@{currentUser.username}</span>
                <span style={styles.userRole}>{currentUser.role.toUpperCase()}</span>
              </div>
              <div style={styles.avatar}>
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────── */}
      <main style={styles.main}>{children}</main>

      {/* ── STATUS BAR ─────────────────────────────────────── */}
      <footer style={styles.footer}>
        <div style={styles.footerLeft}>
          {!isOnline ? (
            <div style={{ ...styles.statusPill, ...styles.statusOffline }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 13 }}
              >
                signal_cellular_connected_no_internet_4_bar
              </span>
              <span>OFFLINE — LOCAL AUTH ACTIVE</span>
            </div>
          ) : (
            <div style={{ ...styles.statusPill, ...styles.statusOnline }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 13 }}
              >
                verified_user
              </span>
              <span>SECURED AWS NODE</span>
            </div>
          )}
        </div>
        <div style={styles.footerRight}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 13, color: '#8892AB' }}
          >
            lock
          </span>
          <span style={styles.footerMono}>AES-256 · v3.0</span>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #F7F8FC; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .nhai-card {
          background: #ffffff;
          border: 1px solid #DDE1EC;
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(17,41,107,0.06);
          transition: box-shadow 0.2s, transform 0.15s, border-color 0.2s;
        }
        .nhai-card:hover {
          box-shadow: 0 4px 16px rgba(17,41,107,0.10);
          border-color: rgba(17,41,107,0.20);
        }
        .nhai-card-action {
          cursor: pointer;
        }
        .nhai-card-action:hover {
          transform: translateY(-1px);
        }
        .nhai-card-action:active {
          transform: scale(0.98);
        }

        .nhai-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #11296B;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.01em;
          padding: 12px 20px;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 2px 8px rgba(17,41,107,0.20);
          outline: none;
        }
        .nhai-btn-primary:hover { background: #0D1B3E; box-shadow: 0 4px 16px rgba(17,41,107,0.30); }
        .nhai-btn-primary:active { transform: scale(0.97); }
        .nhai-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .nhai-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: transparent;
          color: #11296B;
          border: 1.5px solid #DDE1EC;
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          padding: 11px 20px;
          cursor: pointer;
          transition: all 0.15s;
          outline: none;
        }
        .nhai-btn-secondary:hover { border-color: #11296B; background: rgba(17,41,107,0.04); }
        .nhai-btn-secondary:active { transform: scale(0.97); }
        .nhai-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

        .nhai-btn-danger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: transparent;
          color: #BF0603;
          border: 1.5px solid rgba(191,6,3,0.25);
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          padding: 11px 20px;
          cursor: pointer;
          transition: all 0.15s;
          outline: none;
        }
        .nhai-btn-danger:hover { background: rgba(191,6,3,0.05); border-color: rgba(191,6,3,0.50); }
        .nhai-btn-danger:active { transform: scale(0.97); }

        .nhai-input {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #DDE1EC;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #0D1B3E;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .nhai-input:focus { border-color: #11296B; box-shadow: 0 0 0 3px rgba(17,41,107,0.10); }
        .nhai-input::placeholder { color: #8892AB; }
        .nhai-input:disabled { background: #F7F8FC; opacity: 0.7; }

        .nhai-label {
          display: block;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #4A5578;
          margin-bottom: 6px;
        }

        .nhai-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 999px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .nhai-badge-primary { background: rgba(17,41,107,0.08); color: #11296B; border: 1px solid rgba(17,41,107,0.15); }
        .nhai-badge-success { background: #F0FDF4; color: #16A34A; border: 1px solid #BBF7D0; }
        .nhai-badge-warning { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
        .nhai-badge-error { background: #FEF2F2; color: #BF0603; border: 1px solid #FECACA; }
        .nhai-badge-gold { background: rgba(255,203,5,0.15); color: #92710A; border: 1px solid rgba(255,203,5,0.40); }

        .skeleton {
          background: linear-gradient(90deg, #EDEFF5 25%, #DDE1EC 50%, #EDEFF5 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }

        .fade-in { animation: fadeIn 0.35s ease-out both; }
        .slide-up { animation: slideUp 0.35s ease-out both; }

        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #DDE1EC; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #8892AB; }

        /* Toggle switch */
        .toggle-track {
          position: relative;
          width: 44px;
          height: 24px;
          border-radius: 999px;
          background: #DDE1EC;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .toggle-track.on { background: #11296B; }
        .toggle-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .toggle-track.on .toggle-thumb { transform: translateX(20px); }

        /* Range slider */
        input[type=range] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: #EDEFF5;
          border-radius: 999px;
          outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: #11296B;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(17,41,107,0.30);
          border: 2px solid white;
        }
      `}</style>
    </div>
  );
};

// ── Styles ───────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#F7F8FC',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: 64,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #EEF0F8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    transition: 'box-shadow 0.2s',
  },
  headerScrolled: {
    boxShadow: '0 4px 20px rgba(17,41,107,0.08)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'none',
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #11296B, #00509D)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(17,41,107,0.25)',
    position: 'relative',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    padding: 4,
    position: 'absolute',
    inset: 0,
    background: 'white',
  },
  logoFallback: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 18,
    color: 'white',
    lineHeight: 1,
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  brandName: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 16,
    color: '#11296B',
    lineHeight: 1.1,
    letterSpacing: '0.02em',
  },
  brandSub: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 10,
    color: '#8892AB',
    letterSpacing: '0.05em',
    marginTop: 1,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  connectPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 999,
    cursor: 'pointer',
    userSelect: 'none',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },
  connectLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  iconBtn: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F7F8FC',
    border: '1px solid #DDE1EC',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  userBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: '1px solid #DDE1EC',
    borderRadius: 10,
    padding: '4px 8px 4px 10px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  userMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  userName: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    color: '#0D1B3E',
    lineHeight: 1.2,
  },
  userRole: {
    fontSize: 9,
    color: '#8892AB',
    letterSpacing: '0.08em',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #11296B, #00509D)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: '0.03em',
  },
  main: {
    flex: 1,
    paddingTop: 64 + 16,
    paddingBottom: 52 + 16,
    paddingLeft: 20,
    paddingRight: 20,
    width: '100%',
    maxWidth: 960,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid #EEF0F8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    zIndex: 100,
  },
  footerLeft: { display: 'flex', alignItems: 'center' },
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 10px',
    borderRadius: 999,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  statusOnline: {
    background: 'rgba(22,163,74,0.08)',
    color: '#16A34A',
    border: '1px solid rgba(22,163,74,0.20)',
  },
  statusOffline: {
    background: 'rgba(191,6,3,0.08)',
    color: '#BF0603',
    border: '1px solid rgba(191,6,3,0.20)',
  },
  footerMono: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: '#8892AB',
    letterSpacing: '0.05em',
  },
};