import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { syncService } from '../services/syncService';

interface LoginScreenProps {
  onLoginSuccess: (role: 'admin' | 'supervisor') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalWorkers: 0, pendingSyncCount: 0 });
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  const t = {
    en: {
      title: 'Welcome back',
      subtitle: 'Sign in to your NHAI Field Auth account',
      workers: 'Workers Enrolled',
      pendingSync: 'Pending Sync',
      username: 'Username',
      password: 'Password',
      usernamePh: 'Enter your username',
      passwordPh: 'Enter your password',
      login: 'Sign In',
      loggingIn: 'Signing in…',
      footer: 'Secured by AES-256 encryption · Role-based access control',
      system: 'NHAI Biometric Field Authentication System',
    },
    hi: {
      title: 'स्वागत है',
      subtitle: 'NHAI फ़ील्ड ऑथ खाते में साइन इन करें',
      workers: 'नामांकित कर्मी',
      pendingSync: 'लंबित सिंक',
      username: 'उपयोगकर्ता नाम',
      password: 'पासवर्ड',
      usernamePh: 'उपयोगकर्ता नाम दर्ज करें',
      passwordPh: 'पासवर्ड दर्ज करें',
      login: 'साइन इन करें',
      loggingIn: 'साइन इन हो रहा है…',
      footer: 'AES-256 एन्क्रिप्शन · भूमिका-आधारित अभिगम नियंत्रण',
      system: 'NHAI बायोमेट्रिक फ़ील्ड प्रमाणीकरण प्रणाली',
    },
  }[lang];

  useEffect(() => {
    const loadStats = async () => {
      try {
        await dbService.init();
        const workers = await dbService.getAllWorkers();
        const queue = await dbService.getSyncQueue();
        setStats({ totalWorkers: workers.length, pendingSyncCount: queue.length });
      } catch {}
    };
    loadStats();
    const unsub = syncService.subscribe(loadStats);
    return () => unsub();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (!username || !password) throw new Error('Please enter username and password');
      await dbService.init();
      const user = await dbService.getUserByUsername(username);
      if (!user) throw new Error('Invalid username or password');
      const session = await authService.authenticateUser(username, password, user);
      if (!session) throw new Error('Invalid username or password');
      localStorage.setItem('auth_session', JSON.stringify(session));
      onLoginSuccess(user.role as 'admin' | 'supervisor');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Login failed');
      setPassword('');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Background decoration */}
      <div style={styles.bgDecor1} />
      <div style={styles.bgDecor2} />

      {/* Language toggle */}
      <div style={styles.langToggle}>
        <button
          onClick={() => setLang('en')}
          style={{ ...styles.langBtn, ...(lang === 'en' ? styles.langBtnActive : {}) }}
        >
          EN
        </button>
        <button
          onClick={() => setLang('hi')}
          style={{ ...styles.langBtn, ...(lang === 'hi' ? styles.langBtnActive : {}) }}
        >
          हिं
        </button>
      </div>

      <div style={styles.card} className={shake ? 'shake' : ''}>
        {/* Logo + Brand */}
        <div style={styles.brandSection}>
          <div style={styles.logoWrap}>
            <img
              src="/nhai-logo.png"
              alt="NHAI"
              style={styles.logo}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <span style={styles.logoChar}>N</span>
          </div>
          <div>
            <h1 style={styles.cardTitle}>{t.title}</h1>
            <p style={styles.cardSubtitle}>{t.subtitle}</p>
          </div>
        </div>

        {/* System label */}
        <div style={styles.systemLabel}>
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>shield</span>
          <span style={styles.systemText}>{t.system}</span>
        </div>

        {/* Quick stats */}
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <span style={styles.statNum}>{stats.totalWorkers}</span>
            <span style={styles.statLabel}>{t.workers}</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statBox}>
            <span
              style={{
                ...styles.statNum,
                color: stats.pendingSyncCount > 0 ? '#BF0603' : '#16A34A',
              }}
            >
              {stats.pendingSyncCount}
            </span>
            <span style={styles.statLabel}>{t.pendingSync}</span>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={styles.errorBox} className="fade-in">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#BF0603' }}>
              error
            </span>
            <span style={styles.errorText}>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          {/* Username */}
          <div style={styles.field}>
            <label className="nhai-label">{t.username}</label>
            <div style={styles.inputWrap}>
              <span
                className="material-symbols-outlined"
                style={styles.inputIcon}
              >
                person
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePh}
                className="nhai-input"
                style={{ paddingLeft: 42 }}
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label className="nhai-label">{t.password}</label>
            <div style={styles.inputWrap}>
              <span
                className="material-symbols-outlined"
                style={styles.inputIcon}
              >
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPh}
                className="nhai-input"
                style={{ paddingLeft: 42, paddingRight: 44 }}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="nhai-btn-primary"
            style={{ width: '100%', marginTop: 4 }}
          >
            {loading ? (
              <>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}
                >
                  sync
                </span>
                {t.loggingIn}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  login
                </span>
                {t.login}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footerText}>{t.footer}</p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .shake { animation: shake 0.5s ease-out; }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgDecor1: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(17,41,107,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgDecor2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,203,5,0.10) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  langToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    display: 'flex',
    background: '#EDEFF5',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  langBtn: {
    padding: '4px 10px',
    borderRadius: 7,
    border: 'none',
    background: 'transparent',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    color: '#8892AB',
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: '0.04em',
  },
  langBtnActive: {
    background: '#FFFFFF',
    color: '#11296B',
    boxShadow: '0 1px 4px rgba(17,41,107,0.12)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#FFFFFF',
    border: '1px solid #DDE1EC',
    borderRadius: 24,
    boxShadow: '0 8px 40px rgba(17,41,107,0.10), 0 2px 8px rgba(17,41,107,0.06)',
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    position: 'relative',
    zIndex: 1,
  },
  brandSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #11296B, #00509D)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    boxShadow: '0 4px 16px rgba(17,41,107,0.25)',
  },
  logo: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    padding: 6,
    background: 'white',
    borderRadius: 14,
  },
  logoChar: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 22,
    color: 'white',
    lineHeight: 1,
  },
  cardTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 22,
    color: '#0D1B3E',
    lineHeight: 1.2,
    margin: 0,
  },
  cardSubtitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: '#8892AB',
    margin: '3px 0 0 0',
  },
  systemLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(17,41,107,0.05)',
    border: '1px solid rgba(17,41,107,0.10)',
    borderRadius: 8,
    padding: '6px 12px',
    color: '#11296B',
  },
  systemText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    color: '#11296B',
    letterSpacing: '0.02em',
  },
  statsRow: {
    display: 'flex',
    background: '#F7F8FC',
    border: '1px solid #EEF0F8',
    borderRadius: 14,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 8px',
    gap: 2,
  },
  statNum: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 24,
    color: '#11296B',
    lineHeight: 1,
  },
  statLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 10,
    fontWeight: 600,
    color: '#8892AB',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    background: '#EEF0F8',
    margin: '8px 0',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 10,
    padding: '10px 14px',
  },
  errorText: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: '#BF0603',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 18,
    color: '#8892AB',
    pointerEvents: 'none',
    zIndex: 1,
  } as React.CSSProperties,
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#8892AB',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  } as React.CSSProperties,
  footerText: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    color: '#8892AB',
    textAlign: 'center',
    lineHeight: 1.5,
  },
};