// Sync Service: Handles connectivity state monitoring, sync queue processing to real AWS API Gateway endpoints, and data retention purging.

import { dbService } from './dbService';

export interface SyncLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'pending';
  payload?: any;
}

class SyncService {
  private isSyncing = false;
  private isOnline = navigator.onLine;
  private forcedOffline = false; // Demo toggle for presentation
  private syncLogs: SyncLog[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());
    
    // Add initial log
    this.addLog('Sync engine initialized. Mode: ' + (this.isDeviceOnline() ? 'ONLINE' : 'OFFLINE'), 'info');

    // Run auto purge check on startup
    this.runAutoPurge();
  }

  private updateOnlineStatus() {
    this.isOnline = navigator.onLine;
    this.addLog('System network connectivity change detected: ' + (this.isDeviceOnline() ? 'ONLINE' : 'OFFLINE'), 'info');
    this.notifyListeners();

    // Trigger sync automatically if online
    if (this.isDeviceOnline()) {
      this.syncNow();
    }
  }

  // Demo toggle helper
  setForcedOffline(val: boolean) {
    this.forcedOffline = val;
    this.addLog('User toggled mock connectivity state: ' + (this.isDeviceOnline() ? 'ONLINE' : 'OFFLINE'), 'info');
    this.notifyListeners();
    if (this.isDeviceOnline()) {
      this.syncNow();
    }
  }

  isDeviceOnline(): boolean {
    return this.isOnline && !this.forcedOffline;
  }

  getLogs(): SyncLog[] {
    return this.syncLogs;
  }

  clearLogs() {
    this.syncLogs = [];
    this.notifyListeners();
  }

  private addLog(message: string, type: 'info' | 'success' | 'error' | 'pending', payload?: any) {
    this.syncLogs.unshift({
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
      payload
    });
    // Keep max 50 logs
    if (this.syncLogs.length > 50) this.syncLogs.pop();
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  // Real AWS API Request implementation via fetch
  private async uploadToAWS(endpoint: string, method: 'POST' | 'PUT', payload: any): Promise<boolean> {
    const AWS_BASE_URL = (import.meta as any).env?.VITE_AWS_API_URL || 'https://api.nhai-datalake-gateway.ap-south-1.amazonaws.com/prod';
    
    // Parse the endpoint format (e.g., 'POST /workers' -> '/workers')
    const routePath = endpoint.includes(' ') ? endpoint.split(' ')[1] : endpoint;
    const url = `${AWS_BASE_URL}${routePath}`;

    try {
      this.addLog(`Sending fetch request to AWS: ${method} ${routePath}...`, 'pending');
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // API Key authorization for AWS API Gateway
          'x-api-key': (import.meta as any).env?.VITE_AWS_API_KEY || ''
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        let responseData = {};
        try {
          responseData = await response.json();
        } catch (e) {
          // OK but not JSON payload returned
        }
        console.log(`AWS Sync Success [${method}] ${url}`, responseData);
        this.addLog(`AWS Sync Success [${method}] ${routePath} (HTTP ${response.status})`, 'success');
        return true;
      } else {
        const errorText = await response.text().catch(() => 'No error payload returned');
        console.error(`AWS Sync Fail [${method}] ${url} - Status ${response.status}`, errorText);
        this.addLog(`AWS Sync Fail [${method}] ${routePath} (HTTP ${response.status}): ${errorText.substring(0, 100)}`, 'error');
        return false;
      }
    } catch (error) {
      console.error(`AWS Network Error [${method}] ${url}`, error);
      this.addLog(`AWS Network Exception [${method}] ${routePath}: ${String(error)}`, 'error');
      return false;
    }
  }

  // Processes the local IndexedDB sync queue
  async syncNow(): Promise<void> {
    if (this.isSyncing) return;
    if (!this.isDeviceOnline()) {
      this.addLog('Sync aborted: Device is in OFFLINE mode.', 'error');
      return;
    }

    const queue = await dbService.getSyncQueue();
    const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'failed');

    if (pendingItems.length === 0) {
      this.addLog('Sync completed: No pending records in queue.', 'success');
      return;
    }

    this.isSyncing = true;
    this.addLog(`Sync started: Processing ${pendingItems.length} pending queue records...`, 'pending');
    this.notifyListeners();

    try {
      for (const item of pendingItems) {
        this.addLog(`Syncing queue item ${item.queue_id} (Type: ${item.entity_type.toUpperCase()})...`, 'pending');
        
        let success = false;
        if (item.entity_type === 'worker') {
          // Fetch worker details from DB
          const worker = await dbService.getWorker(item.entity_id);
          if (worker) {
            success = await this.uploadToAWS('POST /workers', 'POST', {
              worker_id: worker.worker_id,
              name: worker.name,
              site_id: worker.site_id,
              embedding_front: worker.embedding_front,
              embedding_left: worker.embedding_left,
              embedding_right: worker.embedding_right,
              created_at: worker.created_at
            });
          } else {
            this.addLog(`Worker record ${item.entity_id} not found in DB. Marking synced to skip.`, 'error');
            success = true; // Skip missing record
          }
        } else if (item.entity_type === 'attendance') {
          // Fetch attendance record
          const allAttendance = await dbService.getAllAttendance();
          const attendance = allAttendance.find(a => a.attendance_id === item.entity_id);
          if (attendance) {
            success = await this.uploadToAWS('POST /attendance', 'POST', {
              attendance_id: attendance.attendance_id,
              worker_id: attendance.worker_id,
              site_id: attendance.site_id,
              timestamp: attendance.timestamp,
              similarity_score: attendance.similarity_score,
              verified: attendance.verified,
              liveness_passed: attendance.liveness_passed
            });
          } else {
            // Check unverified attendance store
            const allUnverified = await dbService.getUnverifiedAttendance();
            const unverified = allUnverified.find(u => u.attendance_id === item.entity_id);
            if (unverified) {
              success = await this.uploadToAWS('POST /attendance', 'POST', {
                attendance_id: unverified.attendance_id,
                worker_id: 'unassigned',
                site_id: unverified.site_id,
                timestamp: unverified.timestamp,
                similarity_score: 0,
                verified: 'Unverified',
                liveness_passed: true,
                embedding: unverified.embedding
              });
            } else {
              this.addLog(`Attendance record ${item.entity_id} not found in DB. Skipping.`, 'error');
              success = true;
            }
          }
        } else if (item.entity_type === 'review') {
          // Fetch reviewed unverified attendance log
          const allUnverified = await dbService.getUnverifiedAttendance();
          const reviewed = allUnverified.find(u => u.attendance_id === item.entity_id);
          if (reviewed && reviewed.review_status !== 'pending') {
            success = await this.uploadToAWS('PUT /attendance/review', 'PUT', {
              attendance_id: reviewed.attendance_id,
              review_status: reviewed.review_status,
              reviewed_by: reviewed.reviewed_by,
              reviewed_at: reviewed.reviewed_at
            });
          } else {
            this.addLog(`Review log ${item.entity_id} not reviewed yet or missing. Skipping.`, 'error');
            success = true;
          }
        }

        if (success) {
          // Update status in local DB
          await dbService.markEntitySynced(item.entity_type, item.entity_id);
          // Remove from sync queue
          await dbService.removeQueueItem(item.queue_id);
          this.addLog(`Successfully synced ${item.entity_type} ID: ${item.entity_id}`, 'success');
        } else {
          item.status = 'failed';
          this.addLog(`Failed to sync ${item.entity_type} ID: ${item.entity_id}. Will retry later.`, 'error');
        }
        this.notifyListeners();
      }

      this.addLog('Sync engine cycle finished.', 'info');
      // Trigger purge logic immediately after sync
      await this.runAutoPurge();
    } catch (err) {
      this.addLog('Sync process encountered an exception: ' + String(err), 'error');
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  // Auto Purge Synced logs older than 24h
  async runAutoPurge(): Promise<void> {
    try {
      const results = await dbService.purgeSyncedRecords();
      if (results.workersPurged > 0 || results.attendancePurged > 0) {
        this.addLog(
          `Retention Policy: Purged ${results.workersPurged} workers and ${results.attendancePurged} attendance logs older than 24h.`,
          'info'
        );
      }
    } catch (e) {
      console.error('Auto purge failed:', e);
    }
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();
