import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

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