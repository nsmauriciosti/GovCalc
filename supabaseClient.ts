import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. Database operations may fail.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
