import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import { syncService } from '../services/syncService';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [threshold, setThreshold] = useState(() => 
    parseFloat(localStorage.getItem('nhai_match_threshold') || '0.85')
  );
  const [bypassLiveness, setBypassLiveness] = useState(() => 
    localStorage.getItem('nhai_bypass_liveness') === 'true'
  );
  const [forceFallback, setForceFallback] = useState(() => 
    localStorage.getItem('nhai_force_fallback_model') === 'true'
  );
  const [awsEndpoint, setAwsEndpoint] = useState(() => 
    localStorage.getItem('nhai_aws_endpoint') || 'https://aws.nhai-auth.internal/api/v1/sync'
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
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 800);
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete ALL local database records? This will delete all enrolled workers and attendance logs, and cannot be undone.')) {
      return;
    }
    
    try {
      await dbService.init();
      // Drop and recreate DB or clear object stores
      const db = (dbService as any).db;
      if (db) {
        const tx = db.transaction(['workers', 'attendance', 'unverified_attendance', 'sync_queue'], 'readwrite');
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

  return (
    <div className="flex flex-col gap-6 py-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-surface-container-high transition cursor-pointer">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">SETTINGS</h2>
          <p className="text-xs text-on-surface-variant">Configure biometric parameters and system settings</p>
        </div>
      </div>

      {/* Settings Options Card */}
      <div className="bg-white border border-outline-variant p-6 rounded-3xl shadow-sm space-y-6">
        
        {/* Biometric Similarity Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Biometric Cosine Similarity Threshold
            </label>
            <span className="text-sm font-mono font-bold text-primary">{(threshold * 100).toFixed(0)}% Match</span>
          </div>
          <input
            type="range"
            min="0.70"
            max="0.98"
            step="0.01"
            value={threshold}
            onChange={e => setThreshold(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <p className="text-[10px] text-on-surface-variant leading-relaxed">
            Higher thresholds increase security (fewer false matches) but may require better lighting and alignment. Default is 85%.
          </p>
        </div>

        <hr className="border-outline-variant" />

        {/* Liveness challenge config */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
              Bypass Liveness Verification
            </label>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              When enabled, biometrics are captured instantly once facial quality validates, bypassing active blink and head rotation tests (convenient for testing).
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bypassLiveness}
              onChange={e => setBypassLiveness(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
          </label>
        </div>

        <hr className="border-outline-variant" />

        {/* Biometric Engine Fallback Mode */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
              Force Landmark Projection Matrix Fallback
            </label>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              Force the engine to run without loading MobileFaceNet ONNX model, relying entirely on the deterministic MediaPipe landmark projection model. Reduces startup memory.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forceFallback}
              onChange={e => setForceFallback(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
          </label>
        </div>

        <hr className="border-outline-variant" />

        {/* AWS endpoint config */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
            AWS Cloud Endpoint Gateway
          </label>
          <input
            type="text"
            value={awsEndpoint}
            onChange={e => setAwsEndpoint(e.target.value)}
            placeholder="https://aws.nhai-auth.internal/api/v1/sync"
            className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>

        {/* Save button */}
        <div className="pt-2 flex items-center justify-between gap-4">
          {saveSuccess && (
            <div className="text-xs text-secondary font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Settings saved.
            </div>
          )}
          <div className="flex-1"></div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:brightness-110 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Configurations'}
          </button>
        </div>
      </div>

      {/* Dangerous Operations Zone */}
      <div className="bg-red-50/50 border border-red-200 p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 text-error">
          <span className="material-symbols-outlined">warning</span>
          <h3 className="font-bold text-sm uppercase tracking-wider">Dangerous Zone</h3>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          The following operations are destructive and cannot be undone. Always verify actions with supervisors.
        </p>

        {resetSuccess && (
          <div className="text-xs text-green-700 bg-green-100 border border-green-200 p-3 rounded-xl font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            All database tables cleared successfully. System has been reset.
          </div>
        )}

        <button
          onClick={handleResetDatabase}
          className="w-full md:w-auto px-6 py-3 border border-red-300 text-red-700 font-bold text-xs rounded-xl hover:bg-red-50 active:scale-[0.98] transition cursor-pointer"
        >
          Purge & Clear Local Database
        </button>
      </div>
    </div>
  );
};
