// Sync adapter: replace the endpoints below with your backend (Supabase or any REST).
// It pulls a snapshot and pushes the outbox. Uses fetch with abort safety.

import { flushQueue, readQueue, clearQueue, SyncOperation } from "@/lib/offline-sync";
import { hashPassword, isHashed } from "@/lib/accounts";
import { licenseHeaders, getDeviceId, clearLicense } from "@/lib/license";

const API_BASE = import.meta.env.VITE_SYNC_API ?? ""; // e.g., https://your-api.com
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""; // Supabase anon key for auth

type Snapshot = {
  config?: any;
  products?: any[];
  categories?: any[];
  sales?: any[];
  purchases?: any[];
  accounts?: any[];
  license?: { devices?: string[]; maxDevices?: number };
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
      headers: {
        ...baseHeaders,
        ...licenseHeaders(),
        ...(opts.headers || {}),
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const bodyText = await res.text();
      const errMsg = `HTTP ${res.status} ${bodyText}`;
      console.error("Sync request failed:", errMsg);
      throw new Error(errMsg);
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    return res.text();
  } finally {
    clearTimeout(id);
  }
}

export async function pullSnapshot(overrideLicenseKey?: string, registerDevice = false): Promise<Snapshot | null> {
  if (!API_BASE) return null;
  try {
    const raw = await safeFetch(
      `${API_BASE}/sync/snapshot`,
      {
        headers: licenseHeaders(overrideLicenseKey, registerDevice),
      },
    );
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
        createdBy: p.created_by ?? p.createdBy ?? null,
      })),
      accounts: (raw?.accounts || []).map((a: any) => ({
        ...a,
        password: hashPassword(isHashed(a.password ?? "") ? a.password : a.password ?? ""),
        createdBy: a.created_by ?? a.createdBy ?? null,
      })),
      license: raw?.license
        ? {
            devices: raw.license.devices ?? [],
            maxDevices: raw.license.max_devices ?? raw.license.maxDevices ?? null,
          }
        : null,
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
        created_by: op.payload.createdBy ?? op.payload.created_by ?? null,
      };
      break;
    case "ADD_ACCOUNT":
    case "UPDATE_ACCOUNT":
      cloned.payload = {
        username: op.payload.username,
        password: hashPassword(op.payload.password),
        role: op.payload.role,
        created_by: op.payload.createdBy ?? op.payload.created_by ?? null,
      };
      break;
    case "DELETE_ACCOUNT":
      cloned.payload = { username: op.payload.username ?? op.payload };
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
    console.error("pushOutbox failed; will retry later");
  }
}

// High-level: pull then push queue (or vice-versa). Call on online event or “Sync now”.
export async function syncNow(onPulled: (snapshot: Snapshot) => void) {
  // Push local outbox first so we don't lose freshly added items when we pull.
  await pushOutbox();
  const snap = await pullSnapshot();
  if (snap) onPulled(snap);
}

export async function validateLicense(key: string) {
  const snap = await pullSnapshot(key, true);
  return !!snap;
}

export async function removeLinkedDevice(deviceId: string) {
  if (!API_BASE) return false;
  try {
    await safeFetch(`${API_BASE}/sync/device-remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    // إذا حذف المستخدم الجهاز الحالي، نظف الترخيص ثم أعد تحميل الصفحة لطلب المفتاح مجدداً.
    if (deviceId === getDeviceId() && typeof window !== "undefined") {
      try {
        clearLicense();
        const keys = ["pos_device_id", "pos_device_id_custom", "pos_device_name", "pos_device_name_custom", "pos_device_type"];
        keys.forEach((k) => localStorage.removeItem(k));
      } catch {
        /* ignore */
      }
      window.location.reload();
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchLicenseInfo() {
  const snap = await pullSnapshot();
  if (!snap?.license) return null;
  return snap.license;
}
