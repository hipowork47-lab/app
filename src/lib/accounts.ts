import { enqueueOperation } from "@/lib/offline-sync";
// Simple localStorage-based account store for demo use.
export type AccountRole = "admin" | "employee";
// password stores a hashed value (not plain text)
export type Account = { username: string; password: string; role: AccountRole; createdBy?: string | null };

const KEY = "pos_accounts_v1";

function hasWindow() {
  return typeof window !== "undefined";
}

const PASSWORD_SALT = "pos_local_salt_v1";
function simpleHash(value: string): string {
  let hash = 2166136261;
  const input = `${value}|${PASSWORD_SALT}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function hashPassword(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("hp$")) return raw; // already hashed
  return `hp$${simpleHash(raw)}`;
}

function normalizeAccount(acc: Account): Account {
  return { ...acc, password: hashPassword(acc.password) };
}

export function loadAccounts(): Account[] {
  if (!hasWindow()) return defaultAccounts();
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Account[]) : [];
    const merged = mergeWithDefaults(parsed.map(normalizeAccount));
    window.localStorage.setItem(KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return defaultAccounts();
  }
}

export function saveAccounts(accounts: Account[]) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(mergeWithDefaults(accounts.map(normalizeAccount))));
  } catch {
    // ignore
  }
}

export function addAccount(account: Account): Account[] {
  const normalized = normalizeAccount(account);
  const existing = loadAccounts();
  const found = existing.find((a) => a.username.toLowerCase() === normalized.username.toLowerCase());
  const withCreator = { ...normalized, createdBy: account.createdBy ?? "system" };
  const next = found
    ? existing.map((a) =>
        a.username.toLowerCase() === normalized.username.toLowerCase() ? withCreator : a
      )
    : [...existing, withCreator];
  saveAccounts(next);
  enqueueOperation({ type: "ADD_ACCOUNT", payload: withCreator });
  return next;
}

export function deleteAccount(username: string): Account[] {
  const existing = loadAccounts().filter(
    (a) => a.username.toLowerCase() !== username.toLowerCase()
  );
  saveAccounts(existing);
  enqueueOperation({ type: "DELETE_ACCOUNT", payload: { username } });
  return existing;
}

export function applyAccountsSnapshot(accounts: Account[]) {
  saveAccounts(accounts.map(normalizeAccount));
}

function defaultAccounts(): Account[] {
  return [
    { username: "Admin", password: hashPassword("admin425"), role: "admin", createdBy: "system" },
    { username: "Worker", password: hashPassword("1234"), role: "employee", createdBy: "system" },
  ];
}

function mergeWithDefaults(accounts: Account[]): Account[] {
  const defaults = defaultAccounts();
  const map = new Map<string, Account>();
  [...accounts, ...defaults].forEach((acc) => map.set(acc.username.toLowerCase(), acc));
  return Array.from(map.values());
}
