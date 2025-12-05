import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { db } from '../db'; // <--- Local DB Import kiya

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [stockCount, setStockCount] = useState(0);
  const [isStockLoading, setIsStockLoading] = useState(true);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isLowStockLoading, setIsLowStockLoading] = useState(true);

  // 1. Profile Fetching (Offline-First)
  const getProfile = useCallback(async (currentUser) => {
    if (!currentUser) return null;
    
    try {
      // Step A: Pehle Local DB se profile uthayein (Foran dikhane ke liye)
      const localProfile = await db.user_settings.get(currentUser.id);
      if (localProfile) {
        setProfile(localProfile);
      }

      // Step B: Agar Internet hai, to Supabase se taza profile layein aur Local DB update karein
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setProfile(data);
          // Local DB mein save karein (ID ko key banayenge)
          await db.user_settings.put({ ...data, id: currentUser.id });
        }
        return data;
      }
      
      return localProfile;

    } catch (error) {
      console.error('Error fetching profile:', error);
      // Agar error aaye to purana profile hi rehne dein
    }
  }, []);

  // 2. Stock Count (Offline Calculation)
  const fetchStockCount = useCallback(async () => {
    setIsStockLoading(true);
    
    // Agar Internet hai to RPC use karein
    if (navigator.onLine) {
        const { data, error } = await supabase.rpc('get_current_user_stock_count');
        if (!error) {
            setStockCount(data);
            setIsStockLoading(false);
            return;
        }
    }

    // Agar Offline hain ya RPC fail ho gaya, to Local DB se khud ginein
    try {
        const products = await db.products.toArray();
        // Saare products ki quantity jama karein
        const totalStock = products.reduce((sum, item) => sum + (item.quantity || 0), 0);
        setStockCount(totalStock);
    } catch (err) {
        console.error("Local stock calc error:", err);
        setStockCount(0);
    } finally {
        setIsStockLoading(false);
    }
  }, []);

  // 3. Low Stock Count (Offline Calculation)
  const fetchLowStockCount = useCallback(async () => {
    if (!profile || !profile.low_stock_alerts_enabled) {
        setLowStockCount(0);
        setIsLowStockLoading(false);
        return;
    }

    setIsLowStockLoading(true);

    // Agar Internet hai to RPC use karein
    if (navigator.onLine) {
        const { data, error } = await supabase.rpc('get_low_stock_product_count');
        if (!error) {
            setLowStockCount(data);
            setIsLowStockLoading(false);
            return;
        }
    }

    // Agar Offline hain, to Local DB se filter karein
    try {
        const products = await db.products.toArray();
        const threshold = profile.low_stock_threshold || 0;
        // Wo products ginein jinki quantity threshold se kam hai
        const lowStock = products.filter(p => (p.quantity || 0) <= threshold).length;
        setLowStockCount(lowStock);
    } catch (err) {
        console.error("Local low stock calc error:", err);
        setLowStockCount(0);
    } finally {
        setIsLowStockLoading(false);
    }
  }, [profile]);

  const updateProfile = async (updates) => {
    if (!user) throw new Error("No user is logged in");

    // --- NAYA CODE: Internet Check ---
    // Agar internet nahi hai, to yehi se wapis bhej dein
    if (!navigator.onLine) {
        return { 
            success: false, 
            error: { message: "Internet connection is required to save profile changes." } 
        };
    }

    try {
      // Update Supabase
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update State & Local DB
      setProfile(data);
      await db.user_settings.put({ ...data, id: user.id });
      
      return { success: true, data };

    } catch (error) {
      console.error('Error updating profile:', error.message);
      return { success: false, error };
    } 
  };

  useEffect(() => {
    const getOfflineBackup = () => {
      try {
        const backup = localStorage.getItem('app_offline_user_backup');
        return backup ? JSON.parse(backup) : null;
      } catch (e) {
        return null;
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(session);
        setUser(session?.user ?? null);
        setIsPasswordRecovery(true);
        setLoading(false);
        return;
      }

      if (!session && !navigator.onLine) {
        console.log("Offline mode: Restoring user from backup...");
        const offlineUser = getOfflineBackup();
        if (offlineUser) {
          // Hum ek "Naqli" (Fake) session bana rahe hain taake App khul jaye
          session = { user: offlineUser, access_token: 'offline_mode' };
        }
      }

      // Agar Session Valid hai (Online), to future ke liye Backup save karein
      if (session?.user) {
        localStorage.setItem('app_offline_user_backup', JSON.stringify(session.user));
      }

      setIsPasswordRecovery(false);
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
      // Pehle Local Storage se session check karein
      let { data: { session } } = await supabase.auth.getSession();
      if (!session && !navigator.onLine) {
        console.log("Startup Offline: Restoring user...");
        const offlineUser = getOfflineBackup();
        if (offlineUser) {
          session = { user: offlineUser, access_token: 'offline_mode' };
        }
      }
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
  }, [getProfile, fetchStockCount]);

  useEffect(() => {
    if (profile) {
      fetchLowStockCount();
    }
  }, [profile, fetchLowStockCount]);

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
    lowStockCount,
    isLowStockLoading,
    refetchLowStockCount: fetchLowStockCount,
    isPasswordRecovery,
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