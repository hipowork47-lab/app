// src/store/store.tsx
import React, { createContext, useContext, useEffect, useReducer, useRef } from "react";
import type {
  Product,
  Category,
  SaleItem,
  SaleInvoice,
  AppConfig,
  PurchaseInvoice,
} from "./store-types";
import { enqueueOperation, loadOfflineState, saveOfflineState } from "@/lib/offline-sync";
import { syncNow } from "@/lib/sync-adapter";

function mergeById<T extends { id: string }>(current: T[], incoming: T[] = []): T[] {
  const merged = new Map<string, T>();
  current.forEach((item) => merged.set(item.id, item));
  incoming.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
}

type State = {
  config: AppConfig;
  products: Product[];
  categories: Category[];
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[]; // فواتير المشتريات
};

type Action =
  | { type: "SET_CURRENCY"; payload: string }
  | { type: "ADD_PRODUCT"; payload: Product }
  | { type: "DELETE_PRODUCT"; payload: string }
  | { type: "SET_EXCHANGE_RATE"; payload: number }
  | { type: "UPDATE_PRODUCT"; payload: Product }
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
        items: { productId: string; quantity: number; price: number }[];
        invoiceMeta?: { invoiceNumber?: string; date?: string; time?: string };
      };
    }
  | { type: "LOAD_STATE"; payload: State }
  | { type: "APPLY_SNAPSHOT"; payload: Partial<State> };

const initialState: State = {
  config: {
   storeName: "المتجر الرئيسي",
    currency: "$",
    exchangeRate: 40, // مثال مبدئي
  },
  categories: [
    { id: "1", name: "مشروبات", color: "#3B82F6", description: "" },
    { id: "2", name: "وجبات خفيفة", color: "#10B981", description: "" },
    { id: "3", name: "حلويات", color: "#F59E0B", description: "" },
  ],
  products: [
    { id: "1", name: "كوكا كولا", price: 2.5, stock: 100, barcode: "12345", categoryId: "1", image: null },
    { id: "2", name: "شيبس", price: 1.5, stock: 50, barcode: "67890", categoryId: "2", image: null },
    { id: "3", name: "شوكولاتة", price: 3.0, stock: 80, barcode: "11111", categoryId: "3", image: null },
    { id: "4", name: "عصير برتقال", price: 4.0, stock: 60, barcode: "22222", categoryId: "1", image: null },
  ],
  sales: [],
  purchases: [],
};

const STORAGE_KEY = "pos_app_state_v1";

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_CURRENCY":
      return { ...state, config: { ...state.config, currency: action.payload } };  
   case "SET_EXCHANGE_RATE": {
  const newState = {
    ...state,
    config: { ...state.config, exchangeRate: action.payload },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState)); // حفظ مباشر
  } catch (e) {
    console.error("فشل حفظ سعر الصرف:", e);
  }

  return newState;
}



    case "ADD_PRODUCT":
      return { ...state, products: [...state.products, action.payload] };

    case "UPDATE_PRODUCT":
      return {
        ...state,
        products: state.products.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };

    case "DELETE_PRODUCT":
      return { ...state, products: state.products.filter((p) => p.id !== action.payload) };

    case "UPDATE_PRODUCT_PRICE":
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.productId ? { ...p, price: action.payload.price } : p
        ),
      };

    case "ADD_CATEGORY":
      return { ...state, categories: [...state.categories, action.payload] };

    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === action.payload.id ? action.payload : c)),
      };

    case "DELETE_CATEGORY":
      return { ...state, categories: state.categories.filter((c) => c.id !== action.payload) };

    case "SELL_ITEMS": {
      const { items, cashier, paymentMethod, exchangeRate } = action.payload;

     // ✅ عند البيع يجب إنقاص المخزون
const updatedProducts = state.products.map((p) => {
  const sold = items.find((it) => it.productId === p.id);
  if (sold) {
    return { ...p, stock: Math.max(p.stock - sold.quantity, 0) }; // عدم السماح بالسالب
  }
  return p;
});



      const total = items.reduce((sum, it) => {
        const prod = state.products.find((p) => p.id === it.productId);
        return sum + (prod ? prod.price * it.quantity : 0);
      }, 0);

      const now = new Date();
      const invoice: SaleInvoice = {
        id: Date.now().toString(),
        invoiceNumber: `INV-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${now.getTime().toString().slice(-4)}`,
        date: now.toISOString().slice(0, 10),
        time: now.toLocaleTimeString(),
        items: items.map((i) => {
          const prod = state.products.find((p) => p.id === i.productId);
          return {
            productId: i.productId,
            name: prod ? prod.name : i.productId,
            price: prod ? prod.price : 0,
            quantity: i.quantity,
          } as SaleItem;
        }),
        total,
        cashier,
        paymentMethod,
        // Capture the exchange rate at invoice creation time to keep historical Bs amounts stable.
        exchangeRate: exchangeRate ?? state.config.exchangeRate,
      };

      return { ...state, products: updatedProducts, sales: [...state.sales, invoice] };
    }

