import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization,apikey,content-type,x-license-key,x-device-id,x-device-name,x-device-type,x-device-signature,x-register-device",
};

const supabaseUrl = Deno.env.get("PROJECT_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeSignature(secret: string, licenseKey: string, deviceId: string) {
  const enc = new TextEncoder();
  const data = enc.encode(`${secret}:${licenseKey}:${deviceId}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

async function assertLicense(req: Request) {
  const licenseKey = req.headers.get("x-license-key")?.trim();
  const deviceId = req.headers.get("x-device-id")?.trim();
  const deviceName = req.headers.get("x-device-name")?.trim() || deviceId;
  const deviceType = req.headers.get("x-device-type")?.trim() || "Unknown";
  const registerFlag = req.headers.get("x-register-device") === "1";
  const deviceSignature = req.headers.get("x-device-signature")?.trim() || "";
  if (!licenseKey || !deviceId) {
    return { ok: false, status: 401, error: "License required" };
  }

  const { data, error } = await supabase.from("licenses").select("*").eq("license_key", licenseKey).single();
  if (error || !data) {
    return { ok: false, status: 403, error: "Invalid license" };
  }
  if ((data.status ?? "active") !== "active") {
    return { ok: false, status: 403, error: "License blocked" };
  }

  // ensure we have a secret for signatures
  let signatureSecret =
    (data as any).signature_secret ??
    (data as any).signatureSecret ??
    (data as any).secret ??
    licenseKey;
  if (!signatureSecret) {
    signatureSecret = licenseKey;
  }
  if (!(data as any).signature_secret) {
    try {
      await supabase.from("licenses").update({ signature_secret: signatureSecret }).eq("license_key", licenseKey);
    } catch {
      // If the column does not exist yet, continue using the fallback secret.
    }
  }

  const maxDevices = data.max_devices ?? 999999;
  const devicesRaw = Array.isArray(data.devices) ? data.devices : [];
  const devices: { id: string; name?: string; type?: string; signature?: string }[] = devicesRaw
    .map((d: any) => {
      if (typeof d === "string") return { id: d, name: d, type: "Unknown", signature: undefined };
      return {
        id: d?.id ?? d?.deviceId ?? "",
        name: d?.name ?? d?.id ?? "",
        type: d?.type ?? d?.deviceType ?? "Unknown",
        signature: d?.signature ?? d?.sig ?? d?.sign ?? undefined,
      };
    })
    .filter((d) => d.id);
  const isUnlimited = maxDevices === 9 || maxDevices >= 999999;
  const already = devices.some((d) => d.id === deviceId);
  if (!already && !isUnlimited && devices.length >= maxDevices) {
    return { ok: false, status: 403, error: "Device limit reached" };
  }

  // add new device, or refresh the stored name if it changed
  let finalDevices = devices;
  if (already) {
    const expected = await computeSignature(signatureSecret, licenseKey, deviceId);
    const stored = devices.find((d) => d.id === deviceId);
    if (!stored?.signature || stored.signature !== expected) {
      if (!deviceSignature || deviceSignature !== expected) {
        return { ok: false, status: 401, error: "Signature mismatch" };
      }
    } else if (!deviceSignature) {
      // require signature after first registration
      return { ok: false, status: 401, error: "Signature required" };
    }

    const updated = devices.map((d) =>
      d.id === deviceId
        ? {
            ...d,
            name: deviceName || d.name || d.id,
            type: deviceType || d.type || "Unknown",
            signature: stored?.signature ?? expected,
          }
        : d,
    );
    if (JSON.stringify(updated) !== JSON.stringify(devices)) {
      await supabase.from("licenses").update({ devices: updated }).eq("license_key", licenseKey);
      finalDevices = updated;
    }
  } else {
    if (!registerFlag) {
      return { ok: false, status: 403, error: "Device not registered" };
    }
    const signature = await computeSignature(signatureSecret, licenseKey, deviceId);
    const next = [...devices, { id: deviceId, name: deviceName, type: deviceType, signature }];
    await supabase.from("licenses").update({ devices: next }).eq("license_key", licenseKey);
    finalDevices = next;
  }

  return {
    ok: true,
    license: {
      license_key: licenseKey,
      max_devices: maxDevices,
      devices: finalDevices,
      signature_secret: signatureSecret,
    },
  };
}

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const licenseCheck = await assertLicense(req);
  if (!licenseCheck.ok) {
    return new Response(JSON.stringify({ ok: false, error: licenseCheck.error }), {
      status: licenseCheck.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (req.method === "POST" && url.pathname === "/sync/device-remove") {
    try {
      const { deviceId } = await req.json();
      if (!deviceId) {
        return new Response(JSON.stringify({ ok: false, error: "deviceId required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const currentDevices: any[] = Array.isArray(licenseCheck.license?.devices)
        ? licenseCheck.license?.devices ?? []
        : [];
      const filtered = currentDevices
        .map((d: any) =>
          typeof d === "string"
            ? { id: d, name: d, type: "Unknown" }
            : {
                id: d?.id ?? d?.deviceId ?? "",
                name: d?.name ?? d?.id ?? "",
                type: d?.type ?? d?.deviceType ?? "Unknown",
              },
        )
        .filter((d) => d.id && d.id !== deviceId);

      const lk =
        licenseCheck.license?.license_key ??
        (licenseCheck as any).licenseKey ??
        (licenseCheck as any).license ??
        "";
      await supabase
        .from("licenses")
        .update({ devices: filtered })
        .eq("license_key", lk);

      return new Response(JSON.stringify({ ok: true, devices: filtered }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/sync/snapshot") {
    const [config, products, categories, sales, purchases, accounts] = await Promise.all([
      supabase.from("config").select("*").single(),
      supabase.from("products").select("*"),
      supabase.from("categories").select("*"),
      supabase.from("sales").select("*"),
      supabase.from("purchases").select("*"),
      supabase.from("accounts").select("*"),
    ]);

    return new Response(
      JSON.stringify({
        config: config.data ?? null,
        products: products.data ?? [],
        categories: categories.data ?? [],
        sales: sales.data ?? [],
        purchases: purchases.data ?? [],
        accounts: accounts.data ?? [],
        license: licenseCheck.license ?? null,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  if (req.method === "POST" && url.pathname === "/sync/apply") {
    const { ops } = await req.json();
    for (const op of ops ?? []) {
      let resp;
      if (op.type === "ADD_PRODUCT" || op.type === "UPDATE_PRODUCT") {
        resp = await supabase.from("products").upsert(op.payload);
      } else if (op.type === "DELETE_PRODUCT") {
        resp = await supabase.from("products").delete().eq("id", op.payload.id);
      } else if (op.type === "ADD_CATEGORY" || op.type === "UPDATE_CATEGORY") {
        resp = await supabase.from("categories").upsert(op.payload);
      } else if (op.type === "DELETE_CATEGORY") {
        resp = await supabase.from("categories").delete().eq("id", op.payload.id);
      } else if (op.type === "SELL_ITEMS") {
        resp = await supabase.from("sales").upsert(op.payload);
      } else if (op.type === "ADD_PURCHASE") {
        resp = await supabase.from("purchases").upsert(op.payload);
      } else if (op.type === "UPDATE_CONFIG") {
        resp = await supabase.from("config").upsert(op.payload);
      } else if (op.type === "ADD_ACCOUNT" || op.type === "UPDATE_ACCOUNT") {
        resp = await supabase.from("accounts").upsert(op.payload);
      } else if (op.type === "DELETE_ACCOUNT") {
        resp = await supabase.from("accounts").delete().eq("username", op.payload.username);
      } else {
        continue;
      }
      if (resp?.error) {
        return new Response(JSON.stringify({ ok: false, error: resp.error }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
});
