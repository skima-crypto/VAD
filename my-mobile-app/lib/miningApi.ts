import { supabase } from "./supabase";

const FUNCTION_URL = process.env.SUPABASE_MINING_FUNCTION_URL || "";

// 1️⃣ Start mining session
export async function startSession(userId: string) {
  const res = await fetch(`${FUNCTION_URL}/startMine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return res.json();
}

// 2️⃣ Activate boost
export async function activateBoost(userId: string, boostHours = 1, multiplier = 1.1) {
  const res = await fetch(`${FUNCTION_URL}/activateBoost`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, boost_hours: boostHours, multiplier }),
  });
  return res.json();
}

// 3️⃣ Watch and earn complete
export async function watchAndEarnComplete(userId: string) {
  const res = await fetch(`${FUNCTION_URL}/watchAndEarnComplete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return res.json();
}
