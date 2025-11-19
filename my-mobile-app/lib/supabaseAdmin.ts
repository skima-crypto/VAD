// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';
import { API_URL, API_KEY } from 'react-native-dotenv';

export const supabaseAdmin = createClient(API_URL, API_KEY); // service role key