case "ADD_PURCHASE": {
  const { supplier, items, invoiceMeta } = action.payload;

  // ✅ تحديث المنتجات: فقط زيادة المخزون بدون تعديل السعر نهائيًا
  const updatedProducts = state.products.map((p) => {
    const purchased = items.find((it) => it.productId === p.id);
    if (purchased) {
      return { ...p, stock: p.stock + purchased.quantity }; // بدون تغيير السعر
    }
    return p;
  });

  // ✅ لو المنتج جديد وغير موجود بالمخزون، نضيفه كمنتج جديد بسعره الخاص (ما بيأثر على الموجودين)
  const existingIds = new Set(state.products.map((p) => p.id));
  const newProductsToAdd = items
    .filter((it) => !existingIds.has(it.productId) && it.name !== "(منتج غير محدد)")
    .map((it) => ({
      id: it.productId,
      name: it.name ?? "منتج جديد",
      price: it.price, // هذا فقط للمنتج الجديد
      stock: it.quantity,
      barcode: "",
      categoryId: "",
      image: null,
    }));

  const finalProducts = [...updatedProducts, ...newProductsToAdd];

  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const now = new Date();

  const invoice: PurchaseInvoice = {
    id: Date.now().toString(),
    invoiceNumber:
      invoiceMeta?.invoiceNumber ??
      `PUR-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${now.getTime().toString().slice(-4)}`,
    supplier,
    date: invoiceMeta?.date ?? now.toISOString().slice(0, 10),
    time: invoiceMeta?.time ?? now.toLocaleTimeString(),
    items: items.map((it) => ({
      productId: it.productId,
      name:
        it.name ??
        state.products.find((p) => p.id === it.productId)?.name ??
        "غير معروف",
      price: it.price,
      quantity: it.quantity,
    })),
    total,
    exchangeRate: invoiceMeta?.exchangeRate ?? state.config.exchangeRate,
  };

  return { ...state, products: finalProducts, purchases: [...state.purchases, invoice] };
}

    case "LOAD_STATE":
      return action.payload;

    case "APPLY_SNAPSHOT": {
      const snap = action.payload as Partial<State>;
      return {
        ...state,
        ...snap,
        config: { ...state.config, ...snap.config },
        products: mergeById(state.products, snap.products ?? []),
        categories: mergeById(state.categories, snap.categories ?? []),
        sales: mergeById(state.sales, snap.sales ?? []),
        purchases: mergeById(state.purchases, snap.purchases ?? []),
      };
    }

    default:
      return state;
  }
}

const StoreContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : init;
      return {
        ...init,
        ...parsed,
        config: {
          ...init.config,
          ...parsed?.config,
          // Always persist/display the dollar symbol, even if old storage had a word value.
          currency: "$",
        },
      };
    } catch {
      return init;
    }
  });

  // Avoid mutating the reducer state directly. Create a normalized state object for consumers.
  const normalizedState: State = {
    ...state,
    config: {
      ...state.config,
      // Force display/persistence of the dollar symbol and keep a sensible exchange rate default.
      currency: "$",
      exchangeRate: Number.isFinite(state.config?.exchangeRate)
        ? state.config.exchangeRate
        : initialState.config.exchangeRate,
    },
    purchases: Array.isArray(state.purchases) ? state.purchases : [],
    products: Array.isArray(state.products) ? state.products : [],
    sales: Array.isArray(state.sales)
      ? state.sales.map((inv) => ({
          ...inv,
          // Preserve historical rate; if missing (old invoices), snapshot current rate once.
          exchangeRate: Number.isFinite(inv?.exchangeRate) ? inv.exchangeRate : state.config.exchangeRate,
        }))
      : [],
    categories: Array.isArray(state.categories) ? state.categories : [],
  };

  // Track when a mutation happened so we can trigger an immediate sync once state is updated.
  const syncRequestedRef = useRef(false);

  // Merge helper to avoid losing local records if the server snapshot is behind.
  function mergeById<T extends { id: string }>(current: T[], incoming: T[] = []): T[] {
    const merged = new Map<string, T>();
    current.forEach((item) => merged.set(item.id, item));
    incoming.forEach((item) => merged.set(item.id, item));
    return Array.from(merged.values());
  }

  const applySnapshot = React.useCallback(
    (snapshot: Partial<State>) => {
      if (!snapshot) return;
      baseDispatch({ type: "APPLY_SNAPSHOT", payload: snapshot });
    },
    [baseDispatch]
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState));
    } catch {}
    saveOfflineState(normalizedState);

  }, [normalizedState]);

  // Lazy load persisted state from IndexedDB (if available) to support offline-first storage across devices.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const offline = await loadOfflineState<State>();
      if (offline && !cancelled) {
        dispatch({ type: "LOAD_STATE", payload: offline });
      }

    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const prevSalesCount = useRef(normalizedState.sales.length);
  const prevPurchasesCount = useRef(normalizedState.purchases.length);
  const prevProductsRef = useRef<Record<string, Product>>(
    Object.fromEntries((normalizedState.products || []).map((p) => [p.id, p]))
  );

  // Enqueue new sales/purchases when they grow (offline outbox)
  useEffect(() => {
    if (normalizedState.sales.length > prevSalesCount.current) {
      const newSale = normalizedState.sales[normalizedState.sales.length - 1];
      enqueueOperation({ type: "SELL_ITEMS", payload: newSale });
      prevSalesCount.current = normalizedState.sales.length;
    }
  }, [normalizedState.sales]);

  useEffect(() => {
    if (normalizedState.purchases.length > prevPurchasesCount.current) {
      const newPurchase = normalizedState.purchases[normalizedState.purchases.length - 1];
      enqueueOperation({ type: "ADD_PURCHASE", payload: newPurchase });
      prevPurchasesCount.current = normalizedState.purchases.length;
    }
  }, [normalizedState.purchases]);

  // Enqueue product stock/price/name/category changes (e.g., after sales or purchases).
  useEffect(() => {
    const prev = prevProductsRef.current;
    const nextMap: Record<string, Product> = {};
    for (const p of normalizedState.products) {
      nextMap[p.id] = p;
      const prevP = prev[p.id];
      if (
        !prevP ||
        prevP.stock !== p.stock ||
        prevP.price !== p.price ||
        prevP.name !== p.name ||
        prevP.categoryId !== p.categoryId ||
        prevP.barcode !== p.barcode ||
        prevP.image !== p.image
      ) {
        enqueueOperation({ type: "UPDATE_PRODUCT", payload: p });
      }
    }
    prevProductsRef.current = nextMap;
  }, [normalizedState.products]);

  const dispatch = React.useCallback(
    (action: Action) => {
      // Queue operations that have enough payload context before reducing
      switch (action.type) {
        case "ADD_PRODUCT":
        case "UPDATE_PRODUCT":
          enqueueOperation({ type: action.type, payload: action.payload });
          break;
        case "DELETE_PRODUCT":
          enqueueOperation({ type: "DELETE_PRODUCT", payload: { id: action.payload } });
          break;
        case "SET_EXCHANGE_RATE":
        case "SET_CURRENCY": {
          // Persist config changes to backend
          const cfg = {
            id: "singleton",
            storeName: normalizedState.config.storeName,
            currency:
              action.type === "SET_CURRENCY" ? action.payload : normalizedState.config.currency,
            exchangeRate:
              action.type === "SET_EXCHANGE_RATE"
                ? action.payload
                : normalizedState.config.exchangeRate,
          };
          enqueueOperation({ type: "UPDATE_CONFIG", payload: cfg });
          break;
        }
        case "UPDATE_PRODUCT_PRICE": {
          const prod = normalizedState.products.find((p) => p.id === action.payload.productId);
          if (prod) {
            enqueueOperation({
              type: "UPDATE_PRODUCT",
              payload: { ...prod, price: action.payload.price },
            });
          }
          break;
        }
        case "ADD_CATEGORY":
        case "UPDATE_CATEGORY":
          enqueueOperation({ type: action.type, payload: action.payload });
          break;
        case "DELETE_CATEGORY":
          enqueueOperation({ type: "DELETE_CATEGORY", payload: { id: action.payload } });
          break;
        default:
          break;
      }
      baseDispatch(action);

      // Request an immediate sync for any mutating action except LOAD_STATE.
      if (action.type !== "LOAD_STATE" && action.type !== "APPLY_SNAPSHOT") {
        syncRequestedRef.current = true;
      }
    },
    [normalizedState.products, baseDispatch]
  );

  // Immediate sync after each mutation (push outbox then pull snapshot) when online.
  useEffect(() => {
    if (!syncRequestedRef.current) return;
    syncRequestedRef.current = false;
    if (typeof window === "undefined" || !navigator.onLine) return;

    syncNow((snapshot) => {
      applySnapshot(snapshot as Partial<State>);
    });
  }, [normalizedState, applySnapshot]);

  // One-time sync on mount to fetch latest snapshot and persist it for future sessions/devices.
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    syncNow((snapshot) => applySnapshot(snapshot as Partial<State>));
  }, [applySnapshot]);

  return <StoreContext.Provider value={{ state: normalizedState, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used ضمن StoreProvider");
  return ctx;
}
