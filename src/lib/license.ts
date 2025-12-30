import { v4 as uuidv4 } from "uuid";

const LICENSE_KEY_STORAGE = "pos_license_key";
const DEVICE_ID_STORAGE = "pos_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_STORAGE);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(DEVICE_ID_STORAGE, id);
  }
  return id;
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
  return key
    ? {
        "X-License-Key": key,
        "X-Device-Id": deviceId,
      }
    : {};
}
