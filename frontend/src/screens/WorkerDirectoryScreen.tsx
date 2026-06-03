import React, { useState, useEffect } from 'react';
import { dbService, type WorkerRecord } from '../services/dbService';

interface WorkerDirectoryScreenProps {
  onBack: () => void;
}

export const WorkerDirectoryScreen: React.FC<WorkerDirectoryScreenProps> = ({ onBack }) => {
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      await dbService.init();
      const all = await dbService.getAllWorkers();
      setWorkers(all);
    } catch (e) {
      console.error('Failed to load workers:', e);
    } finally {
      setLoading(false);
    }
  };

  const uniqueSites = Array.from(new Set(workers.map(w => w.site_id)));

  const filtered = workers.filter(w => {
    const matchesSearch = !searchQuery ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.worker_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSite = siteFilter === 'all' || w.site_id === siteFilter;
    return matchesSearch && matchesSite;
  });

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-surface-container-high transition cursor-pointer">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-primary tracking-tight">WORKER DIRECTORY</h2>
          <p className="text-xs text-on-surface-variant">{workers.length} enrolled worker{workers.length !== 1 ? 's' : ''} on this device</p>
        </div>
        <button onClick={loadWorkers} className="p-2 rounded-xl hover:bg-surface-container-high transition cursor-pointer" title="Refresh">
          <span className="material-symbols-outlined text-primary">refresh</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition bg-white"
          />
        </div>
        <select
          value={siteFilter}
          onChange={e => setSiteFilter(e.target.value)}
          className="px-3 py-2.5 border border-outline-variant rounded-xl text-sm bg-white focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="all">All Sites</option>
          {uniqueSites.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Worker List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin mr-2">sync</span>
          Loading workers…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-outline/40 mb-3">person_off</span>
          <p className="font-semibold text-on-surface-variant">
            {workers.length === 0 ? 'No workers enrolled yet' : 'No results match your search'}
          </p>
          <p className="text-xs text-outline mt-1">
            {workers.length === 0 ? 'Use the Admin Dashboard to enroll workers.' : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(w => (
            <div
              key={w.worker_id}
              className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden transition-all"
            >
              <div
                onClick={() => setExpandedId(expandedId === w.worker_id ? null : w.worker_id)}
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-surface-container-low/50 transition"
              >
                {/* Avatar */}
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 shrink-0">
                  {w.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface truncate">{w.name}</p>
                  <p className="text-xs text-on-surface-variant font-mono">{w.worker_id}</p>
                </div>

                {/* Sync badge */}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  w.sync_status === 'synced'
                    ? 'bg-secondary/10 text-secondary border border-secondary/20'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  {w.sync_status}
                </span>

                <span className="material-symbols-outlined text-outline text-lg transition-transform" style={{
                  transform: expandedId === w.worker_id ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                  expand_more
                </span>
              </div>

              {/* Expanded Details */}
              {expandedId === w.worker_id && (
                <div className="border-t border-outline-variant bg-surface-container-low/30 p-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-outline uppercase tracking-wider">Site ID</p>
                    <p className="font-bold text-on-surface mt-0.5">{w.site_id}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-outline uppercase tracking-wider">Enrolled On</p>
                    <p className="font-bold text-on-surface mt-0.5">{new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-outline uppercase tracking-wider">Front Embedding</p>
                    <p className="font-bold text-secondary mt-0.5">{w.embedding_front.length}D vector ✓</p>
                  </div>
                  <div>
                    <p className="font-semibold text-outline uppercase tracking-wider">Left Embedding</p>
                    <p className="font-bold text-secondary mt-0.5">{w.embedding_left.length}D vector ✓</p>
                  </div>
                  <div>
                    <p className="font-semibold text-outline uppercase tracking-wider">Right Embedding</p>
                    <p className="font-bold text-secondary mt-0.5">{w.embedding_right.length}D vector ✓</p>
                  </div>
                  <div>
                    <p className="font-semibold text-outline uppercase tracking-wider">Encryption</p>
                    <p className="font-bold text-primary mt-0.5">AES-256-GCM ✓</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
