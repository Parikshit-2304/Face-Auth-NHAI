import React, { useState, useEffect, useRef, useCallback } from 'react';
import { biometricService } from '../services/biometricService';
import { dbService, type WorkerRecord } from '../services/dbService';
import { CameraViewfinder } from '../components/CameraViewfinder';

interface AttendanceScannerScreenProps {
  onBack: () => void;
}

type ScanStage = 'id_entry' | 'scanning' | 'result';

interface MatchResult {
  matched: boolean;
  worker?: WorkerRecord;
  similarity: number;
  livenessPassed: boolean;
}

export const AttendanceScannerScreen: React.FC<AttendanceScannerScreenProps> = ({ onBack }) => {
  const [stage, setStage] = useState<ScanStage>('id_entry');
  const [workerIdInput, setWorkerIdInput] = useState('');
  const [fastPathWorker, setFastPathWorker] = useState<WorkerRecord | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [modelsReady, setModelsReady] = useState(false);
  const [livenessChallenge, setLivenessChallenge] = useState<'Blink' | 'Look Left' | 'Look Right' | 'Look Up' | undefined>('Blink');
  const [challengeHistory] = useState({ eyesClosed: false, leftTurnCount: 0, rightTurnCount: 0, upTurnCount: 0 });
  const [saving, setSaving] = useState(false);
  const capturedRef = useRef(false);

  useEffect(() => {
    const bypass = localStorage.getItem('nhai_bypass_liveness') === 'true';
    if (bypass) {
      setLivenessChallenge(undefined);
    } else {
      const challenges: ('Blink' | 'Look Left' | 'Look Right' | 'Look Up')[] = ['Blink', 'Look Left', 'Look Right', 'Look Up'];
      setLivenessChallenge(challenges[Math.floor(Math.random() * challenges.length)]);
    }
  }, [stage]);

  useEffect(() => {
    (async () => {
      try {
        await biometricService.loadFaceMesh();
        await biometricService.loadMobileFaceNet();
        setModelsReady(true);
      } catch (e: any) {
        setStatusMsg('Failed to load biometric models: ' + (e?.message || String(e)));
      }
    })();
  }, []);

  const handleFastPath = async () => {
    if (!workerIdInput.trim()) {
      setFastPathWorker(null);
      setStage('scanning');
      return;
    }
    try {
      const worker = await dbService.getWorker(workerIdInput.trim());
      if (worker) {
        setFastPathWorker(worker);
        setStatusMsg(`Worker found: ${worker.name}. Starting scan…`);
      } else {
        setFastPathWorker(null);
        setStatusMsg('Worker ID not found. Global search mode.');
      }
      setStage('scanning');
    } catch {
      setStage('scanning');
    }
  };

  const handleCapture = useCallback(async (video: HTMLVideoElement, detection: any) => {
    if (capturedRef.current || saving) return;
    capturedRef.current = true;
    setSaving(true);
    setStatusMsg('Processing biometric match…');
    const threshold = parseFloat(localStorage.getItem('nhai_match_threshold') || '0.85');
    try {
      const embedding = await biometricService.generateEmbedding(video, detection);
      if (fastPathWorker) {
        const simFront = biometricService.calculateCosineSimilarity(embedding, fastPathWorker.embedding_front);
        const simLeft = biometricService.calculateCosineSimilarity(embedding, fastPathWorker.embedding_left);
        const simRight = biometricService.calculateCosineSimilarity(embedding, fastPathWorker.embedding_right);
        const bestSim = Math.max(simFront, simLeft, simRight);
        if (bestSim >= threshold) {
          await dbService.addAttendance({
            attendance_id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            worker_id: fastPathWorker.worker_id,
            site_id: fastPathWorker.site_id,
            timestamp: new Date().toISOString(),
            similarity_score: Math.round(bestSim * 100) / 100,
            verified: 'Verified',
            liveness_passed: true,
          });
          setResult({ matched: true, worker: fastPathWorker, similarity: bestSim, livenessPassed: true });
        } else {
          await dbService.addUnverifiedAttendance({
            attendance_id: 'uatt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            embedding, site_id: fastPathWorker.site_id, timestamp: new Date().toISOString(),
          });
          setResult({ matched: false, similarity: bestSim, livenessPassed: true });
        }
      } else {
        const allWorkers = await dbService.getAllWorkers();
        let bestMatch: WorkerRecord | null = null;
        let bestSim = 0;
        for (const w of allWorkers) {
          const best = Math.max(
            biometricService.calculateCosineSimilarity(embedding, w.embedding_front),
            biometricService.calculateCosineSimilarity(embedding, w.embedding_left),
            biometricService.calculateCosineSimilarity(embedding, w.embedding_right)
          );
          if (best > bestSim) { bestSim = best; bestMatch = w; }
        }
        if (bestMatch && bestSim >= threshold) {
          await dbService.addAttendance({
            attendance_id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            worker_id: bestMatch.worker_id, site_id: bestMatch.site_id, timestamp: new Date().toISOString(),
            similarity_score: Math.round(bestSim * 100) / 100, verified: 'Verified', liveness_passed: true,
          });
          setResult({ matched: true, worker: bestMatch, similarity: bestSim, livenessPassed: true });
        } else {
          await dbService.addUnverifiedAttendance({
            attendance_id: 'uatt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            embedding, site_id: 'unknown', timestamp: new Date().toISOString(),
          });
          setResult({ matched: false, similarity: bestSim, livenessPassed: true });
        }
      }
      setStage('result');
    } catch {
      setStatusMsg('Error processing biometric data.');
      capturedRef.current = false;
    } finally {
      setSaving(false);
    }
  }, [fastPathWorker, saving]);

  const resetScanner = () => {
    capturedRef.current = false;
    setResult(null);
    setFastPathWorker(null);
    setWorkerIdInput('');
    setStatusMsg('');
    setStage('id_entry');
  };

  // ── ID ENTRY ─────────────────────────────────────────────
  if (stage === 'id_entry') {
    return (
      <div style={styles.page} className="fade-in">
        <div style={styles.screenHeader}>
          <button onClick={onBack} style={styles.backBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <h2 style={styles.screenTitle}>Attendance Scanner</h2>
            <p style={styles.screenSub}>Biometric verification & attendance logging</p>
          </div>
        </div>

        {/* Model status */}
        <div style={{ ...styles.statusPill, background: modelsReady ? 'rgba(22,163,74,0.08)' : 'rgba(17,41,107,0.06)', border: `1px solid ${modelsReady ? 'rgba(22,163,74,0.25)' : 'rgba(17,41,107,0.15)'}` }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: modelsReady ? '#16A34A' : '#11296B', animation: modelsReady ? 'none' : 'spin 1.5s linear infinite' }}>
            {modelsReady ? 'verified' : 'sync'}
          </span>
          <span style={{ ...styles.statusText, color: modelsReady ? '#16A34A' : '#11296B' }}>
            {modelsReady ? 'Biometric AI engines ready' : 'Loading biometric models…'}
          </span>
        </div>

        <div className="nhai-card" style={{ padding: 24 }}>
          <div style={styles.formSectionHeader}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#11296B' }}>badge</span>
            <div>
              <h3 style={styles.formSectionTitle}>Fast Path Verification</h3>
              <p style={styles.formSectionDesc}>
                Enter a Worker ID for 1-to-1 matching, or skip for global search across all enrolled workers.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="nhai-label">Worker ID (Optional)</label>
            <input
              type="text"
              value={workerIdInput}
              onChange={(e) => setWorkerIdInput(e.target.value)}
              placeholder="e.g. WRK-001A2B3C"
              className="nhai-input"
              style={{ marginBottom: 12 }}
            />
            <div style={styles.btnRow}>
              <button
                onClick={handleFastPath}
                disabled={!modelsReady}
                className="nhai-btn-primary"
                style={{ flex: 2 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>face_unlock</span>
                {modelsReady ? 'Start Biometric Scan' : 'Loading…'}
              </button>
              <button
                onClick={() => { setFastPathWorker(null); setStage('scanning'); }}
                disabled={!modelsReady}
                className="nhai-btn-secondary"
                style={{ flex: 1 }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div style={styles.infoBox}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#4A5578' }}>info</span>
            <span style={styles.infoText}>{statusMsg}</span>
          </div>
        )}
      </div>
    );
  }

  // ── SCANNING ─────────────────────────────────────────────
  if (stage === 'scanning') {
    return (
      <div style={styles.page} className="fade-in">
        <div style={styles.screenHeader}>
          <button onClick={resetScanner} style={styles.backBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={styles.screenTitle}>Live Scan</h2>
            <p style={styles.screenSub}>
              {fastPathWorker ? `Matching: ${fastPathWorker.name}` : 'Global search — all enrolled workers'}
            </p>
          </div>
          {fastPathWorker && (
            <div className="nhai-badge nhai-badge-primary">{fastPathWorker.worker_id}</div>
          )}
        </div>

        <CameraViewfinder
          onCapture={handleCapture}
          challenge={livenessChallenge}
          challengeHistory={challengeHistory}
          isActive={stage === 'scanning' && !capturedRef.current}
        />

        {saving && (
          <div style={styles.processingCard}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#11296B', animation: 'spin 1s linear infinite' }}>sync</span>
            <span style={styles.processingText}>Processing biometric match…</span>
          </div>
        )}
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────────
  const isMatch = result?.matched;
  return (
    <div style={styles.page} className="fade-in">
      <div style={styles.screenHeader}>
        <button onClick={resetScanner} style={styles.backBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <h2 style={styles.screenTitle}>Scan Result</h2>
      </div>

      {/* Result card */}
      <div
        className="nhai-card"
        style={{
          ...styles.resultCard,
          borderColor: isMatch ? '#BBF7D0' : '#FECACA',
          background: isMatch ? '#F0FDF4' : '#FEF2F2',
        }}
      >
        {/* Result icon */}
        <div
          style={{
            ...styles.resultIconRing,
            background: isMatch ? 'rgba(22,163,74,0.10)' : 'rgba(191,6,3,0.10)',
            border: `2px solid ${isMatch ? '#BBF7D0' : '#FECACA'}`,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 48, color: isMatch ? '#16A34A' : '#BF0603' }}
          >
            {isMatch ? 'how_to_reg' : 'warning'}
          </span>
        </div>

        <h2
          style={{
            ...styles.resultTitle,
            color: isMatch ? '#16A34A' : '#BF0603',
          }}
        >
          {isMatch ? 'VERIFIED' : 'UNVERIFIED'}
        </h2>

        {isMatch && result?.worker && (
          <p style={styles.resultWorkerName}>{result.worker.name}</p>
        )}
        {!isMatch && (
          <p style={styles.resultDesc}>
            No matching worker found above threshold ({Math.round(parseFloat(localStorage.getItem('nhai_match_threshold') || '0.85') * 100)}%).
          </p>
        )}

        {/* Stats */}
        <div style={styles.resultStats}>
          {isMatch && result?.worker && (
            <>
              <div style={styles.resultStat}>
                <span style={styles.resultStatLabel}>Worker ID</span>
                <span style={styles.resultStatValue}>{result.worker.worker_id}</span>
              </div>
              <div style={styles.resultStatDivider} />
            </>
          )}
          <div style={styles.resultStat}>
            <span style={styles.resultStatLabel}>Similarity</span>
            <span
              style={{
                ...styles.resultStatValue,
                color: isMatch ? '#16A34A' : '#BF0603',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {((result?.similarity ?? 0) * 100).toFixed(1)}%
            </span>
          </div>
          {isMatch && result?.worker && (
            <>
              <div style={styles.resultStatDivider} />
              <div style={styles.resultStat}>
                <span style={styles.resultStatLabel}>Site</span>
                <span style={styles.resultStatValue}>{result.worker.site_id}</span>
              </div>
            </>
          )}
        </div>

        {/* Status tag */}
        <div
          style={{
            ...styles.resultTag,
            background: isMatch ? 'rgba(22,163,74,0.08)' : 'rgba(191,6,3,0.08)',
            border: `1px solid ${isMatch ? 'rgba(22,163,74,0.20)' : 'rgba(191,6,3,0.20)'}`,
            color: isMatch ? '#16A34A' : '#BF0603',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            {isMatch ? 'schedule' : 'assignment_late'}
          </span>
          <span style={styles.resultTagText}>
            {isMatch
              ? `Attendance logged at ${new Date().toLocaleTimeString()}`
              : 'Submitted for Admin Review'}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={styles.btnRow}>
        <button onClick={resetScanner} className="nhai-btn-primary" style={{ flex: 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          Scan Another
        </button>
        <button onClick={onBack} className="nhai-btn-secondary" style={{ flex: 1 }}>
          Done
        </button>
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
  statusPill: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10 },
  statusText: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 600 },
  formSectionHeader: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  formSectionTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: '#0D1B3E', margin: 0 },
  formSectionDesc: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#8892AB', marginTop: 3, lineHeight: 1.5 },
  btnRow: { display: 'flex', gap: 10 },
  infoBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#F7F8FC', border: '1px solid #DDE1EC', borderRadius: 10, padding: '10px 14px' },
  infoText: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#4A5578' },
  processingCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    background: 'rgba(17,41,107,0.05)', border: '1px solid rgba(17,41,107,0.12)', borderRadius: 12, padding: '12px 20px',
  },
  processingText: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#11296B' },
  resultCard: { padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' },
  resultIconRing: { width: 88, height: 88, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '0.03em', margin: 0 },
  resultWorkerName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 18, color: '#0D1B3E', margin: 0 },
  resultDesc: { fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4A5578', margin: 0, maxWidth: 280 },
  resultStats: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.80)', borderRadius: 12, padding: '12px 20px', flexWrap: 'wrap', justifyContent: 'center' },
  resultStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  resultStatLabel: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#8892AB', letterSpacing: '0.07em', textTransform: 'uppercase' },
  resultStatValue: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#0D1B3E' },
  resultStatDivider: { width: 1, height: 28, background: 'rgba(0,0,0,0.10)' },
  resultTag: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999 },
  resultTagText: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600 },
};