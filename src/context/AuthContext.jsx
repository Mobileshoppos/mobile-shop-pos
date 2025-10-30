import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const getProfile = useCallback(async (user) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('shop_name, full_name, currency') // Yahan 'currency' shamil kiya hai
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  }, []);

  const updateProfile = async (updates) => {
    if (!user) throw new Error("No user is logged in");

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select() // select() zaroori hai taake updated data wapas miley
        .single();
      
      if (error) throw error;
      
      setProfile(data); // Profile state ko naye data se update karein
      return { success: true, data };

    } catch (error) {
      console.error('Error updating profile:', error.message);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        getProfile(session.user);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await getProfile(session.user);
      }
      setLoading(false);
    };
    
    checkSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, [getProfile]);

  const value = {
    session,
    user,
    profile,
    updateProfile, // Naya function yahan shamil karein
    refetchProfile: () => getProfile(user), 
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};