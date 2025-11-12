import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);const [stockCount, setStockCount] = useState(0);
  const [isStockLoading, setIsStockLoading] = useState(true);

  const getProfile = useCallback(async (user) => {
  if (!user) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*') // <--- Yahan tabdeeli ki gayi hai
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

  const fetchStockCount = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_current_user_stock_count');
    if (error) {
        console.error('Error fetching stock count:', error.message);
        setStockCount(0);
    } else {
        setStockCount(data);
    }
    setIsStockLoading(false);
}, []);

  const updateProfile = async (updates) => {
    if (!user) throw new Error("No user is logged in");

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setProfile(data);
      return { success: true, data };

    } catch (error) {
      console.error('Error updating profile:', error.message);
      return { success: false, error };
    } 
};

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        getProfile(session.user);
        fetchStockCount();
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
        fetchStockCount();
      }
      setLoading(false);
    };
    
    checkSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, [getProfile]);

  const isPro = profile?.subscription_tier === 'pro';
  const value = {
    session,
    user,
    profile,
    updateProfile,
    refetchProfile: () => getProfile(user), 
    isPro,
    stockCount,
    isStockLoading,
    refetchStockCount: fetchStockCount,
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