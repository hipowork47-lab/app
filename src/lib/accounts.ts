import { enqueueOperation } from "@/lib/offline-sync";
// Simple localStorage-based account store for demo use.
export type AccountRole = "admin" | "employee";
export type Account = { username: string; password: string; role: AccountRole; createdBy?: string | null };

const KEY = "pos_accounts_v1";

function hasWindow() {
  return typeof window !== "undefined";
}

export function loadAccounts(): Account[] {
  if (!hasWindow()) return defaultAccounts();
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Account[]) : [];
    const merged = mergeWithDefaults(parsed);
    window.localStorage.setItem(KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return defaultAccounts();
  }
}

export function saveAccounts(accounts: Account[]) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(mergeWithDefaults(accounts)));
  } catch {
    // ignore
  }
}

export function addAccount(account: Account): Account[] {
  const existing = loadAccounts();
  const found = existing.find((a) => a.username.toLowerCase() === account.username.toLowerCase());
  const withCreator = { ...account, createdBy: account.createdBy ?? "system" };
  const next = found
    ? existing.map((a) =>
        a.username.toLowerCase() === account.username.toLowerCase() ? withCreator : a
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
  saveAccounts(accounts);
}

function defaultAccounts(): Account[] {
  return [
    { username: "Admin", password: "admin425", role: "admin", createdBy: "system" },
    { username: "Worker", password: "1234", role: "employee", createdBy: "system" },
  ];
}

function mergeWithDefaults(accounts: Account[]): Account[] {
  const defaults = defaultAccounts();
  const map = new Map<string, Account>();
  [...accounts, ...defaults].forEach((acc) => map.set(acc.username.toLowerCase(), acc));
  return Array.from(map.values());
}
