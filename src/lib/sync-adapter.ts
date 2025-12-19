// Sync adapter: replace the endpoints below with your backend (Supabase or any REST).
// It pulls a snapshot and pushes the outbox. Uses fetch with abort safety.

import { flushQueue, readQueue, clearQueue, SyncOperation } from "@/lib/offline-sync";

const API_BASE = import.meta.env.VITE_SYNC_API ?? ""; // e.g., https://your-api.com
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""; // Supabase anon key for auth

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
    const baseHeaders: Record<string, string> = {};
    if (API_KEY) {
      baseHeaders["apikey"] = API_KEY;
      baseHeaders["Authorization"] = `Bearer ${API_KEY}`;
    }

    const res = await fetch(url, {
      ...opts,
      headers: { ...baseHeaders, ...(opts.headers || {}), "Content-Type": "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(id);
  }
}

export async function pullSnapshot(): Promise<Snapshot | null> {
  if (!API_BASE) return null;
  try {
    const raw = await safeFetch(`${API_BASE}/sync/snapshot`);
    // Map snake_case from Supabase to camelCase used in the app.
    return {
      ...raw,
      config: raw?.config
        ? {
            ...raw.config,
            storeName: raw.config.store_name ?? raw.config.storeName,
            currency: raw.config.currency,
            exchangeRate: raw.config.exchange_rate ?? raw.config.exchangeRate,
          }
        : raw?.config,
      products: (raw?.products || []).map((p: any) => ({
        ...p,
        categoryId: p.category_id ?? p.categoryId ?? "",
      })),
      categories: raw?.categories || [],
      sales: (raw?.sales || []).map((s: any) => ({
        ...s,
        invoiceNumber: s.invoice_number ?? s.invoiceNumber,
        paymentMethod: s.payment_method ?? s.paymentMethod,
        exchangeRate: s.exchange_rate ?? s.exchangeRate,
      })),
      purchases: (raw?.purchases || []).map((p: any) => ({
        ...p,
        invoiceNumber: p.invoice_number ?? p.invoiceNumber,
        exchangeRate: p.exchange_rate ?? p.exchangeRate,
      })),
    };
  } catch {
    return null;
  }
}

// Convert camelCase payloads to the snake_case columns expected by Supabase tables.
function mapOutbound(op: SyncOperation): SyncOperation {
  const cloned = { ...op, payload: { ...(op as any).payload } };
  switch (op.type) {
    case "ADD_PRODUCT":
    case "UPDATE_PRODUCT":
      cloned.payload = {
        id: op.payload.id,
        name: op.payload.name,
        price: op.payload.price,
        stock: op.payload.stock,
        barcode: op.payload.barcode ?? "",
        category_id: op.payload.categoryId ?? null,
        image: op.payload.image ?? null,
      };
      break;
    case "DELETE_PRODUCT":
      cloned.payload = { id: op.payload.id ?? op.payload };
      break;
    case "ADD_CATEGORY":
    case "UPDATE_CATEGORY":
      cloned.payload = {
        id: op.payload.id,
        name: op.payload.name,
        color: op.payload.color ?? "",
        description: op.payload.description ?? "",
      };
      break;
    case "DELETE_CATEGORY":
      cloned.payload = { id: op.payload.id ?? op.payload };
      break;
    case "UPDATE_CONFIG":
      cloned.payload = {
        id: op.payload.id ?? "singleton",
        store_name: op.payload.storeName ?? "",
        currency: op.payload.currency ?? "",
        exchange_rate: op.payload.exchangeRate ?? null,
      };
      break;
    case "SELL_ITEMS":
      cloned.payload = {
        id: op.payload.id,
        invoice_number: op.payload.invoiceNumber ?? op.payload.invoice_number,
        date: op.payload.date,
        time: op.payload.time,
        items: op.payload.items ?? [],
        total: op.payload.total ?? 0,
        cashier: op.payload.cashier,
        payment_method: op.payload.paymentMethod ?? op.payload.payment_method,
        exchange_rate: op.payload.exchangeRate ?? op.payload.exchange_rate,
      };
      break;
    case "ADD_PURCHASE":
      cloned.payload = {
        id: op.payload.id,
        invoice_number: op.payload.invoiceNumber ?? op.payload.invoice_number,
        supplier: op.payload.supplier ?? "",
        date: op.payload.date,
        time: op.payload.time,
        items: op.payload.items ?? [],
        total: op.payload.total ?? 0,
        exchange_rate: op.payload.exchangeRate ?? op.payload.exchange_rate,
      };
      break;
    default:
      break;
  }
  return cloned;
}

export async function pushOutbox(handler?: (ops: SyncOperation[]) => void) {
  if (!API_BASE) return;
  const ops = (await readQueue()).map(mapOutbound);
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
  // Push local outbox first so we don't lose freshly added items when we pull.
  await pushOutbox();
  const snap = await pullSnapshot();
  if (snap) onPulled(snap);
}
