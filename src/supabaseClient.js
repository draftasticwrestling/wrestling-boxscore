import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Environment check:');
console.log('VITE_SUPABASE_URL exists:', !!supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
console.log('Current URL:', window.location.href);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test the connection
supabase.from('events').select('count').then(
  ({ data, error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection test successful');
    }
  }
); 

export async function uploadWrestlerImage(file, wrestlerId) {
  const fileExt = file.name.split('.').pop();
  const filePath = `${wrestlerId}/${Date.now()}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('wrestler-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: publicUrlData } = supabase
    .storage
    .from('wrestler-images')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
} 

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/(^-|-$)+/g, '');   // Remove leading/trailing hyphens
} 

export function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    // Get current user on mount
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    return () => authListener?.subscription.unsubscribe();
  }, []);

  return user;
} 