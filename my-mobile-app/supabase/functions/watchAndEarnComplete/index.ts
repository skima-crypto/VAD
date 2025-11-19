// supabase/functions/watchAndEarnComplete/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

// Read env (Supabase Edge provides these at runtime)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// Constants
const MAX_DAILY_WATCH = 3;
const TOTAL_REWARD_PER_DAY = 1; // 1 coin per day for completing all 3 ads

// Helper: get today's date in YYYY-MM-DD
function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

// Reset daily watch counter if needed
async function resetDailyWatchIfNeeded(profile: any, user_id: string) {
  const today = todayISODate();
  const lastReset = profile?.last_watch_reset ? String(profile.last_watch_reset).slice(0, 10) : null;
  if (lastReset !== today) {
    await admin
      .from("profiles")
      .update({ daily_watched_ads: 0, last_watch_reset: today })
      .eq("id", user_id);
    profile.daily_watched_ads = 0;
  }
}

// Core: watch and earn
async function watchAndEarn(user_id: string) {
  if (!user_id) throw new Error("user_id required");

  // Fetch profile
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user_id)
    .single();

  if (!profile) throw new Error("profile not found");

  // Reset daily counter if needed
  await resetDailyWatchIfNeeded(profile, user_id);

  // Check daily limit
  if ((profile.daily_watched_ads || 0) >= MAX_DAILY_WATCH) {
    return { error: "daily watch limit reached", status: 403 };
  }

  // Increment daily watched ads
  const newCount = (profile.daily_watched_ads || 0) + 1;
  const rewardPerAd = TOTAL_REWARD_PER_DAY / MAX_DAILY_WATCH; // e.g., 1/3 coin per ad

  // Update profile balance and counter
  await admin
    .from("profiles")
    .update({
      wallet_balance: (Number(profile.wallet_balance) || 0) + rewardPerAd,
      daily_watched_ads: newCount,
      last_watch_reset: todayISODate(),
    })
    .eq("id", user_id);

  // Log action
  await admin.from("user_watch_ads").insert({
    user_id,
    ad_type: "rewarded",
    ad_watched: true,
    watched_at: new Date().toISOString(),
  });

  return { daily_watched_ads: newCount, reward: rewardPerAd, status: 200 };
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

    const result = await watchAndEarn(user_id);

    return new Response(JSON.stringify(result), { status: result?.status === 403 ? 403 : 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
});
