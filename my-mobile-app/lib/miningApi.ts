// lib/miningApi.ts
import { supabase } from "./supabase";

const FUNCTION_URL = process.env.SUPABASE_MINING_FUNCTION_URL || ""; // or call via supabase.functions.invoke()

export async function startSession(userId: string) {
  // If using supabase edge functions:
  try {
    const res = await fetch(`${FUNCTION_URL}/startSession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function getStatus(userId: string) {
  const res = await fetch(`${FUNCTION_URL}/getStatus?user_id=${userId}`);
  return res.json();
}

export async function applyAdBoost(userId: string, boostHours = 1, multiplier = 1.1) {
  const res = await fetch(`${FUNCTION_URL}/applyAdBoost`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, boost_hours: boostHours, multiplier }),
  });
  return res.json();
}
