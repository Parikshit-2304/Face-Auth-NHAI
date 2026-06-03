import React, { useState, useEffect } from 'react';
import { dbService, type UnverifiedAttendanceRecord } from '../services/dbService';

interface AdminReviewScreenProps {
  onBack: () => void;
}

export const AdminReviewScreen: React.FC<AdminReviewScreenProps> = ({ onBack }) => {
  const [records, setRecords] = useState<UnverifiedAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      await dbService.init();
      const all = await dbService.getUnverifiedAttendance();
      setRecords(all);
    } catch (e) {
      console.error('Failed to load unverified records:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (attendanceId: string, status: 'approved' | 'rejected') => {
    setProcessingId(attendanceId);
    try {
      await dbService.updateUnverifiedReview(attendanceId, status, 'admin');
      await loadRecords();
    } catch (e) {
      console.error('Review update failed:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = records.filter(r => filter === 'all' || r.review_status === filter);

  const pendingCount = records.filter(r => r.review_status === 'pending').length;
  const approvedCount = records.filter(r => r.review_status === 'approved').length;
  const rejectedCount = records.filter(r => r.review_status === 'rejected').length;

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-surface-container-high transition cursor-pointer">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-primary tracking-tight">ADMIN REVIEW</h2>
          <p className="text-xs text-on-surface-variant">Audit unverified attendance entries</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
          <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Pending</p>
        </div>
        <div className="bg-green-50 border border-green-200 p-3 rounded-xl text-center">
          <p className="text-2xl font-black text-green-600">{approvedCount}</p>
          <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">Approved</p>
        </div>
        <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-center">
          <p className="text-2xl font-black text-red-600">{rejectedCount}</p>
          <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider">Rejected</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-surface-container-low border border-outline-variant rounded-xl p-1">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              filter === f
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin mr-2">sync</span>
          Loading records…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-outline/40 mb-3">fact_check</span>
          <p className="font-semibold text-on-surface-variant">
            {records.length === 0 ? 'No unverified entries' : `No ${filter} entries`}
          </p>
          <p className="text-xs text-outline mt-1">
            {records.length === 0 ? 'All attendance scans have been matched successfully.' : 'Try changing the filter above.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(r => (
            <div key={r.attendance_id} className="bg-white border border-outline-variant rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    r.review_status === 'pending' ? 'bg-amber-100 text-amber-600' :
                    r.review_status === 'approved' ? 'bg-green-100 text-green-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {r.review_status === 'pending' ? 'pending' : r.review_status === 'approved' ? 'check_circle' : 'cancel'}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface text-sm">Unverified Entry</p>
                    <p className="text-[10px] text-on-surface-variant font-mono">{r.attendance_id}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  r.review_status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                  r.review_status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' :
                  'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {r.review_status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div>
                  <p className="font-semibold text-outline uppercase tracking-wider">Site</p>
                  <p className="font-bold text-on-surface mt-0.5">{r.site_id}</p>
                </div>
                <div>
                  <p className="font-semibold text-outline uppercase tracking-wider">Timestamp</p>
                  <p className="font-bold text-on-surface mt-0.5">{new Date(r.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-semibold text-outline uppercase tracking-wider">Embedding</p>
                  <p className="font-bold text-primary mt-0.5">{r.embedding.length}D ✓</p>
                </div>
              </div>

              {r.reviewed_by && (
                <div className="mt-2 text-[10px] text-on-surface-variant">
                  Reviewed by <span className="font-bold">{r.reviewed_by}</span> at {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : '—'}
                </div>
              )}

              {/* Action buttons for pending items */}
              {r.review_status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleReview(r.attendance_id, 'approved')}
                    disabled={processingId === r.attendance_id}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(r.attendance_id, 'rejected')}
                    disabled={processingId === r.attendance_id}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-700 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
