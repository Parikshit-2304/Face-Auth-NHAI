# Complete Data Flow: IndexedDB → AWS DynamoDB

## Overview
Your app works in **3 stages**:
1. **LOCAL STORAGE** (IndexedDB on device)
2. **SYNC QUEUE** (tracks what needs to go to AWS)
3. **AWS SERVER** (DynamoDB stores permanent data)

The app can work OFFLINE — IndexedDB holds everything locally. When internet comes back, syncService pushes pending data to AWS.

---

# FLOW 1: WORKER DATA

## Stage 1 — When a Worker is Enrolled (Added to System)

### What happens in IndexedDB:

**Action:** User enrolls a new worker (face recognition, name, site)

**dbService stores TWO things:**

#### 1️⃣ In `workers` table:
```javascript
{
  worker_id: "WORKER_001",
  name: "Raj Kumar",
  site_id: "SITE_A",
  
  // 🔒 ENCRYPTED (client-side encryption before storage)
  embedding_front: {
    ciphertext: "A7x9K2j8L9m0N1o2P3q4R5s6T7u8V9w0X1y2Z3",
    iv: "abc123def456ghi789"
  },
  embedding_left: {
    ciphertext: "B8y0L3k9M0n1O2p3Q4r5S6t7U8v9W0x1Y2z3A4",
    iv: "xyz789abc456def123"
  },
  embedding_right: {
    ciphertext: "C9z1M4l0N1o2P3q4R5s6T7u8V9w0X1y2Z3a4B5",
    iv: "mno456pqr789stu123"
  },
  
  created_at: "2026-06-03T10:30:00Z",
  sync_status: "pending"    // ← Not synced yet
}
```

#### 2️⃣ In `sync_queue` table:
```javascript
{
  queue_id: "q_abc123def45",
  entity_type: "worker",          // What type of data
  entity_id: "WORKER_001",        // Which specific record
  operation: "insert",            // What operation (insert/update)
  status: "pending",              // Haven't synced yet
  created_at: "2026-06-03T10:30:00Z"
}
```

### Why encrypt embeddings?
- **Embeddings are sensitive** — they're the face template that identifies a person
- Encrypted **on the device** before saving to IndexedDB
- Only the **device holds the decryption key** (in `dbService.ts` hardcoded)
- When syncing to AWS, the **encrypted data goes as-is** (AWS never sees raw embeddings)

### Why the sync queue?
- Tracks **what needs to be sent to AWS**
- If offline, queue builds up
- When online, syncService processes the queue

---

## Stage 2 — syncService Processes the Queue (When Device Goes Online)

### What syncService does:

1. **Checks if online** → `isDeviceOnline()`
2. **Gets pending items** from sync_queue → `queue.filter(item => item.status === 'pending')`
3. **For each pending worker:**
   - Fetches the worker record from IndexedDB
   - **Decrypts the embeddings** (converts encrypted data back to number arrays)
   - **Prepares payload for AWS**
   - Sends via HTTP POST

### Payload sent to AWS (POST /workers):

```javascript
{
  worker_id: "WORKER_001",
  name: "Raj Kumar",
  site_id: "SITE_A",
  
  // ✅ DECRYPTED before sending (AWS gets readable arrays)
  embedding_front: [0.123, 0.456, 0.789, ...],   // 512 numbers
  embedding_left: [0.234, 0.567, 0.890, ...],
  embedding_right: [0.345, 0.678, 0.901, ...],
  
  created_at: "2026-06-03T10:30:00Z"
}
```

### After successful sync:

1. **Updates IndexedDB:**
   - Sets `sync_status: "synced"` on the worker record
   - Removes the queue item

2. **Logs success:**
   - "Successfully synced worker ID: WORKER_001"

