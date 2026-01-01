// src/store/store.tsx
import React, { createContext, useContext, useEffect, useReducer } from "react";
import type {
  Product,
  Category,
  SaleItem,
  SaleInvoice,
  AppConfig,
  PurchaseInvoice,
} from "./store-types";
import { enqueueOperation } from "@/lib/offline-sync";
import { pushOutbox } from "@/lib/sync-adapter";
import { useRef } from "react";
// تعريف نوع حالة التطبيق
type State = {
  config: AppConfig;
  secondaryCurrency: string;
  products: Product[];
  categories: Category[];
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
};
// أنواع الإجراءات الممكنة لتحديث الحالة

type Action =
  | { type: "SET_CURRENCY"; payload: string }
  | { type: "SET_SECONDARY_CURRENCY"; payload: string }
  | { type: "SET_EXCHANGE_RATE"; payload: number }
  | { type: "ADD_PRODUCT"; payload: Product }
  | { type: "UPDATE_PRODUCT"; payload: Product }
  | { type: "DELETE_PRODUCT"; payload: string }
  | { type: "UPDATE_PRODUCT_PRICE"; payload: { productId: string; price: number } }
  | { type: "ADD_CATEGORY"; payload: Category }
  | { type: "UPDATE_CATEGORY"; payload: Category }
  | { type: "DELETE_CATEGORY"; payload: string }
  | {
      type: "SELL_ITEMS";
      payload: {
        items: { productId: string; quantity: number }[];
        cashier: string;
        paymentMethod: "cash" | "card" | "transfer";
        exchangeRate?: number;
      };
    }
  | {
      type: "ADD_PURCHASE";
      payload: {
        supplier: string;
        items: { productId: string; name?: string; price: number; quantity: number }[];
        invoiceNumber?: string;
        date?: string;
        time?: string;
        createdBy?: string | null;
        exchangeRate?: number;
      };
    }
  | { type: "LOAD_STATE"; payload: State }
  | { type: "APPLY_SNAPSHOT"; payload: Partial<State> };

const defaultCategories: Category[] = [];

const defaultProducts: Product[] = [];

const initialState: State = {
  config: { storeName: "المتجر", currency: "$", exchangeRate: 40 },
  secondaryCurrency: "Bs",
  categories: [],
  products: [],
  sales: [],
  purchases: [],
};

const PLACEHOLDER_PRODUCT_NAMES = ["Product Name", "Nombre del producto", "اسم المنتج", "ā?ā?į?į?"];

function sanitizeProducts(products: Product[], sales: SaleInvoice[], purchases: PurchaseInvoice[]) {
  if (!products?.length) return [];
  const referenced = new Set<string>();
  sales?.forEach((inv) => inv.items?.forEach((it) => it.productId && referenced.add(it.productId)));
  purchases?.forEach((inv) => inv.items?.forEach((it) => it.productId && referenced.add(it.productId)));

  return products.filter((p) => {
    if (!p.id) return false;
    const name = (p.name || "").trim();
    const isPlaceholder = PLACEHOLDER_PRODUCT_NAMES.includes(name);
    if (isPlaceholder && !referenced.has(p.id)) {
      return false;
    }
    return true;
  });
}
const STORAGE_KEY = "pos_app_state_v1";

