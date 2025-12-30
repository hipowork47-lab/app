const LICENSE_KEY_STORAGE = "pos_license_key";
const DEVICE_ID_STORAGE = "pos_device_id";
const DEVICE_NAME_STORAGE = "pos_device_name";
const DEVICE_ID_OVERRIDE = "pos_device_id_custom";
const DEVICE_NAME_OVERRIDE = "pos_device_name_custom";
const DEVICE_TYPE_STORAGE = "pos_device_type";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const override = localStorage.getItem(DEVICE_ID_OVERRIDE);
  if (override) return override;
  let id = localStorage.getItem(DEVICE_ID_STORAGE);
  if (id) return id;

  const platform = navigator.platform || "";
  const lang = navigator.language || "";
  const screenSize =
    typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : "unknown";
  const fingerprint = `${platform}|${lang}|${screenSize}`;

  // FNV-1a hash for a stable fingerprint
  let hash = 2166136261;
  for (let i = 0; i < fingerprint.length; i++) {
    hash ^= fingerprint.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  id = `fp-${(hash >>> 0).toString(16)}`;
  localStorage.setItem(DEVICE_ID_STORAGE, id);
  return id;
}

export function setCustomDeviceId(id: string) {
  if (typeof window === "undefined") return;
  const val = id.trim();
  if (val) {
    localStorage.setItem(DEVICE_ID_OVERRIDE, val);
    localStorage.setItem(DEVICE_ID_STORAGE, val);
  }
}

export function getDeviceName(): string {
  if (typeof window === "undefined") return "";
  const override = localStorage.getItem(DEVICE_NAME_OVERRIDE);
  if (override) return override;
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

export function setCustomDeviceName(name: string) {
  if (typeof window === "undefined") return;
  const val = name.trim();
  if (val) {
    localStorage.setItem(DEVICE_NAME_OVERRIDE, val);
    localStorage.setItem(DEVICE_NAME_STORAGE, val);
  } else {
    localStorage.removeItem(DEVICE_NAME_OVERRIDE);
  }
}

export function getDeviceType(): string {
  if (typeof window === "undefined") return "";
  const cached = localStorage.getItem(DEVICE_TYPE_STORAGE);
  if (cached) return cached;
  const ua = navigator.userAgent || "";
  let type = "Unknown";
  if (/iPhone/i.test(ua)) type = "iPhone";
  else if (/iPad/i.test(ua)) type = "iPad";
  else if (/Android/i.test(ua)) type = "Android";
  else if (/Windows/i.test(ua)) type = "Windows";
  else if (/Macintosh/i.test(ua)) type = "Mac";
  else if (/Linux/i.test(ua)) type = "Linux";
  localStorage.setItem(DEVICE_TYPE_STORAGE, type);
  return type;
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
  const deviceType = getDeviceType();
  return key
    ? {
        "X-License-Key": key,
        "X-Device-Id": deviceId,
        "X-Device-Name": deviceName,
        "X-Device-Type": deviceType,
      }
    : {};
}
