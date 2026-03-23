import { createContext } from 'preact';
import { useState, useEffect, useContext, useCallback } from 'preact/hooks';
import { supabase } from './supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still checking; null = logged out; object = logged in
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Bootstrap: read existing session from storage
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Fetch profile only when the logged-in user actually changes (not on token refresh)
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => {
        if (r.status === 404) return null;  // not registered yet
        if (!r.ok) throw new Error('profile fetch failed');
        return r.json();
      })
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      profileLoading,
      token: session?.access_token ?? null,
      signOut,
      setProfile,  // lets OnboardingPage set profile after registration
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
