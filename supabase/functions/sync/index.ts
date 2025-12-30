import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-license-key,x-device-id",
};

const supabaseUrl = Deno.env.get("PROJECT_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function assertLicense(req: Request) {
  const licenseKey = req.headers.get("x-license-key")?.trim();
  const deviceId = req.headers.get("x-device-id")?.trim();
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

  const maxDevices = data.max_devices ?? 999999;
  const devices: string[] = Array.isArray(data.devices) ? data.devices : [];
  const isUnlimited = maxDevices === 9 || maxDevices >= 999999;
  const already = devices.includes(deviceId);
  if (!already && !isUnlimited && devices.length >= maxDevices) {
    return { ok: false, status: 403, error: "Device limit reached" };
  }

  if (!already) {
    const next = [...devices, deviceId];
    await supabase.from("licenses").update({ devices: next }).eq("license_key", licenseKey);
  }

  return { ok: true, license: { license_key: licenseKey, max_devices: maxDevices, devices } };
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
