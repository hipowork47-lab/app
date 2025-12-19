// src/store/store-types.ts
export interface Category {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;       // سعر الوحدة
  stock: number;       // الكمية المتوفرة
  barcode?: string;
  categoryId?: string; // id الفئة
  image?: string | null;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  items: SaleItem[];
  total: number;
  cashier: string;
 paymentMethod: "cash" | "card" | "transfer"; // ✅ طريقة الدفع
exchangeRate?: number; // ✅ سعر الصرف وقت إنشاء الفاتورة
}

export interface AppConfig {
  storeName: string;
  currency: string; // e.g. "دولار"
   exchangeRate: number; // سعر صرف البوليفار مقابل الدولار
}

export interface Account {
  username: string;
  password: string;
  role: "admin" | "employee";
}
