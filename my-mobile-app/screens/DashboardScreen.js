import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { startSession, activateBoost, watchAndEarnComplete } from "../lib/miningApi";
import { supabase } from "../lib/supabase";
import { AdMobInterstitial } from 'expo-ads-admob';  // Import AdMob for ads

export default function DashboardScreen() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState("");
  const [boostsUsed, setBoostsUsed] = useState(0);  // Track boosts used today
  const [watchCount, setWatchCount] = useState(0);  // Track watch ads count today

  // Get current user and refresh status
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData?.user ?? null);
      if (userData?.user) {
        await refreshStatus(userData.user.id);
      }
    })();
  }, []);

  const refreshStatus = useCallback(async (userId) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.SUPABASE_MINING_FUNCTION_URL}/getStatus?user_id=${userId}`);
      const data = await res.json();
      setSession(data.session || null);
      setProfile(data.profile || null);
      setBoostsUsed(data.profile?.boosts_used_today || 0);
      setWatchCount(data.profile?.daily_watched_ads || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Countdown timer for active mining session
  useEffect(() => {
    let interval;
    if (session) {
      interval = setInterval(() => {
        const now = new Date();
        const end = new Date(session.ends_at);
        const diff = end.getTime() - now.getTime();
        if (diff <= 0) {
          setTimer("Session ended");
          if (user) refreshStatus(user.id);
          clearInterval(interval);
          return;
        }
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimer(`${hrs}h ${mins}m ${secs}s`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session]);

  // Show Ad before starting mining session
  const showAdBeforeStartMining = async () => {
    try {
      await AdMobInterstitial.setAdUnitID("ca-app-pub-3940256099942544/6300978111");  // Test Ad Unit ID
      await AdMobInterstitial.requestAdAsync();
      await AdMobInterstitial.showAdAsync();
      // After ad completes, start the mining session
      await handleStart();
    } catch (error) {
      console.error("Ad error: ", error);
      // Proceed without ad if fails
      await handleStart();
    }
  };

  // Start mining session
  const handleStart = async () => {
    if (!user) return Alert.alert("Not signed in");
    setLoading(true);
    try {
      const res = await startSession(user.id);
      if (res?.session) setSession(res.session);
      if (res?.already_active) Alert.alert("Mining session already active");
    } catch (err) {
      Alert.alert("Error starting session");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Show Ad before boost activation
  const showAdBeforeBoost = async () => {
    try {
      await AdMobInterstitial.setAdUnitID("ca-app-pub-3940256099942544/6300978111");  // Test Ad Unit ID
      await AdMobInterstitial.requestAdAsync();
      await AdMobInterstitial.showAdAsync();
      // After ad completes, activate the boost
      await handleBoost();
    } catch (error) {
      console.error("Ad error: ", error);
      // Proceed with boost activation if ad fails
      await handleBoost();
    }
  };

  // Boost activation handler
  const handleBoost = async () => {
    if (!user) return Alert.alert("Not signed in");
    setLoading(true);
    try {
      const res = await activateBoost(user.id, 1, 1.1);
      if (res?.error) {
        Alert.alert(res.error);
      } else {
        Alert.alert("Boost applied until " + res.boost_expires_at);
        await refreshStatus(user.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Show Ad before earning reward
  const showAdBeforeEarn = async () => {
    try {
      await AdMobInterstitial.setAdUnitID("ca-app-pub-3940256099942544/6300978111");  // Test Ad Unit ID
      await AdMobInterstitial.requestAdAsync();
      await AdMobInterstitial.showAdAsync();
      // After ad completes, grant the reward
      await handleWatchAndEarn();
    } catch (error) {
      console.error("Ad error: ", error);
      await handleWatchAndEarn();  // Proceed with reward even if ad fails
    }
  };

  // Watch & Earn handler function
  const handleWatchAndEarn = async () => {
    if (!user) return Alert.alert("Not signed in");
    setLoading(true);
    try {
      const res = await watchAndEarnComplete(user.id); // API call to complete watch & earn
      if (res?.error) {
        Alert.alert(res.error);
      } else {
        Alert.alert("Reward granted! Total earned: " + res.reward);
        await refreshStatus(user.id);  // Refresh the status after reward is granted
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const miningRatePerHour = session ? session.base_rate * session.multiplier : 0;
  const currentBalance = profile ? profile.wallet_balance : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>VAD Mining</Text>

      <View style={styles.topRow}>
        <Text>Balance: {Number(currentBalance).toFixed(2)}</Text>
        <Text>Rate/hr: {miningRatePerHour}</Text>
      </View>

      <View style={styles.orb}>
        <Text style={styles.orbText}>{session ? "Mining..." : "Idle"}</Text>
        <Text style={{ marginTop: 8 }}>{session ? timer : "Start a session to begin mining"}</Text>
      </View>

      {!session ? (
        <TouchableOpacity style={styles.startBtn} onPress={showAdBeforeStartMining} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Start Mining</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.stopBtn} disabled>
          <Text style={styles.btnText}>Session Active</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.boostBtn}
        onPress={showAdBeforeBoost}
        disabled={loading || boostsUsed >= 3}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Boost Earnings ({boostsUsed}/3)</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.watchBtn}
        onPress={showAdBeforeEarn}
        disabled={loading || watchCount >= 3}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Watch & Earn ({watchCount}/3)</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", padding: 20 },
  header: { fontSize: 22, fontWeight: "700", marginTop: 20 },
  topRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 12 },
  orb: { height: 220, width: 220, borderRadius: 110, backgroundColor: "#0b1226", alignItems: "center", justifyContent: "center", marginTop: 30 },
  orbText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  startBtn: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 30, backgroundColor: "#0066ff", borderRadius: 12 },
  stopBtn: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 30, backgroundColor: "#888", borderRadius: 12 },
  boostBtn: { marginTop: 18, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: "#33a", borderRadius: 10 },
  watchBtn: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: "#0a0", borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "700" }
});

