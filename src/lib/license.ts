import { v4 as uuidv4 } from "uuid";

const LICENSE_KEY_STORAGE = "pos_license_key";
const DEVICE_ID_STORAGE = "pos_device_id";
const DEVICE_NAME_STORAGE = "pos_device_name";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_STORAGE);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(DEVICE_ID_STORAGE, id);
  }
  return id;
}

export function getDeviceName(): string {
  if (typeof window === "undefined") return "";
  let cached = localStorage.getItem(DEVICE_NAME_STORAGE);
  if (cached) return cached;
  const ua = navigator.userAgent || "";
  let name = "Unknown device";
  if (/iPhone/i.test(ua)) name = "iPhone";
  else if (/iPad/i.test(ua)) name = "iPad";
  else if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s+[0-9.]+;\s*([^;)]*)/i);
    name = match?.[1]?.trim() || "Android";
  } else if (/Windows/i.test(ua)) name = "Windows PC";
  else if (/Macintosh/i.test(ua)) name = "Mac";
  else if (/Linux/i.test(ua)) name = "Linux";
  localStorage.setItem(DEVICE_NAME_STORAGE, name);
  return name;
}

export function getLicenseKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LICENSE_KEY_STORAGE) || "";
}

export function setLicenseKey(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LICENSE_KEY_STORAGE, key.trim());
}

export function clearLicense() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LICENSE_KEY_STORAGE);
}

export function licenseHeaders(overrideKey?: string) {
  const key = (overrideKey ?? getLicenseKey()).trim();
  const deviceId = getDeviceId();
  const deviceName = getDeviceName();
  return key
    ? {
        "X-License-Key": key,
        "X-Device-Id": deviceId,
        "X-Device-Name": deviceName,
      }
    : {};
}
