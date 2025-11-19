// screens/Login.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Email/Password Login
  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Enter email and password');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) navigation.replace('Dashboard', { user: data.user });
    } catch (err) {
      Alert.alert('Login Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Email/Password Sign Up
  const handleSignUp = async () => {
    if (!email || !password) return Alert.alert('Enter email and password');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      Alert.alert('Success', 'Account created! Please check your email for confirmation.');
    } catch (err) {
      Alert.alert('Sign Up Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Google OAuth Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'yourapp://dashboard' } // use your deep link / app scheme
      });
      if (error) throw error;
      // User is redirected to Google; handle on redirect in App.js
    } catch (err) {
      Alert.alert('Google Login Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to VAD Mining</Text>

      {/* Email / Password Inputs */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* Buttons */}
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.btnText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        <Text style={styles.btnText}>Sign Up</Text>
      </TouchableOpacity>

      <Text style={styles.orText}>OR</Text>

      <TouchableOpacity style={[styles.button, styles.googleBtn]} onPress={handleGoogleLogin} disabled={loading}>
        <Text style={styles.btnText}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { height: 50, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 16 },
  button: { backgroundColor: '#0066ff', paddingVertical: 14, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  googleBtn: { backgroundColor: '#DB4437' },
  btnText: { color: '#fff', fontWeight: '700' },
  orText: { textAlign: 'center', marginVertical: 12, fontWeight: '600' },
});
