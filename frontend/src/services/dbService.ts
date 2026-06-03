// Database service using browser IndexedDB to emulate SQLite tables with AES-GCM encryption.

const DB_NAME = 'NHAI_SecureAuth_DB';
const DB_VERSION = 2;

export interface WorkerRecord {
  worker_id: string;
  name: string;
  site_id: string;
  embedding_front: number[]; // stored encrypted
  embedding_left: number[];  // stored encrypted
  embedding_right: number[]; // stored encrypted
  created_at: string;
  sync_status: 'pending' | 'synced';
}

export interface AttendanceRecord {
  attendance_id: string;
  worker_id: string;
  site_id: string;
  timestamp: string;
  similarity_score: number;
  verified: 'Verified' | 'Unverified';
  liveness_passed: boolean;
  sync_status: 'pending' | 'synced';
}

export interface UnverifiedAttendanceRecord {
  attendance_id: string;
  embedding: number[]; // stored encrypted
  site_id: string;
  timestamp: string;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface SyncQueueItem {
  queue_id: string;
  entity_type: 'worker' | 'attendance' | 'review';
  entity_id: string;
  operation: 'insert' | 'update';
  status: 'pending' | 'failed' | 'success';
  created_at: string;
}

export interface UserAccount {
  user_id: string;
  username: string;
  password_hash: string;
  salt: string;
  role: 'admin' | 'supervisor' | 'worker';
  email?: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Encryption Helpers using Web Crypto API
// We derive a static key using a fixed salt for demonstration, representing device-locked encryption.
const ENCRYPTION_PASSWORD = 'NHAI_DEVICE_SECURE_AUTH_KEY_2026';
const SALT = new Uint8Array([86, 12, 94, 201, 45, 11, 88, 32, 112, 5, 23, 90, 44, 122, 19, 87]);

async function getEncryptionKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(ENCRYPTION_PASSWORD),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: number[]): Promise<{ ciphertext: string; iv: string }> {
  try {
    const key = await getEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const rawData = new Float32Array(data);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      rawData.buffer
    );
    
    // Convert ArrayBuffer to Base64
    const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    const ivBase64 = btoa(String.fromCharCode(...iv));
    
    return { ciphertext, iv: ivBase64 };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
}

export async function decryptData(ciphertext: string, ivBase64: string): Promise<number[]> {
  try {
    const key = await getEncryptionKey();
    const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
    const encryptedData = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    const floatArray = new Float32Array(decrypted);
    return Array.from(floatArray);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
}

class DatabaseService {
  private db: IDBDatabase | null = null;

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve();

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Database failed to open');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Create Workers Store
        if (!db.objectStoreNames.contains('workers')) {
          db.createObjectStore('workers', { keyPath: 'worker_id' });
        }
        
        // Create Attendance Store
        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'attendance_id' });
        }
        
        // Create Unverified Attendance Store
        if (!db.objectStoreNames.contains('unverified_attendance')) {
          db.createObjectStore('unverified_attendance', { keyPath: 'attendance_id' });
        }
        
        // Create Sync Queue Store
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'queue_id' });
        }

        // Create Users Store
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'user_id' });
          usersStore.createIndex('username', 'username', { unique: true });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // --- WORKER METHODS ---
  async addWorker(worker: Omit<WorkerRecord, 'sync_status'>): Promise<void> {
    await this.init();
    
    // Encrypt embeddings
    const encFront = await encryptData(worker.embedding_front);
    const encLeft = await encryptData(worker.embedding_left);
    const encRight = await encryptData(worker.embedding_right);

    const encryptedRecord = {
      ...worker,
      embedding_front: encFront,
      embedding_left: encLeft,
      embedding_right: encRight,
      sync_status: 'pending' as const
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject('No DB');
      const transaction = this.db.transaction(['workers', 'sync_queue'], 'readwrite');
      
      transaction.onerror = () => reject(transaction.error);
      
      // Save worker
      transaction.objectStore('workers').put(encryptedRecord);

      // Add to sync queue
      const queueItem: SyncQueueItem = {
        queue_id: 'q_' + Math.random().toString(36).substring(2, 11),
        entity_type: 'worker',
        entity_id: worker.worker_id,
        operation: 'insert',
        status: 'pending',
        created_at: new Date().toISOString()
      };
      transaction.objectStore('sync_queue').put(queueItem);

      transaction.oncomplete = () => resolve();
    });
  }

  async getWorker(worker_id: string): Promise<WorkerRecord | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('workers', 'readonly');
      const request = store.get(worker_id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const record = request.result;
        if (!record) return resolve(null);
        
        try {
          // Decrypt embeddings
          const decFront = await decryptData(record.embedding_front.ciphertext, record.embedding_front.iv);
          const decLeft = await decryptData(record.embedding_left.ciphertext, record.embedding_left.iv);
          const decRight = await decryptData(record.embedding_right.ciphertext, record.embedding_right.iv);
          
          resolve({
            ...record,
            embedding_front: decFront,
            embedding_left: decLeft,
            embedding_right: decRight
          });
        } catch (e) {
          reject(e);
        }
      };
    });
  }

  async getAllWorkers(): Promise<WorkerRecord[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('workers', 'readonly');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const encryptedRecords = request.result || [];
        const records: WorkerRecord[] = [];
        
        try {
          for (const record of encryptedRecords) {
            const decFront = await decryptData(record.embedding_front.ciphertext, record.embedding_front.iv);
            const decLeft = await decryptData(record.embedding_left.ciphertext, record.embedding_left.iv);
            const decRight = await decryptData(record.embedding_right.ciphertext, record.embedding_right.iv);
            
            records.push({
              ...record,
              embedding_front: decFront,
              embedding_left: decLeft,
              embedding_right: decRight
            });
          }
          resolve(records);
        } catch (e) {
          reject(e);
        }
      };
    });
  }

  // --- ATTENDANCE METHODS ---
  async addAttendance(attendance: Omit<AttendanceRecord, 'sync_status'>): Promise<void> {
    await this.init();
    const record: AttendanceRecord = {
      ...attendance,
      sync_status: 'pending'
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject('No DB');
      const transaction = this.db.transaction(['attendance', 'sync_queue'], 'readwrite');
      
      transaction.onerror = () => reject(transaction.error);
      transaction.objectStore('attendance').put(record);

      const queueItem: SyncQueueItem = {
        queue_id: 'q_' + Math.random().toString(36).substring(2, 11),
        entity_type: 'attendance',
        entity_id: attendance.attendance_id,
        operation: 'insert',
        status: 'pending',
        created_at: new Date().toISOString()
      };
      transaction.objectStore('sync_queue').put(queueItem);

      transaction.oncomplete = () => resolve();
    });
  }

  async getAllAttendance(): Promise<AttendanceRecord[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('attendance', 'readonly');
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // --- UNVERIFIED ATTENDANCE METHODS ---
  async addUnverifiedAttendance(unverified: Omit<UnverifiedAttendanceRecord, 'review_status'>): Promise<void> {
    await this.init();
    
    // Encrypt current captured face embedding
    const encEmbedding = await encryptData(unverified.embedding);

    const record = {
      ...unverified,
      embedding: encEmbedding,
      review_status: 'pending' as const
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject('No DB');
      const transaction = this.db.transaction(['unverified_attendance', 'sync_queue'], 'readwrite');
      
      transaction.onerror = () => reject(transaction.error);
      transaction.objectStore('unverified_attendance').put(record);

      const queueItem: SyncQueueItem = {
        queue_id: 'q_' + Math.random().toString(36).substring(2, 11),
        entity_type: 'attendance', // unverified attendance uploads as regular attendance eventually
        entity_id: unverified.attendance_id,
        operation: 'insert',
        status: 'pending',
        created_at: new Date().toISOString()
      };
      transaction.objectStore('sync_queue').put(queueItem);

      transaction.oncomplete = () => resolve();
    });
  }

  async getUnverifiedAttendance(): Promise<UnverifiedAttendanceRecord[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('unverified_attendance', 'readonly');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const encryptedRecords = request.result || [];
        const records: UnverifiedAttendanceRecord[] = [];
        
        try {
          for (const record of encryptedRecords) {
            const decEmbedding = await decryptData(record.embedding.ciphertext, record.embedding.iv);
            records.push({
              ...record,
              embedding: decEmbedding
            });
          }
          resolve(records);
        } catch (e) {
          reject(e);
        }
      };
    });
  }

  async updateUnverifiedReview(attendance_id: string, status: 'approved' | 'rejected', reviewer: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('No DB');
      const transaction = this.db.transaction(['unverified_attendance', 'sync_queue'], 'readwrite');
      
      const unverifiedStore = transaction.objectStore('unverified_attendance');
      const getReq = unverifiedStore.get(attendance_id);
      
      getReq.onerror = () => reject(getReq.error);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) return reject('Record not found');
        
        record.review_status = status;
        record.reviewed_by = reviewer;
        record.reviewed_at = new Date().toISOString();
        
        unverifiedStore.put(record);

        // Add review operation to sync queue
        const queueItem: SyncQueueItem = {
          queue_id: 'q_' + Math.random().toString(36).substring(2, 11),
          entity_type: 'review',
          entity_id: attendance_id,
          operation: 'update',
          status: 'pending',
          created_at: new Date().toISOString()
        };
        transaction.objectStore('sync_queue').put(queueItem);
      };

      transaction.oncomplete = () => resolve();
    });
  }

  // --- SYNC QUEUE METHODS ---
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('sync_queue', 'readonly');
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async removeQueueItem(queue_id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('sync_queue', 'readwrite');
      const request = store.delete(queue_id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async markEntitySynced(entity_type: 'worker' | 'attendance' | 'review', entity_id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('No DB');
      
      const storeName = entity_type === 'worker' ? 'workers' : (entity_type === 'attendance' ? 'attendance' : 'unverified_attendance');
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const getReq = store.get(entity_id);
      getReq.onerror = () => reject(getReq.error);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.sync_status = 'synced';
          store.put(record);
        }
      };

      transaction.oncomplete = () => resolve();
    });
  }

  // Purge synced records older than 24 hours
  async purgeSyncedRecords(): Promise<{ workersPurged: number; attendancePurged: number }> {
    await this.init();
    const limitDate = new Date();
    limitDate.setHours(limitDate.getHours() - 24); // 24 hours ago
    
    let workersPurged = 0;
    let attendancePurged = 0;

    return new Promise((resolve, reject) => {
      if (!this.db) return reject('No DB');
      
      const transaction = this.db.transaction(['workers', 'attendance'], 'readwrite');
      
      // Purge Workers
      const workersStore = transaction.objectStore('workers');
      workersStore.openCursor().onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const record = cursor.value;
          if (record.sync_status === 'synced' && new Date(record.created_at) < limitDate) {
            cursor.delete();
            workersPurged++;
          }
          cursor.continue();
        }
      };

      // Purge Attendance
      const attendanceStore = transaction.objectStore('attendance');
      attendanceStore.openCursor().onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const record = cursor.value;
          if (record.sync_status === 'synced' && new Date(record.timestamp) < limitDate) {
            cursor.delete();
            attendancePurged++;
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        resolve({ workersPurged, attendancePurged });
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  // --- USER MANAGEMENT METHODS ---
  async addUser(user: UserAccount): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('users', 'readwrite');
      const request = store.put(user);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getUserByUsername(username: string): Promise<UserAccount | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('users', 'readonly');
      const index = store.index('username');
      const request = index.get(username);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getUser(user_id: string): Promise<UserAccount | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('users', 'readonly');
      const request = store.get(user_id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllUsers(): Promise<UserAccount[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('users', 'readonly');
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async updateUser(user: UserAccount): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('users', 'readwrite');
      const request = store.put(user);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteUser(user_id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('users', 'readwrite');
      const request = store.delete(user_id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllAdminUsers(): Promise<UserAccount[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('users', 'readonly');
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const all = request.result || [];
        resolve(all.filter(u => u.role === 'admin'));
      };
    });
  }
}

export const dbService = new DatabaseService();
