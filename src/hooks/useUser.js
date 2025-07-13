import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Create a separate Supabase client instance to avoid circular imports
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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