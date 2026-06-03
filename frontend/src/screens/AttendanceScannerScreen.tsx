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

  // Pick a random liveness challenge or bypass if configured
  useEffect(() => {
    const bypass = localStorage.getItem('nhai_bypass_liveness') === 'true';
    if (bypass) {
      setLivenessChallenge(undefined);
    } else {
      const challenges: ('Blink' | 'Look Left' | 'Look Right' | 'Look Up')[] = ['Blink', 'Look Left', 'Look Right', 'Look Up'];
      setLivenessChallenge(challenges[Math.floor(Math.random() * challenges.length)]);
    }
  }, [stage]);

  // Load AI models on mount
  useEffect(() => {
    (async () => {
      try {
        await biometricService.loadFaceMesh();
        await biometricService.loadMobileFaceNet();
        setModelsReady(true);
      } catch (e: any) {
        console.error('Model loading failed', e);
        setStatusMsg('Failed to load biometric models: ' + (e?.message || String(e)));
      }
    })();
  }, []);

  // Fast-path: look up worker by ID
  const handleFastPath = async () => {
    if (!workerIdInput.trim()) {
      // Skip to global search mode
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
        setStatusMsg('Worker ID not found. Scanning in global search mode…');
      }
      setStage('scanning');
    } catch (e) {
      console.error(e);
      setStatusMsg('Database error. Proceeding with global search…');
      setStage('scanning');
    }
  };

  // Handle camera capture callback
  const handleCapture = useCallback(async (video: HTMLVideoElement, detection: any) => {
    if (capturedRef.current || saving) return;
    capturedRef.current = true;
    setSaving(true);
    setStatusMsg('Processing biometric match…');

    const threshold = parseFloat(localStorage.getItem('nhai_match_threshold') || '0.85');

    try {
      const embedding = await biometricService.generateEmbedding(video, detection);

      // If fast-path worker selected, compare only against that worker
      if (fastPathWorker) {
        const simFront = biometricService.calculateCosineSimilarity(embedding, fastPathWorker.embedding_front);
        const simLeft = biometricService.calculateCosineSimilarity(embedding, fastPathWorker.embedding_left);
        const simRight = biometricService.calculateCosineSimilarity(embedding, fastPathWorker.embedding_right);
        const bestSim = Math.max(simFront, simLeft, simRight);

        if (bestSim >= threshold) {
          // Verified match
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
          // Below threshold — unverified
          await dbService.addUnverifiedAttendance({
            attendance_id: 'uatt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            embedding,
            site_id: fastPathWorker.site_id,
            timestamp: new Date().toISOString(),
          });
          setResult({ matched: false, similarity: bestSim, livenessPassed: true });
        }
      } else {
        // Global search: compare against all workers
        const allWorkers = await dbService.getAllWorkers();
        let bestMatch: WorkerRecord | null = null;
        let bestSim = 0;

        for (const w of allWorkers) {
          const simF = biometricService.calculateCosineSimilarity(embedding, w.embedding_front);
          const simL = biometricService.calculateCosineSimilarity(embedding, w.embedding_left);
          const simR = biometricService.calculateCosineSimilarity(embedding, w.embedding_right);
          const best = Math.max(simF, simL, simR);
          if (best > bestSim) {
            bestSim = best;
            bestMatch = w;
          }
        }

        if (bestMatch && bestSim >= threshold) {
          await dbService.addAttendance({
            attendance_id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            worker_id: bestMatch.worker_id,
            site_id: bestMatch.site_id,
            timestamp: new Date().toISOString(),
            similarity_score: Math.round(bestSim * 100) / 100,
            verified: 'Verified',
            liveness_passed: true,
          });
          setResult({ matched: true, worker: bestMatch, similarity: bestSim, livenessPassed: true });
        } else {
          await dbService.addUnverifiedAttendance({
            attendance_id: 'uatt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            embedding,
            site_id: 'unknown',
            timestamp: new Date().toISOString(),
          });
          setResult({ matched: false, similarity: bestSim, livenessPassed: true });
        }
      }

      setStage('result');
    } catch (e) {
      console.error('Capture processing error:', e);
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

  // ─── RENDER ────────────────────────────────────────────────
  if (stage === 'id_entry') {
    return (
      <div className="flex flex-col gap-6 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-surface-container-high transition cursor-pointer">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">ATTENDANCE SCANNER</h2>
            <p className="text-xs text-on-surface-variant">Biometric verification & attendance logging</p>
          </div>
        </div>

        {/* Fast-path worker ID entry */}
        <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">badge</span>
            <h3 className="font-bold text-on-surface">Fast Path — Enter Worker ID</h3>
          </div>
          <p className="text-xs text-on-surface-variant">Enter a known Worker ID to compare against a single record, or leave blank for global search across all enrolled workers.</p>
          <input
            type="text"
            value={workerIdInput}
            onChange={e => setWorkerIdInput(e.target.value)}
            placeholder="e.g. WRK-001 (optional)"
            className="w-full px-4 py-3 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
          <div className="flex gap-3">
            <button
              onClick={handleFastPath}
              disabled={!modelsReady}
              className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">face</span>
              {modelsReady ? 'Start Biometric Scan' : 'Loading Models…'}
            </button>
            <button
              onClick={() => { setFastPathWorker(null); setStage('scanning'); }}
              disabled={!modelsReady}
              className="px-4 py-3 bg-surface-container-low border border-outline-variant text-on-surface rounded-xl font-bold text-sm hover:border-primary active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="text-xs text-center text-on-surface-variant bg-surface-container-low border border-outline-variant p-3 rounded-xl">
            {statusMsg}
          </div>
        )}
      </div>
    );
  }

  if (stage === 'scanning') {
    return (
      <div className="flex flex-col gap-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={resetScanner} className="p-2 rounded-xl hover:bg-surface-container-high transition cursor-pointer">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <div>
            <h2 className="text-lg font-black text-primary tracking-tight">SCANNING</h2>
            <p className="text-xs text-on-surface-variant">
              {fastPathWorker ? `Matching against: ${fastPathWorker.name}` : 'Global search across all enrolled workers'}
            </p>
          </div>
        </div>

        <CameraViewfinder
          onCapture={handleCapture}
          challenge={livenessChallenge}
          challengeHistory={challengeHistory}
          isActive={stage === 'scanning' && !capturedRef.current}
        />

        {saving && (
          <div className="flex items-center justify-center gap-2 text-primary text-sm font-semibold animate-pulse">
            <span className="material-symbols-outlined animate-spin">sync</span>
            Processing biometric match…
          </div>
        )}
      </div>
    );
  }

  // Result stage
  return (
    <div className="flex flex-col gap-6 py-4 max-w-lg mx-auto items-center">
      {result?.matched ? (
        <div className="w-full bg-white border-2 border-secondary p-8 rounded-3xl shadow-lg text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/10 border-2 border-secondary">
            <span className="material-symbols-outlined text-secondary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h2 className="text-2xl font-black text-secondary">VERIFIED</h2>
          <p className="text-on-surface font-bold text-lg">{result.worker?.name}</p>
          <div className="flex justify-center gap-6 text-xs text-on-surface-variant">
            <div>
              <p className="font-semibold text-outline uppercase tracking-wider">Worker ID</p>
              <p className="font-bold text-on-surface mt-0.5">{result.worker?.worker_id}</p>
            </div>
            <div>
              <p className="font-semibold text-outline uppercase tracking-wider">Similarity</p>
              <p className="font-bold text-secondary mt-0.5">{(result.similarity * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="font-semibold text-outline uppercase tracking-wider">Site</p>
              <p className="font-bold text-on-surface mt-0.5">{result.worker?.site_id}</p>
            </div>
          </div>
          <div className="text-[10px] text-on-surface-variant bg-secondary/5 border border-secondary/20 px-3 py-1.5 rounded-full inline-block">
            Attendance logged at {new Date().toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="w-full bg-white border-2 border-error p-8 rounded-3xl shadow-lg text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-error/10 border-2 border-error">
            <span className="material-symbols-outlined text-error text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
          <h2 className="text-2xl font-black text-error">UNVERIFIED</h2>
          <p className="text-on-surface-variant text-sm">
            No matching worker found above threshold ({Math.round(parseFloat(localStorage.getItem('nhai_match_threshold') || '0.85') * 100)}%).
          </p>
          <p className="text-xs text-on-surface-variant">
            Best similarity: <span className="font-bold text-error">{((result?.similarity ?? 0) * 100).toFixed(1)}%</span>
          </p>
          <div className="text-[10px] text-on-surface-variant bg-error/5 border border-error/20 px-3 py-1.5 rounded-full inline-block">
            Submitted for Admin Review
          </div>
        </div>
      )}

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={resetScanner}
          className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Scan Another
        </button>
        <button
          onClick={onBack}
          className="px-5 py-3 bg-surface-container-low border border-outline-variant text-on-surface rounded-xl font-bold text-sm hover:border-primary active:scale-[0.98] transition-all cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
