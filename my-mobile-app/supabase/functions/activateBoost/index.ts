import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const BOOST_HOURS_DEFAULT = 1;

// Helper: today YYYY-MM-DD
function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

// Reset daily boosts if needed
async function resetDailyBoostsIfNeeded(profile: any, user_id: string) {
  const today = todayISODate();
  const lastReset = profile?.last_boost_reset
    ? String(profile.last_boost_reset).slice(0, 10)
    : null;

  if (lastReset !== today) {
    await admin
      .from("profiles")
      .update({ boosts_used_today: 0, last_boost_reset: today })
      .eq("id", user_id);

    profile.boosts_used_today = 0;
  }
}

// MAIN: activate boost
async function activateBoost(
  user_id: string,
  boost_hours: number = BOOST_HOURS_DEFAULT,
  multiplier: number = 1.1
) {
  if (!user_id) throw new Error("user_id required");

  // Fetch profile
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user_id)
    .single();

  if (!profile) throw new Error("profile not found");

  // Reset daily boosts if needed
  await resetDailyBoostsIfNeeded(profile, user_id);

  // Enforce 3 boosts/day
  if ((profile.boosts_used_today || 0) >= 3) {
    return { error: "boosts daily limit reached", status: 403 };
  }

  // Compute boost expiry
  const now = new Date();
  const current_exp = profile.boost_expires_at
    ? new Date(profile.boost_expires_at)
    : now;

  const baseStart = new Date(Math.max(now.getTime(), current_exp.getTime()));
  const newExpiry = new Date(
    baseStart.getTime() + boost_hours * 3600 * 1000
  );

  // Compute new multiplier
  const previousMultiplier = Number(profile.multiplier) || 1;
  const newMultiplier = previousMultiplier * multiplier;

  // Update profile (expiry + multiplier)
  await admin
    .from("profiles")
    .update({
      boost_expires_at: newExpiry.toISOString(),
      multiplier: newMultiplier,
      boosts_used_today: (profile.boosts_used_today || 0) + 1,
      last_boost_reset: todayISODate(),
    })
    .eq("id", user_id);

  // Log action
  await admin.from("mining_actions").insert({
    user_id,
    action_type: "activate_boost",
    ad_type: "rewarded",
    multiplier_applied: multiplier,
    new_multiplier: newMultiplier,
    ad_watched: true,  // Log that the ad was watched for the boost
    weight: 0,
    reward: 0,
  });

  return {
    boost_expires_at: newExpiry.toISOString(),
    multiplier: newMultiplier,
    status: 200,
  };
}

// -----------------------------
// HTTP handler
// -----------------------------
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405 }
      );
    }

    const body = await req.json();
    const user_id = body?.user_id;
    const boost_hours = body?.boost_hours ?? BOOST_HOURS_DEFAULT;
    const multiplier = body?.multiplier ?? 1.1;

    // Placeholder to simulate Ad watching (replace with actual AdMob logic later)
    const adWatched = body?.ad_watched;

    if (!adWatched) {
      return new Response(
        JSON.stringify({ error: "User must watch an ad before boosting" }),
        { status: 400 }
      );
    }

    const result = await activateBoost(user_id, boost_hours, multiplier);

    return new Response(JSON.stringify(result), {
      status: result?.status === 403 ? 403 : 200,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500 }
    );
  }
});
