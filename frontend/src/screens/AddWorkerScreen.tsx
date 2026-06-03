import React, { useState, useEffect, useRef } from 'react';
import { biometricService } from '../services/biometricService';
import { dbService } from '../services/dbService';
import { CameraViewfinder } from '../components/CameraViewfinder';

type Step = 'details' | 'front' | 'left' | 'right' | 'saving' | 'done';

export const AddWorkerScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [siteId, setSiteId] = useState('');
  
  const [statusMessage, setStatusMessage] = useState<string>('Initializing camera…');
  const [modelsReady, setModelsReady] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const [embeddings, setEmbeddings] = useState<{ front?: number[]; left?: number[]; right?: number[] }>({});
  
  const [livenessChallenge, setLivenessChallenge] = useState<'Blink' | 'Look Left' | 'Look Right'>('Blink');
  const [challengeHistory] = useState({ eyesClosed: false, leftTurnCount: 0, rightTurnCount: 0, upTurnCount: 0 });
  const capturedRef = useRef<boolean>(false);

  // Load MediaPipe & ONNX models once on mount
  useEffect(() => {
    const init = async () => {
      try {
        await biometricService.loadFaceMesh();
        await biometricService.loadMobileFaceNet();
        setModelsReady(true);
        setStatusMessage('Biometric engines online.');
      } catch (e: any) {
        console.error(e);
        setError('Failed to load biometric models: ' + (e?.message || String(e)));
      }
    };
    init();
  }, []);

  // Update challenge depending on step
  useEffect(() => {
    if (step === 'front') {
      setLivenessChallenge('Blink');
    } else if (step === 'left') {
      setLivenessChallenge('Look Left');
    } else if (step === 'right') {
      setLivenessChallenge('Look Right');
    }
    capturedRef.current = false;
  }, [step]);

  // Handle successful capture for the current step
  const handleCapture = async (video: HTMLVideoElement, detection: any) => {
    if (capturedRef.current) return;
    capturedRef.current = true;
    setStatusMessage(`Captured ${step} profile. Generating embedding…`);

    try {
      const embedding = await biometricService.generateEmbedding(video, detection);
      
      setEmbeddings(prev => {
        const next = { ...prev, [step]: embedding };
        
        // Progress to next step
        setTimeout(() => {
          if (step === 'front') {
            setStep('left');
          } else if (step === 'left') {
            setStep('right');
          } else if (step === 'right') {
            saveWorker(next);
          }
        }, 1000);

        return next;
      });
    } catch (e) {
      console.error(e);
      setError('Biometric generation failed. Retrying step…');
      capturedRef.current = false;
    }
  };

  const saveWorker = async (completedEmbeddings: typeof embeddings) => {
    if (!completedEmbeddings.front || !completedEmbeddings.left || !completedEmbeddings.right) {
      setError('Missing required profiles.');
      setStep('details');
      return;
    }
    
    setStep('saving');
    setStatusMessage('Encrypting biometrics and saving worker record…');
    
    try {
      const workerId = 'WRK-' + crypto.randomUUID().substring(0, 8).toUpperCase();
      const newWorker = {
        worker_id: workerId,
        name: name.trim(),
        site_id: siteId.trim() || 'default_site',
        embedding_front: completedEmbeddings.front,
        embedding_left: completedEmbeddings.left,
        embedding_right: completedEmbeddings.right,
        created_at: new Date().toISOString()
      };
      
      await dbService.addWorker(newWorker);
      setStep('done');
      setStatusMessage('Enrolled successfully.');
    } catch (e) {
      console.error(e);
      setError('Failed to store worker in database.');
      setStep('details');
    }
  };

  const startEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter worker name.');
      return;
    }
    setError('');
    setStep('front');
  };

  // ─── RENDERS ────────────────────────────────────────────────

  if (step === 'details') {
    return (
      <div className="flex flex-col gap-6 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-surface-container-high transition cursor-pointer">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">ENROLL WORKER</h2>
            <p className="text-xs text-on-surface-variant">Step 1: Enter profile details</p>
          </div>
        </div>

        <form onSubmit={startEnrollment} className="bg-white border border-outline-variant p-6 rounded-3xl shadow-sm space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Worker Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Site ID / Location</label>
            <input
              type="text"
              required
              value={siteId}
              onChange={e => setSiteId(e.target.value)}
              placeholder="e.g. NH-2-DELHI"
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {error && (
            <div className="text-xs text-error bg-error/5 border border-error/20 p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!modelsReady}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">photo_camera</span>
            {modelsReady ? 'Proceed to Camera Capture' : 'Loading Biometric Models…'}
          </button>
        </form>
      </div>
    );
  }

  if (step === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <span className="material-symbols-outlined text-5xl text-primary animate-spin">sync</span>
        <h3 className="text-lg font-bold text-on-surface">{statusMessage}</h3>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/10 border-2 border-secondary text-secondary">
          <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h2 className="text-2xl font-black text-secondary">ENROLLMENT COMPLETE</h2>
        <p className="text-on-surface-variant text-sm">
          Worker <span className="font-bold text-on-surface">{name}</span> has been securely stored locally. Biometrics are AES-256 encrypted.
        </p>
        <button
          onClick={onBack}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Camera stages: front, left, right
  const angleLabel = step === 'front' ? 'Frontal Face' : step === 'left' ? 'Left Profile' : 'Right Profile';
  const progressPercent = step === 'front' ? 0 : step === 'left' ? 33 : 66;

  return (
    <div className="flex flex-col gap-4 py-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step === 'right') setStep('left');
              else if (step === 'left') setStep('front');
              else setStep('details');
            }}
            className="p-2 rounded-xl hover:bg-surface-container-high transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <div>
            <h2 className="text-lg font-black text-primary tracking-tight">BIOMETRIC CAPTURE</h2>
            <p className="text-xs text-on-surface-variant">Worker: <span className="font-bold">{name}</span></p>
          </div>
        </div>
        <span className="text-xs font-bold text-outline uppercase tracking-wider">{angleLabel}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden border border-outline-variant">
        <div
          className="bg-primary h-full transition-all duration-500"
          style={{ width: `${progressPercent + 10}%` }}
        />
      </div>

      {error && (
        <div className="text-xs text-error bg-error/5 border border-error/20 p-3 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Viewfinder */}
      <CameraViewfinder
        isActive={step === 'front' || step === 'left' || step === 'right'}
        challenge={livenessChallenge}
        challengeHistory={challengeHistory}
        onCapture={handleCapture}
      />

      <div className="text-xs text-center text-on-surface-variant bg-surface-container-low border border-outline-variant p-3.5 rounded-xl">
        <p className="font-semibold text-on-surface">Instructions:</p>
        <p className="mt-0.5">Align your face inside the overlay circle. Once quality metrics are green, follow the floating instruction below the circle to capture your {angleLabel} profile.</p>
      </div>
    </div>
  );
};
