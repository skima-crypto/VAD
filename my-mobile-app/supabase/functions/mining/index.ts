// supabase/functions/mining/index.ts
// Deno + Supabase Edge Function
// Drop this file into supabase/functions/mining/index.ts (overwrite existing).

// Use a stable std import so VSCode & the Supabase runtime are happy
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

// Read env from Deno (Supabase Edge provides these at runtime)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

// Admin client (server / service role)
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// How long is one mining session (hours)
const SESSION_DURATION_HOURS = 8;

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function todayISODate() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function resetDailyBoostsIfNeeded(profile: any, user_id: string) {
  const today = todayISODate();
  const lastReset = profile?.last_boost_reset ? String(profile.last_boost_reset).slice(0, 10) : null;
  if (lastReset !== today) {
    await admin
      .from("profiles")
      .update({ boosts_used_today: 0, last_boost_reset: today })
      .eq("id", user_id);
    profile.boosts_used_today = 0;
  }
}

// -------------------------------------------------------------
// Core endpoints (startSession, getStatus, applyAdBoost)
// -------------------------------------------------------------
async function startSession(user_id: string) {
  if (!user_id) throw new Error("user_id required");

  // 1) If active session exists, return it
  const { data: existing } = await admin
    .from("mining_sessions")
    .select("*")
    .eq("user_id", user_id)
    .eq("active", true);

  if (existing && existing.length > 0) {
    return { session: existing[0], already_active: true };
  }

  // 2) Load settings
  const { data: settings } = await admin
    .from("mining_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (!settings) throw new Error("mining settings not configured");

  // 3) Compute remaining hours & supply
  const now = new Date();
  const endAt = new Date(settings.end_at);
  const remainingMs = Math.max(0, endAt.getTime() - now.getTime());
  const remainingHours = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));

  const remainingSupply = Number(settings.total_supply) - Number(settings.supply_distributed);

  // 4) Count active users (sessions.active = true)
  const { count: activeCountRaw } = await admin
    .from("mining_sessions")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  const activeUsers = Number(activeCountRaw || 1);

  // 5) Compute rates
  const global_hourly_budget = remainingSupply / remainingHours;
  const candidate_rate = global_hourly_budget / Math.max(1, activeUsers);
  const min_floor = Number(settings.min_rate_per_user || 0.05);
  const base_rate_per_user = Math.max(min_floor, candidate_rate);

  // 6) Insert session
  const started_at = new Date().toISOString();
  const ends_at = new Date(Date.now() + SESSION_DURATION_HOURS * 3600 * 1000).toISOString();

  const { data: insertData, error: insertErr } = await admin
    .from("mining_sessions")
    .insert({
      user_id,
      started_at,
      ends_at,
      base_rate: base_rate_per_user,
      multiplier: 1,
      active: true,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  return { session: insertData, base_rate_per_user };
}

async function getStatus(user_id: string) {
  if (!user_id) throw new Error("user_id required");

  const { data: session } = await admin
    .from("mining_sessions")
    .select("*")
    .eq("user_id", user_id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: profile } = await admin.from("profiles").select("*").eq("id", user_id).single();

  return { session: session?.[0] ?? null, profile };
}

async function applyAdBoost(body: any) {
  const user_id = body?.user_id;
  const boost_hours = body?.boost_hours ?? 1;
  const multiplier = body?.multiplier ?? 1.1;
  const ad_type = body?.ad_type ?? "rewarded";

  if (!user_id) throw new Error("user_id required");

  const { data: profile } = await admin.from("profiles").select("*").eq("id", user_id).single();
  if (!profile) throw new Error("profile not found");

  // Reset daily counters if needed
  await resetDailyBoostsIfNeeded(profile, user_id);

  // Enforce 3 boosts/day
  if ((profile.boosts_used_today || 0) >= 3) {
    return { error: "boosts daily limit reached", status: 403 };
  }

  // Compute new expiry
  const now = new Date();
  const current_exp = profile.boost_expires_at ? new Date(profile.boost_expires_at) : now;
  const baseStart = new Date(Math.max(now.getTime(), current_exp.getTime()));
  const newExpiry = new Date(baseStart.getTime() + boost_hours * 3600 * 1000);

  // Update profile: boost_expires_at + increments
  await admin
    .from("profiles")
    .update({
      boost_expires_at: newExpiry.toISOString(),
      boosts_used_today: (profile.boosts_used_today || 0) + 1,
      last_boost_reset: todayISODate(),
    })
    .eq("id", user_id);

  // Log action
  await admin.from("mining_actions").insert({
    user_id,
    action_type: "ad_boost",
    ad_type,
    ad_watched: true,
    weight: 0,
    reward: 0,
  });

  return { boost_expires_at: newExpiry.toISOString(), status: 200 };
}

// -------------------------------------------------------------
// HTTP router
// -------------------------------------------------------------
serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/+/, ""); // e.g., startSession

    if (req.method === "POST" && path === "startSession") {
      const body = await req.json();
      const user_id = body?.user_id;
      const result = await startSession(user_id);
      return new Response(JSON.stringify(result), { status: 200 });
    }

    if (req.method === "GET" && path === "getStatus") {
      const user_id = url.searchParams.get("user_id");
      const result = await getStatus(user_id!);
      return new Response(JSON.stringify(result), { status: 200 });
    }

    if (req.method === "POST" && path === "applyAdBoost") {
      const body = await req.json();
      const result = await applyAdBoost(body);
      return new Response(JSON.stringify(result), { status: result?.status === 403 ? 403 : 200 });
    }

    return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  } catch (err: any) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
});
 
"use effect >d>
"