3. **After 24 hours:**
   - Auto-purge deletes the local worker record (it's already safe on AWS)

---

# FLOW 2: VERIFIED ATTENDANCE

## Stage 1 — When a Worker Marks Attendance (Verified via Face Match)

### What happens in IndexedDB:

**Action:** Camera scan → face matched to worker → attendance logged

**dbService stores TWO things:**

#### 1️⃣ In `attendance` table:
```javascript
{
  attendance_id: "ATT_20260603_001",
  worker_id: "WORKER_001",    // ← Matched to a known worker
  site_id: "SITE_A",
  timestamp: "2026-06-03T10:35:00Z",
  similarity_score: 0.95,     // 95% match confidence
  verified: "Verified",       // ✅ System confirmed it's this worker
  liveness_passed: true,      // ✅ Passed anti-spoofing check
  sync_status: "pending"
}
```

#### 2️⃣ In `sync_queue` table:
```javascript
{
  queue_id: "q_def456ghi78",
  entity_type: "attendance",
  entity_id: "ATT_20260603_001",
  operation: "insert",
  status: "pending",
  created_at: "2026-06-03T10:35:00Z"
}
```

### Why no embedding stored here?
- ✅ **Already verified** → We already know this is WORKER_001
- We don't need to store the raw face data again
- Only unverified attendance stores the embedding (see Flow 3)

---

## Stage 2 — syncService Sends to AWS

### Payload sent to AWS (POST /attendance):

```javascript
{
  attendance_id: "ATT_20260603_001",
  worker_id: "WORKER_001",
  site_id: "SITE_A",
  timestamp: "2026-06-03T10:35:00Z",
  similarity_score: 0.95,
  verified: "Verified",
  liveness_passed: true
}
```

### After sync:
- `sync_status: "synced"` in IndexedDB
- Queue item removed
- After 24h → purged from local storage

---

# FLOW 3: UNVERIFIED ATTENDANCE (The Complex One)

## Stage 1 — When Face Doesn't Match Any Worker

### What happens in IndexedDB:

**Action:** Camera scan → similarity_score < 0.90 (not confident match) → Can't assign to worker

**dbService stores TWO things:**

#### 1️⃣ In `unverified_attendance` table:
```javascript
{
  attendance_id: "UNVER_20260603_001",
  
  // 🔒 ENCRYPTED (same as worker embeddings)
  embedding: {
    ciphertext: "D0a2N5m1O2p3Q4r5S6t7U8v9W0x1Y2z3A4B5C6",
    iv: "pqr789stu123vwx456"
  },
  
  site_id: "SITE_A",
  timestamp: "2026-06-03T11:00:00Z",
  review_status: "pending",   // ← Waiting for human review
  reviewed_by: null,
  reviewed_at: null
}
```

#### 2️⃣ In `sync_queue` table:
```javascript
{
  queue_id: "q_ghi789jkl012",
  entity_type: "attendance",  // Note: still "attendance" not "unverified"
  entity_id: "UNVER_20260603_001",
  operation: "insert",
  status: "pending",
  created_at: "2026-06-03T11:00:00Z"
}
```

### Why store the embedding?
- ❌ We DON'T know who this person is
- **A human needs to review this face**
- We send the face embedding to AWS so AWS can help identify or store it

---

## Stage 2 — syncService Sends Unverified to AWS

### Payload sent to AWS (POST /attendance):

```javascript
{
  attendance_id: "UNVER_20260603_001",
  worker_id: "unassigned",    // ← Not matched to anyone
  site_id: "SITE_A",
  timestamp: "2026-06-03T11:00:00Z",
  similarity_score: 0,        // No match score
  verified: "Unverified",
  liveness_passed: true,
  
  // 🔒 Encrypted embedding goes to AWS
  embedding: [0.111, 0.222, 0.333, ...]   // Decrypted before sending
}
```

---

## Stage 3 — Human Review (Admin/Supervisor)

### What happens in the UI:
- Admin sees unverified attendance on dashboard
- Admin reviews the face image
- Admin says "Approve" or "Reject"

### What happens in IndexedDB:

**dbService.updateUnverifiedReview() is called:**

#### 1️⃣ Updates `unverified_attendance`:
```javascript
{
  attendance_id: "UNVER_20260603_001",
  embedding: {...},           // Still there, encrypted
  site_id: "SITE_A",
  timestamp: "2026-06-03T11:00:00Z",
  review_status: "approved",  // ← Changed from "pending"
  reviewed_by: "admin_user_1",
  reviewed_at: "2026-06-03T14:30:00Z"
}
```

#### 2️⃣ Adds to `sync_queue`:
```javascript
{
  queue_id: "q_jkl012mno345",
  entity_type: "review",      // ← Different! This is a review operation
  entity_id: "UNVER_20260603_001",
  operation: "update",
  status: "pending",
  created_at: "2026-06-03T14:30:00Z"
}
```

### Why a separate queue item?
- **Two sync operations happen:**
  1. Initial: "I saw a face, don't know who" (unverified attendance) → POST /attendance
  2. Later: "Admin reviewed it, decision made" (review) → PUT /attendance/review
- They're tracked separately so if one fails, retry happens independently

---

## Stage 4 — syncService Sends Review to AWS

### Payload sent to AWS (PUT /attendance/review):

```javascript
{
  attendance_id: "UNVER_20260603_001",
  review_status: "approved",  // or "rejected"
  reviewed_by: "admin_user_1",
  reviewed_at: "2026-06-03T14:30:00Z"
}
```

### What happens on AWS:
- Updates the existing attendance record with review decision
- Now AWS knows: "This unverified face was reviewed and approved as [real person]"

---

# COMPLETE DATA LIFECYCLE TIMELINE

```
[OFFLINE PHASE]
├─ 10:30 → Worker enrolled
│   ├─ Store in: workers table + sync_queue
│   └─ Encrypted embeddings saved locally
│
├─ 10:35 → Verified attendance marked
│   ├─ Store in: attendance table + sync_queue
│   └─ No embedding (already verified)
│
├─ 11:00 → Unverified attendance (unknown face)
│   ├─ Store in: unverified_attendance table + sync_queue
│   └─ Encrypted embedding saved locally
│
└─ 14:00 → Device comes ONLINE
   └─ Battery: 50%, Signal: 4G
   
[SYNC PHASE - Device Online]
├─ 14:01 → syncService.syncNow() triggered
│   ├─ Get 3 pending items from sync_queue
│   ├─ For WORKER_001:
│   │   ├─ Fetch from IndexedDB
│   │   ├─ Decrypt embeddings
│   │   └─ POST /workers → AWS ✅
│   ├─ For ATT_20260603_001:
│   │   └─ POST /attendance → AWS ✅
│   └─ For UNVER_20260603_001:
│       └─ POST /attendance → AWS ✅
│
├─ 14:02 → Human admin reviews
│   ├─ updateUnverifiedReview("approved")
│   └─ Adds to sync_queue
│
├─ 14:05 → Auto-sync kicks in again
│   └─ PUT /attendance/review → AWS ✅
│
└─ 14:10 → Cleanup (runAutoPurge)
   ├─ All synced records from before 14:10 yesterday deleted
   └─ Local storage cleaned up

[PERMANENT STATE - AWS DynamoDB]
├─ nhai-workers
│   └─ WORKER_001: name, embeddings, created_at
├─ nhai-attendance
│   ├─ ATT_20260603_001: verified, worker_id, timestamp
│   └─ UNVER_20260603_001: unverified→approved, embedding, review_by, review_at
```

---

# WHAT GETS ENCRYPTED vs. NOT

## 🔒 Encrypted (Web Crypto API AES-GCM):
- Worker embeddings (face templates)
- Unverified attendance embeddings (faces awaiting review)

## ✅ NOT Encrypted:
- Metadata: worker_id, name, site_id, timestamps
- Attendance records: timestamp, similarity_score, verified status
- Review decisions: reviewed_by, review_status

**Why?** Embeddings are the sensitive biometric data. Metadata is necessary for indexing/searching in DynamoDB.

---

# WHAT AWS RECEIVES vs. WHAT IT DOESN'T

## AWS Knows:
✅ Worker names, IDs, which site they work at  
✅ All attendance timestamps (who logged in when)  
✅ Whether attendance was verified or not  
✅ Review decisions (approved/rejected)  
✅ Face embeddings (encrypted form? NO — they're decrypted before sending)  

## AWS Does NOT Know:
❌ The original face images (only embeddings)  
❌ The encryption key (device-only)  
❌ Which specific face corresponds to which worker (for unverified attendance)  

---

# KEY DIFFERENCE: IndexedDB vs. AWS

| Property | IndexedDB | AWS DynamoDB |
|----------|-----------|-------------|
| **Persistence** | Until purged (24h) | Permanent |
| **Availability** | Offline-only | Always accessible |
| **Encryption** | Yes (AES-GCM) | No (in transit via HTTPS) |
| **Speed** | Fast (local) | Slower (network) |
| **Use Case** | Temporary cache | Source of truth |

---

# SYNC QUEUE STATUS MEANINGS

```javascript
// When added to queue
status: "pending"  → Not sent to AWS yet

// During sync attempt
status: "pending"  → Trying to send right now

// After successful POST/PUT
status: "success"  (implicitly) → Item removed from queue

// If network error or AWS rejects
status: "failed"   → Retry on next sync attempt
```

---

# REAL-WORLD EXAMPLE SCENARIO

```
Monday 10:00 AM - Device Offline (WiFi down)
─────────────────────────────────────────────
Action: Worker "Raj" (ID: W001) enrolls
  → IndexedDB: workers {W001: {name: Raj, embeddings...}}
  → IndexedDB: sync_queue {q_1: {entity_type: worker, entity_id: W001, status: pending}}

10:05 AM - Raj marks attendance (face matched to W001)
  → IndexedDB: attendance {ATT_001: {worker_id: W001, verified: Verified}}
  → IndexedDB: sync_queue {q_2: {entity_type: attendance, entity_id: ATT_001, status: pending}}

10:10 AM - Unknown face appears
  → IndexedDB: unverified_attendance {UNVER_001: {embedding: {...}, review_status: pending}}
  → IndexedDB: sync_queue {q_3: {entity_type: attendance, entity_id: UNVER_001, status: pending}}

📱 IndexedDB now has 3 items pending sync
   Queue: [q_1 (worker), q_2 (attendance), q_3 (unverified)]


Monday 3:00 PM - Device Back Online (WiFi/4G connected)
──────────────────────────────────────────────────────
syncService.syncNow() triggers automatically

Request 1: POST /workers
  {worker_id: W001, name: Raj, embeddings: [...]}
  → AWS nhai-workers table ✅
  → IndexedDB: workers {W001}.sync_status = "synced"
  → IndexedDB: sync_queue.q_1 deleted

Request 2: POST /attendance  
  {attendance_id: ATT_001, worker_id: W001, verified: Verified}
  → AWS nhai-attendance table ✅
  → IndexedDB: attendance {ATT_001}.sync_status = "synced"
  → IndexedDB: sync_queue.q_2 deleted

Request 3: POST /attendance
  {attendance_id: UNVER_001, worker_id: unassigned, embedding: [...]}
  → AWS nhai-attendance table ✅
  → IndexedDB: unverified_attendance {UNVER_001}.sync_status = "synced"? NO (unverified_attendance doesn't have sync_status!)
  → IndexedDB: sync_queue.q_3 deleted


Monday 4:00 PM - Admin Reviews Unverified
────────────────────────────────────────
Admin says: "Approve — this is Raj"
  → IndexedDB: unverified_attendance {UNVER_001}.review_status = "approved"
  → IndexedDB: sync_queue {q_4: {entity_type: review, entity_id: UNVER_001, status: pending}}

3:05 PM - Auto-sync kicks in again
Request 4: PUT /attendance/review
  {attendance_id: UNVER_001, review_status: approved, reviewed_by: admin}
  → AWS nhai-attendance table (updates existing record) ✅
  → IndexedDB: sync_queue.q_4 deleted


Monday 4:10 PM - Auto-purge runs
──────────────────────────────────
Delete from IndexedDB:
  ❌ workers {W001} — created_at was before 24h ago? No, created today → kept
  ❌ attendance {ATT_001} — before 24h ago? No → kept
  ✅ Will be deleted tomorrow at 4:10 PM


AWS DynamoDB Final State:
──────────────────────
nhai-workers:
  W001: {name: Raj, site_id: ..., embedding_front: [...], embedding_left: [...], embedding_right: [...]}

nhai-attendance:
  ATT_001: {worker_id: W001, verified: Verified, timestamp: ...}
  UNVER_001: {worker_id: unassigned, verified: Unverified, embedding: [...], review_status: approved, reviewed_by: admin}
```

---

# SUMMARY TABLE

| Data Type | Stored in IndexedDB? | Encrypted Locally? | Sent to AWS? | Stays in AWS? | Purged After 24h? |
|-----------|---|---|---|---|---|
| Worker Record | ✅ | ✅ Embeddings only | ✅ | ✅ | ✅ |
| Verified Attendance | ✅ | ❌ | ✅ | ✅ | ✅ |
| Unverified Attendance | ✅ | ✅ Embeddings only | ✅ | ✅ | ✅ |
| Review Decision | ✅ | ❌ | ✅ (as update) | ✅ | ✅ |