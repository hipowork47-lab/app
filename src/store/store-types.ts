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
  price: number; // unit price
  stock: number; // available stock
  barcode?: string;
  categoryId?: string; // category id
  image?: string | null;
  deleted?: boolean;
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
  paymentMethod: "cash" | "card" | "transfer";
  exchangeRate?: number;
}

export interface AppConfig {
  storeName: string;
  currency: string; // e.g. "$"
  exchangeRate: number;
}

export interface Gift {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  recipient?: string | null;
  createdAt?: string;
}
// حساب المستخدم
export interface Account {
  username: string;
  password: string;
  role: "admin" | "employee";
  createdBy?: string | null;
}
// فاتورة شراء

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplier: string;
  date: string;
  time: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    description?: string;
  }[];
  total: number;
  exchangeRate?: number;
  createdBy?: string | null;
}

