// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { API_URL, API_KEY } from 'react-native-dotenv';

export const supabase = createClient(API_URL, API_KEY); // anon key
