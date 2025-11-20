// supabase/functions/startMine/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

// Env
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const SESSION_DURATION_HOURS = 8;

// Helper: YYYY-MM-DD
function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

async function startMine(user_id: string, adWatched: boolean) {
  if (!user_id) throw new Error("user_id required");
  if (!adWatched) throw new Error("Must watch rewarded ad to start mining");

  // 1️⃣ Check active session
  const { data: existing } = await admin
    .from("mining_sessions")
    .select("*")
    .eq("user_id", user_id)
    .eq("active", true);

  if (existing && existing.length > 0) {
    return { session: existing[0], already_active: true };
  }

  // 2️⃣ Load mining settings
  const { data: settings } = await admin
    .from("mining_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (!settings) throw new Error("Mining settings not configured");

  const now = new Date();
  const endAt = new Date(settings.end_at);
  const remainingHours = Math.max(
    1,
    Math.ceil((endAt.getTime() - now.getTime()) / (1000 * 3600))
  );
  const remainingSupply = Number(settings.total_supply) - Number(settings.supply_distributed);

  // 3️⃣ Count active users
  const { count: activeCountRaw } = await admin
    .from("mining_sessions")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  const activeUsers = Number(activeCountRaw || 1);

  // 4️⃣ Compute rate per user
  const global_hourly_budget = remainingSupply / remainingHours;
  const candidate_rate = global_hourly_budget / Math.max(1, activeUsers);
  const min_floor = Number(settings.min_rate_per_user || 0.05);
  const base_rate_per_user = Math.max(min_floor, candidate_rate);

  // 5️⃣ Insert new mining session
  const started_at = new Date().toISOString();
  const ends_at = new Date(Date.now() + SESSION_DURATION_HOURS * 3600 * 1000).toISOString();

  const { data: insertData, error } = await admin
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

  if (error) throw error;

  return { session: insertData, base_rate_per_user };
}

// -----------------------------
// HTTP handler
// -----------------------------
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const body = await req.json();
    const user_id = body?.user_id;
    const adWatched = body?.adWatched ?? false; // ✅ client must send this flag

    const result = await startMine(user_id, adWatched);

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
});
