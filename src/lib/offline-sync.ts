// Minimal offline storage and sync queue using IndexedDB with localStorage fallback.
// No external dependencies; safe to import in React components.

type AnyState = unknown;

export type SyncOperation = {
  id: string;
  type: string;
  payload: any;
  createdAt: number;
};

const DB_NAME = "pos_offline_db";
const DB_VERSION = 1;
const STATE_STORE = "state";
const QUEUE_STORE = "queue";
const STATE_KEY = "app_state";

function hasIndexedDB() {
  return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) return reject(new Error("IndexedDB not available"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE);
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open error"));
  });
}

export async function saveOfflineState(state: AnyState) {
  try {
    const db = await openDB();
    const tx = db.transaction(STATE_STORE, "readwrite");
    tx.objectStore(STATE_STORE).put(state, STATE_KEY);
    await txComplete(tx);
  } catch {
    // fallback best-effort to localStorage
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
}

export async function loadOfflineState<T = AnyState>(): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STATE_STORE, "readonly");
    const req = tx.objectStore(STATE_STORE).get(STATE_KEY);
    const result = await requestAsPromise<T | undefined>(req);
    await txComplete(tx);
    if (result) return result;
  } catch {
    // fall through
  }
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function enqueueOperation(op: Omit<SyncOperation, "id" | "createdAt">) {
  try {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).put({
      ...op,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    } as SyncOperation);
    await txComplete(tx);
  } catch {
    // ignore; queue is best-effort
  }
}

export async function readQueue(): Promise<SyncOperation[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const req = tx.objectStore(QUEUE_STORE).getAll();
    const rows = await requestAsPromise<SyncOperation[]>(req);
    await txComplete(tx);
    return rows || [];
  } catch {
    return [];
  }
}

export async function clearQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).clear();
    await txComplete(tx);
  } catch {
    /* ignore */
  }
}

export async function flushQueue(handler: (ops: SyncOperation[]) => Promise<void>) {
  const ops = await readQueue();
  if (!ops.length) return;
  await handler(ops);
  await clearQueue();
}

function requestAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB request error"));
  });
}

function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction error"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  });
}
