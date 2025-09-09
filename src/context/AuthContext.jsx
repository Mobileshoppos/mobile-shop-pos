// src/context/AuthContext.jsx - MODIFIED

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // NAYA IZAFA: Profile data ko store karne ke liye state
  const [profile, setProfile] = useState(null);

  // NAYA IZAFA: Profile data fetch karne ka function
  const getProfile = useCallback(async (user) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('shop_name, full_name') // Hum sirf zaroori data mangwayenge
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // NAYA IZAFA: Jab user login ho to uska profile fetch karein
      if (session?.user) {
        getProfile(session.user);
      } else {
        setProfile(null); // Agar user logout ho to profile clear karein
      }
      
      setLoading(false);
    });

    // Initial session check
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
    // NAYA IZAFA: Profile aur usay refetch karne ka function context mein shamil karein
    profile,
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