function queueConfigUpdate(config: AppConfig) {
  enqueueOperation({
    type: "UPDATE_CONFIG",
    payload: {
      id: "singleton",
      storeName: config.storeName,
      currency: config.currency,
      exchangeRate: config.exchangeRate,
    },
  });
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[] = []): T[] {
  const map = new Map<string, T>();
  current.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_CURRENCY":
      {
        const nextConfig = { ...state.config, currency: action.payload };
        queueConfigUpdate(nextConfig);
        return { ...state, config: nextConfig };
      }
    case "SET_SECONDARY_CURRENCY":
      return { ...state, secondaryCurrency: action.payload };
    case "SET_EXCHANGE_RATE":
      {
        const nextConfig = { ...state.config, exchangeRate: action.payload };
        queueConfigUpdate(nextConfig);
        return { ...state, config: nextConfig };
      }
    case "ADD_PRODUCT":
      enqueueOperation({ type: "ADD_PRODUCT", payload: action.payload });
      return { ...state, products: [...state.products, action.payload] };
    case "UPDATE_PRODUCT":
      enqueueOperation({ type: "UPDATE_PRODUCT", payload: action.payload });
      return {
        ...state,
        products: state.products.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };
    case "DELETE_PRODUCT":
      enqueueOperation({ type: "DELETE_PRODUCT", payload: { id: action.payload } });
      return { ...state, products: state.products.filter((p) => p.id !== action.payload) };
    case "UPDATE_PRODUCT_PRICE":
      {
        const existing = state.products.find((p) => p.id === action.payload.productId);
        if (existing) {
          enqueueOperation({
            type: "UPDATE_PRODUCT",
            payload: { ...existing, price: action.payload.price },
          });
        }
      }
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.productId ? { ...p, price: action.payload.price } : p
        ),
      };
    case "ADD_CATEGORY":
      enqueueOperation({ type: "ADD_CATEGORY", payload: action.payload });
      return { ...state, categories: [...state.categories, action.payload] };
    case "UPDATE_CATEGORY":
      enqueueOperation({ type: "UPDATE_CATEGORY", payload: action.payload });
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === action.payload.id ? action.payload : c)),
      };
    case "DELETE_CATEGORY":
      enqueueOperation({ type: "DELETE_CATEGORY", payload: { id: action.payload } });
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
        products: state.products.map((p) =>
          p.categoryId === action.payload ? { ...p, categoryId: undefined } : p
        ),
      };
    case "SELL_ITEMS": {
      const { items, cashier, paymentMethod, exchangeRate } = action.payload;
      const updatedProducts = state.products.map((p) => {
        const sold = items.find((it) => it.productId === p.id);
        return sold ? { ...p, stock: Math.max(0, p.stock - sold.quantity) } : p;
      });

      const now = new Date();
      const id = now.getTime().toString();
      const saleItems: SaleItem[] = items.map((it) => {
        const prod = state.products.find((p) => p.id === it.productId);
        return {
          productId: it.productId,
          name: prod?.name ?? "منتج",
          price: prod?.price ?? 0,
          quantity: it.quantity,
        };
      });
      const total = saleItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

      const invoice: SaleInvoice = {
        id,
        invoiceNumber: `S-${id}`,
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().slice(0, 5),
        items: saleItems,
        total,
        cashier,
        paymentMethod,
        exchangeRate: exchangeRate ?? state.config.exchangeRate,
      };

      enqueueOperation({ type: "SELL_ITEMS", payload: invoice });
      // Also push stock updates for affected products.
      items.forEach((it) => {
        const updated = updatedProducts.find((p) => p.id === it.productId);
        if (updated) {
          enqueueOperation({ type: "UPDATE_PRODUCT", payload: updated });
        }
      });
      return { ...state, products: updatedProducts, sales: [...state.sales, invoice] };
    }
    case "ADD_PURCHASE": {
      const { supplier, items, invoiceNumber, date, time, createdBy, exchangeRate } = action.payload;

      const productsMap = new Map<string, Product>();
      state.products.forEach((p) => productsMap.set(p.id, p));

    items.forEach((it) => {
      if (!it.productId) return; // Ignore purchase lines without a selected product
      const existing = productsMap.get(it.productId);
      if (existing) {
        productsMap.set(it.productId, {
          ...existing,
          stock: existing.stock + it.quantity,
            // Keep existing price; do not override product price from purchase line.
            name: it.name ?? existing.name,
          });
        } else {
          productsMap.set(it.productId, {
            id: it.productId,
            name: it.name ?? "منتج",
            price: it.price ?? 0,
            stock: it.quantity,
          });
        }
      });

      const purchaseItems = items.map((it) => ({
        productId: it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
      }));
      const total = purchaseItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

      const now = new Date();
      const id = now.getTime().toString();
      const invoice: PurchaseInvoice = {
        id,
        invoiceNumber: invoiceNumber ?? `P-${id}`,
        supplier,
        date: date ?? now.toISOString().split("T")[0],
        time: time ?? now.toTimeString().slice(0, 5),
        items: purchaseItems,
        total,
        exchangeRate: exchangeRate ?? state.config.exchangeRate,
        createdBy: createdBy ?? null,
      };

      enqueueOperation({ type: "ADD_PURCHASE", payload: invoice });
      // Push stock/price updates for affected products.
      purchaseItems.forEach((it) => {
        if (!it.productId) return;
        const updated = productsMap.get(it.productId);
        if (updated) {
          enqueueOperation({ type: "UPDATE_PRODUCT", payload: updated });
        }
      });
      return {
        ...state,
        products: Array.from(productsMap.values()),
        purchases: [...state.purchases, invoice],
      };
    }
    case "LOAD_STATE":
      return {
        ...state,
        ...action.payload,
        secondaryCurrency: (action.payload as any).secondaryCurrency ?? state.secondaryCurrency,
      };
    case "APPLY_SNAPSHOT":
      return {
        config: action.payload.config ?? state.config,
        secondaryCurrency: (action.payload as any).secondaryCurrency ?? state.secondaryCurrency,
        categories: mergeById(state.categories, action.payload.categories ?? []),
        products: mergeById(state.products, action.payload.products ?? []),
        sales: mergeById(state.sales, action.payload.sales ?? []),
        purchases: mergeById(state.purchases, action.payload.purchases ?? []),
      };
    default:
      return state;
  }
}

interface StoreContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPushing = useRef(false);
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as State;
        return {
          ...init,
          ...parsed,
          products: sanitizeProducts(parsed.products ?? [], parsed.sales ?? [], parsed.purchases ?? []),
        };
      }
    } catch {
      // ignore parse errors
    }
    return init;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage write errors
    }
    // Best-effort: debounce push to Supabase whenever state changes.
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      if (isPushing.current) return;
      isPushing.current = true;
      try {
        await pushOutbox();
      } catch {
        // keep queue for retry
      } finally {
        isPushing.current = false;
      }
    }, 400);
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

