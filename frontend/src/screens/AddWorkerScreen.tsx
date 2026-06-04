import React, { useState, useEffect, useRef } from 'react';
import { biometricService } from '../services/biometricService';
import { dbService } from '../services/dbService';
import { CameraViewfinder } from '../components/CameraViewfinder';

type Step = 'details' | 'front' | 'left' | 'right' | 'saving' | 'done';

export const AddWorkerScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [siteId, setSiteId] = useState('');
  const [statusMessage, setStatusMessage] = useState('Initializing camera…');
  const [modelsReady, setModelsReady] = useState(false);
  const [error, setError] = useState('');
  const [embeddings, setEmbeddings] = useState<{ front?: number[]; left?: number[]; right?: number[] }>({});
  const [livenessChallenge, setLivenessChallenge] = useState<'Blink' | 'Look Left' | 'Look Right'>('Blink');
  const [challengeHistory] = useState({ eyesClosed: false, leftTurnCount: 0, rightTurnCount: 0, upTurnCount: 0 });
  const capturedRef = useRef<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        await biometricService.loadFaceMesh();
        await biometricService.loadMobileFaceNet();
        setModelsReady(true);
        setStatusMessage('Biometric engines online.');
      } catch (e: any) {
        setError('Failed to load biometric models: ' + (e?.message || String(e)));
      }
    })();
  }, []);

  useEffect(() => {
    if (step === 'front') setLivenessChallenge('Blink');
    else if (step === 'left') setLivenessChallenge('Look Left');
    else if (step === 'right') setLivenessChallenge('Look Right');
    capturedRef.current = false;
  }, [step]);

  const handleCapture = async (video: HTMLVideoElement, detection: any) => {
    if (capturedRef.current) return;
    capturedRef.current = true;
    setStatusMessage(`Captured ${step} profile. Generating embedding…`);
    try {
      const embedding = await biometricService.generateEmbedding(video, detection);
      setEmbeddings((prev) => {
        const next = { ...prev, [step]: embedding };
        setTimeout(() => {
          if (step === 'front') setStep('left');
          else if (step === 'left') setStep('right');
          else if (step === 'right') saveWorker(next);
        }, 900);
        return next;
      });
    } catch {
      setError('Biometric generation failed. Retrying…');
      capturedRef.current = false;
    }
  };

  const saveWorker = async (completed: typeof embeddings) => {
    if (!completed.front || !completed.left || !completed.right) {
      setError('Missing required profiles.');
      setStep('details');
      return;
    }
    setStep('saving');
    try {
      const workerId = 'WRK-' + crypto.randomUUID().substring(0, 8).toUpperCase();
      await dbService.addWorker({
        worker_id: workerId,
        name: name.trim(),
        site_id: siteId.trim() || 'default_site',
        embedding_front: completed.front,
        embedding_left: completed.left,
        embedding_right: completed.right,
        created_at: new Date().toISOString(),
      });
      setStep('done');
    } catch {
      setError('Failed to store worker in database.');
      setStep('details');
    }
  };

  const startEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter worker name.'); return; }
    setError('');
    setStep('front');
  };

  // ── Capture progress ─────────────────────────────────────
  const captureSteps = [
    { key: 'front', label: 'Front View', icon: 'face', desc: 'Look directly at the camera' },
    { key: 'left', label: 'Left Profile', icon: 'arrow_back', desc: 'Slowly turn your head left' },
    { key: 'right', label: 'Right Profile', icon: 'arrow_forward', desc: 'Slowly turn your head right' },
  ];
  const currentCapStep = captureSteps.findIndex((s) => s.key === step);

  // ── DONE ─────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div style={styles.page} className="fade-in">
        <div style={styles.successCard}>
          <div style={styles.successRing}>
            <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#16A34A' }}>
              how_to_reg
            </span>
          </div>
          <h2 style={styles.successTitle}>Enrollment Complete</h2>
          <p style={styles.successDesc}>
            Worker <strong>{name}</strong> has been securely enrolled. Biometrics are AES-256 encrypted.
          </p>
          <div style={styles.successMeta}>
            {[
              { icon: 'verified_user', text: 'AES-256-GCM encrypted' },
              { icon: 'cloud_queue', text: 'Queued for cloud sync' },
              { icon: 'face', text: '3 biometric profiles captured' },
            ].map((item) => (
              <div key={item.text} style={styles.successMetaItem}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#16A34A' }}>{item.icon}</span>
                <span style={styles.successMetaText}>{item.text}</span>
              </div>
            ))}
          </div>
          <button onClick={onBack} className="nhai-btn-primary" style={{ width: '100%' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>dashboard</span>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── SAVING ───────────────────────────────────────────────
  if (step === 'saving') {
    return (
      <div style={styles.page}>
        <div style={styles.savingCard}>
          <div style={styles.savingSpinner}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#11296B', animation: 'spin 1s linear infinite' }}>
              sync
            </span>
          </div>
          <h3 style={styles.savingTitle}>Encrypting & Saving</h3>
          <p style={styles.savingDesc}>{statusMessage}</p>
        </div>
      </div>
    );
  }

  // ── DETAILS FORM ─────────────────────────────────────────
  if (step === 'details') {
    return (
      <div style={styles.page} className="fade-in">
        {/* Back header */}
        <div style={styles.screenHeader}>
          <button onClick={onBack} style={styles.backBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <h2 style={styles.screenTitle}>Enroll Worker</h2>
            <p style={styles.screenSub}>Step 1 of 4 · Profile Details</p>
          </div>
        </div>

        {/* Process overview */}
        <div className="nhai-card" style={styles.processCard}>
          <p style={styles.processLabel}>Enrollment Process</p>
          <div style={styles.processSteps}>
            {['Details', 'Front View', 'Left Profile', 'Right Profile'].map((s, i) => (
              <div key={s} style={styles.processStep}>
                <div style={{ ...styles.processStepDot, background: i === 0 ? '#11296B' : '#DDE1EC' }}>
                  <span style={{ ...styles.processStepNum, color: i === 0 ? 'white' : '#8892AB' }}>{i + 1}</span>
                </div>
                <span style={{ ...styles.processStepLabel, color: i === 0 ? '#11296B' : '#8892AB' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="nhai-card" style={{ padding: 24 }}>
          <form onSubmit={startEnrollment} style={styles.form}>
            {error && (
              <div style={styles.errorBox} className="fade-in">
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#BF0603' }}>error</span>
                <span style={styles.errorText}>{error}</span>
              </div>
            )}
            <div style={styles.field}>
              <label className="nhai-label">Worker Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="nhai-input"
              />
            </div>
            <div style={styles.field}>
              <label className="nhai-label">Site ID / Location</label>
              <input
                type="text"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="e.g. NH-2-DELHI"
                className="nhai-input"
              />
            </div>
            {!modelsReady && (
              <div style={styles.modelLoadingBar}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#11296B', animation: 'spin 1s linear infinite' }}>sync</span>
                <span style={styles.modelLoadingText}>Loading biometric AI models…</span>
              </div>
            )}
            <button
              type="submit"
              disabled={!modelsReady}
              className="nhai-btn-primary"
              style={{ width: '100%' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>photo_camera</span>
              {modelsReady ? 'Proceed to Camera Capture' : 'Loading Models…'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── CAMERA STAGES ─────────────────────────────────────────
  const angleLabel = step === 'front' ? 'Front View' : step === 'left' ? 'Left Profile' : 'Right Profile';
  const progressPct = step === 'front' ? 33 : step === 'left' ? 66 : 90;

  return (
    <div style={styles.page} className="fade-in">
      {/* Header */}
      <div style={styles.screenHeader}>
        <button
          onClick={() => {
            if (step === 'right') setStep('left');
            else if (step === 'left') setStep('front');
            else setStep('details');
          }}
          style={styles.backBtn}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={styles.screenTitle}>Biometric Capture</h2>
          <p style={styles.screenSub}>Worker: <strong>{name}</strong></p>
        </div>
        <div className="nhai-badge nhai-badge-primary">{angleLabel}</div>
      </div>

      {/* Progress */}
      <div style={styles.progressRow}>
        {captureSteps.map((s, i) => (
          <div key={s.key} style={styles.progressItem}>
            <div
              style={{
                ...styles.progressDot,
                background:
                  i < currentCapStep
                    ? '#16A34A'
                    : i === currentCapStep
                    ? '#11296B'
                    : '#DDE1EC',
                border: i === currentCapStep ? '2px solid rgba(17,41,107,0.20)' : 'none',
              }}
            >
              {i < currentCapStep ? (
                <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'white' }}>check</span>
              ) : (
                <span style={{ ...styles.progressDotNum, color: i === currentCapStep ? 'white' : '#8892AB' }}>{i + 1}</span>
              )}
            </div>
            <span style={{ ...styles.progressDotLabel, color: i === currentCapStep ? '#11296B' : '#8892AB' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={styles.progressBarTrack}>
        <div style={{ ...styles.progressBarFill, width: `${progressPct}%` }} />
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#BF0603' }}>error</span>
          <span style={styles.errorText}>{error}</span>
        </div>
      )}

      {/* Camera */}
      <CameraViewfinder
        isActive={['front', 'left', 'right'].includes(step)}
        challenge={livenessChallenge}
        challengeHistory={challengeHistory}
        onCapture={handleCapture}
      />

      {/* Instruction */}
      <div className="nhai-card" style={styles.instructionCard}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#11296B' }}>info</span>
        <p style={styles.instructionText}>
          Align your face inside the guide circle. Follow the on-screen instruction to capture your{' '}
          <strong>{angleLabel}</strong>.
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16, paddingTop: 8 },
  screenHeader: { display: 'flex', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, background: '#F7F8FC', border: '1px solid #DDE1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#0D1B3E',
  },
  screenTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 20, color: '#0D1B3E', margin: 0 },
  screenSub: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#8892AB', marginTop: 2 },
  processCard: { padding: '14px 18px' },
  processLabel: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#8892AB', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 },
  processSteps: { display: 'flex', alignItems: 'center', gap: 12 },
  processStep: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 },
  processStepDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  processStepNum: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700 },
  processStepLabel: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 600, textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column' },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px' },
  errorText: { fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#BF0603', fontWeight: 500 },
  modelLoadingBar: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(17,41,107,0.04)', border: '1px solid rgba(17,41,107,0.10)', borderRadius: 10, padding: '8px 12px' },
  modelLoadingText: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#11296B' },
  progressRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 },
  progressDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  progressDotNum: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700 },
  progressDotLabel: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 600, textAlign: 'center' },
  progressBarTrack: { height: 4, background: '#EDEFF5', borderRadius: 999, overflow: 'hidden' },
  progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #11296B, #00509D)', borderRadius: 999, transition: 'width 0.5s ease' },
  instructionCard: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px' },
  instructionText: { fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#4A5578', lineHeight: 1.5 },
  successCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, background: '#FFFFFF', border: '1px solid #DDE1EC', borderRadius: 24, padding: 36, boxShadow: '0 8px 40px rgba(17,41,107,0.10)', textAlign: 'center', maxWidth: 400, margin: '0 auto', width: '100%' },
  successRing: { width: 80, height: 80, borderRadius: '50%', background: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: '#0D1B3E', margin: 0 },
  successDesc: { fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4A5578', margin: 0, lineHeight: 1.5 },
  successMeta: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', width: '100%' },
  successMetaItem: { display: 'flex', alignItems: 'center', gap: 8 },
  successMetaText: { fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#4A5578' },
  savingCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, background: '#FFFFFF', border: '1px solid #DDE1EC', borderRadius: 24, padding: 40, boxShadow: '0 8px 40px rgba(17,41,107,0.10)', textAlign: 'center', maxWidth: 360, margin: '40px auto', width: '100%' },
  savingSpinner: { width: 64, height: 64, borderRadius: '50%', background: 'rgba(17,41,107,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  savingTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 18, color: '#0D1B3E', margin: 0 },
  savingDesc: { fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#8892AB', margin: 0 },
};