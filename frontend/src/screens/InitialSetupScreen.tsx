import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';

interface InitialSetupScreenProps {
  onSetupComplete: (role: 'admin' | 'supervisor') => void;
}

export const InitialSetupScreen: React.FC<InitialSetupScreenProps> = ({ onSetupComplete }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'profile' | 'credentials'>(('profile'));
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  const t = lang === 'en' ? {
    setup: 'Initial Setup',
    setupSub: 'Create your administrator account to get started',
    profile: 'Your Profile',
    credentials: 'Login Credentials',
    fullName: 'Full Name',
    email: 'Email Address',
    emailOptional: 'Email (Optional)',
    username: 'Username',
    password: 'Password',
    confirm: 'Confirm Password',
    next: 'Continue',
    back: 'Back',
    create: 'Create Admin Account',
    creating: 'Setting up…',
    namePh: 'John Doe',
    emailPh: 'john@example.com',
    userPh: 'admin_user',
    passPh: '••••••',
    done: 'Setup Complete!',
    doneSub: 'Admin account created. Redirecting…',
  } : {
    setup: 'प्रारंभिक सेटअप',
    setupSub: 'शुरू करने के लिए अपना व्यवस्थापक खाता बनाएं',
    profile: 'आपकी प्रोफ़ाइल',
    credentials: 'लॉगिन क्रेडेंशियल',
    fullName: 'पूरा नाम',
    email: 'ईमेल पता',
    emailOptional: 'ईमेल (वैकल्पिक)',
    username: 'उपयोगकर्ता नाम',
    password: 'पासवर्ड',
    confirm: 'पासवर्ड की पुष्टि करें',
    next: 'जारी रखें',
    back: 'वापस',
    create: 'व्यवस्थापक खाता बनाएं',
    creating: 'सेटअप हो रहा है…',
    namePh: 'राम कुमार',
    emailPh: 'ram@example.com',
    userPh: 'admin_user',
    passPh: '••••••',
    done: 'सेटअप पूर्ण!',
    doneSub: 'व्यवस्थापक खाता बनाया गया। पुनर्निर्देशित हो रहा है…',
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!username || !password || !fullName) throw new Error('Please fill in all required fields');
      if (password !== confirmPassword) throw new Error('Passwords do not match');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      if (username.length < 3) throw new Error('Username must be at least 3 characters');
      await dbService.init();
      const existingUser = await dbService.getUserByUsername(username);
      if (existingUser) throw new Error('Username already exists');
      const newUser = await authService.createUserAccount(username, password, 'admin', {
        full_name: fullName,
        email: email || undefined,
      });
      await dbService.addUser(newUser);
      const session = await authService.authenticateUser(username, password, newUser);
      if (session) {
        setSuccess(true);
        localStorage.setItem('auth_session', JSON.stringify(session));
        setTimeout(() => onSetupComplete('admin'), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.successCard} className="fade-in">
          <div style={styles.successIcon}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#16A34A' }}>
              check_circle
            </span>
          </div>
          <h2 style={styles.successTitle}>{t.done}</h2>
          <p style={styles.successSub}>{t.doneSub}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* BG decor */}
      <div style={styles.bgDecor} />

      {/* Lang toggle */}
      <div style={styles.langRow}>
        {(['en', 'hi'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{ ...styles.langBtn, ...(lang === l ? styles.langBtnActive : {}) }}
          >
            {l === 'en' ? 'EN' : 'हिं'}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.cardHeader}>
          <div style={styles.logoBox}>
            <img
              src="/nhai-logo.png"
              alt="NHAI"
              style={styles.logo}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <span style={styles.logoFallback}>N</span>
          </div>
          <div>
            <h1 style={styles.cardTitle}>{t.setup}</h1>
            <p style={styles.cardSubtitle}>{t.setupSub}</p>
          </div>
        </div>

        {/* Step indicator */}
        <div style={styles.steps}>
          {['profile', 'credentials'].map((s, i) => (
            <React.Fragment key={s}>
              <div style={styles.stepItem}>
                <div
                  style={{
                    ...styles.stepDot,
                    ...(step === s
                      ? styles.stepDotActive
                      : i === 0 && step === 'credentials'
                      ? styles.stepDotDone
                      : styles.stepDotInactive),
                  }}
                >
                  {i === 0 && step === 'credentials' ? (
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>
                  ) : (
                    i + 1
                  )}
                </div>
                <span style={{ ...styles.stepLabel, ...(step === s ? styles.stepLabelActive : {}) }}>
                  {i === 0 ? t.profile : t.credentials}
                </span>
              </div>
              {i === 0 && (
                <div
                  style={{
                    ...styles.stepLine,
                    background: step === 'credentials' ? '#11296B' : '#DDE1EC',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox} className="fade-in">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#BF0603' }}>error</span>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={step === 'credentials' ? handleSetup : (e) => { e.preventDefault(); setStep('credentials'); }} style={styles.form}>
          {step === 'profile' ? (
            <>
              <div style={styles.field}>
                <label className="nhai-label">{t.fullName} *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.namePh}
                  className="nhai-input"
                  disabled={loading}
                />
              </div>
              <div style={styles.field}>
                <label className="nhai-label">{t.emailOptional}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPh}
                  className="nhai-input"
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <>
              <div style={styles.field}>
                <label className="nhai-label">{t.username} *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.userPh}
                  className="nhai-input"
                  disabled={loading}
                />
              </div>
              <div style={styles.field}>
                <label className="nhai-label">{t.password} *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passPh}
                  className="nhai-input"
                  disabled={loading}
                />
              </div>
              <div style={styles.field}>
                <label className="nhai-label">{t.confirm} *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.passPh}
                  className="nhai-input"
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div style={styles.btnRow}>
            {step === 'credentials' && (
              <button
                type="button"
                onClick={() => setStep('profile')}
                className="nhai-btn-secondary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                {t.back}
              </button>
            )}
            <button
              type="submit"
              className="nhai-btn-primary"
              style={{ flex: 2 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>sync</span>
                  {t.creating}
                </>
              ) : step === 'profile' ? (
                <>
                  {t.next}
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>admin_panel_settings</span>
                  {t.create}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
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
  },
  bgDecor: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(17,41,107,0.05) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  langRow: {
    position: 'absolute',
    top: 16,
    right: 16,
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
  },
  langBtnActive: {
    background: '#FFFFFF',
    color: '#11296B',
    boxShadow: '0 1px 4px rgba(17,41,107,0.12)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#FFFFFF',
    border: '1px solid #DDE1EC',
    borderRadius: 24,
    boxShadow: '0 8px 40px rgba(17,41,107,0.10)',
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    position: 'relative',
    zIndex: 1,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logoBox: {
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
  logoFallback: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 22,
    color: 'white',
  },
  cardTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 22,
    color: '#0D1B3E',
    margin: 0,
    lineHeight: 1.2,
  },
  cardSubtitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#8892AB',
    margin: '3px 0 0',
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  stepDotActive: {
    background: '#11296B',
    color: 'white',
  },
  stepDotDone: {
    background: '#16A34A',
    color: 'white',
  },
  stepDotInactive: {
    background: '#EDEFF5',
    color: '#8892AB',
  },
  stepLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: '#8892AB',
  },
  stepLabelActive: {
    color: '#11296B',
  },
  stepLine: {
    flex: 1,
    height: 2,
    borderRadius: 999,
    transition: 'background 0.3s',
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
  btnRow: {
    display: 'flex',
    gap: 10,
    marginTop: 4,
  },
  successCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    background: '#FFFFFF',
    border: '1px solid #DDE1EC',
    borderRadius: 24,
    padding: 40,
    boxShadow: '0 8px 40px rgba(17,41,107,0.10)',
    textAlign: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: '#F0FDF4',
    border: '2px solid #BBF7D0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: 22,
    color: '#0D1B3E',
    margin: 0,
  },
  successSub: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: '#8892AB',
    margin: 0,
  },
};