// Sync adapter: replace the endpoints below with your backend (Supabase or any REST).
// It pulls a snapshot and pushes the outbox. Uses fetch with abort safety.

import { flushQueue, readQueue, clearQueue, SyncOperation } from "@/lib/offline-sync";

const API_BASE = import.meta.env.VITE_SYNC_API ?? ""; // e.g., https://your-api.com

type Snapshot = {
  config?: any;
  products?: any[];
  categories?: any[];
  sales?: any[];
  purchases?: any[];
};

async function safeFetch(url: string, opts: RequestInit = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(id);
  }
}

export async function pullSnapshot(): Promise<Snapshot | null> {
  if (!API_BASE) return null;
  try {
    return await safeFetch(`${API_BASE}/sync/snapshot`);
  } catch {
    return null;
  }
}

export async function pushOutbox(handler?: (ops: SyncOperation[]) => void) {
  if (!API_BASE) return;
  const ops = await readQueue();
  if (!ops.length) return;
  try {
    await safeFetch(`${API_BASE}/sync/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops }),
    });
    if (handler) handler(ops);
    await clearQueue();
  } catch {
    // keep queue; retry later
  }
}

// High-level: pull then push queue (or vice-versa). Call on online event or “Sync now”.
export async function syncNow(onPulled: (snapshot: Snapshot) => void) {
  const snap = await pullSnapshot();
  if (snap) onPulled(snap);
  await pushOutbox();
}
