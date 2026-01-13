import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('events').select('count');
    if (error) {
      throw error;
    }
    console.log('✓ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('✗ Supabase connection failed:', error.message);
    return false;
  }
}


