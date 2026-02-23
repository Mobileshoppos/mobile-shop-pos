import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { db } from '../db'; 
import { checkSupabaseConnection } from '../utils/connectionCheck';

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
  const isOfflineModeRef = useRef(false);

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
  // 2. Stock Count (Offline-First: Pehle Local, Phir Server)
  const fetchStockCount = useCallback(async () => {
    setIsStockLoading(true);
    try {
        // Step A: Pehle Local DB se foran ginein (No Waiting)
        const allInventory = await db.inventory.where('status').anyOf('Available', 'available').toArray();
        const totalStock = allInventory.reduce((sum, item) => sum + (Number(item.available_qty) || 0), 0);
        setStockCount(totalStock);
        setIsStockLoading(false); // Foran loading khatam karein

        // Step B: Agar Internet hai, to background mein server se taza count lein
        if (navigator.onLine) {
            supabase.rpc('get_current_user_stock_count').then(({ data, error }) => {
                if (!error && data !== null) {
                    setStockCount(data);
                }
            });
        }
    } catch (err) {
        console.error("Stock calculation error:", err);
    } finally {
        setIsStockLoading(false);
    }
  }, []);

  // 3. Low Stock Count (Offline-First: Pehle Local, Phir Server)
  const fetchLowStockCount = useCallback(async () => {
    if (!profile || !profile.low_stock_alerts_enabled) {
        setLowStockCount(0);
        setIsLowStockLoading(false);
        return;
    }

    setIsLowStockLoading(true);
    try {
        // Step A: Pehle Local DB se foran filter karein
        const products = await db.products.toArray();
        const threshold = profile.low_stock_threshold || 0;
        const lowStock = products.filter(p => (p.quantity || 0) <= threshold).length;
        setLowStockCount(lowStock);
        setIsLowStockLoading(false);

        // Step B: Agar Internet hai, to background mein server se taza count lein
        if (navigator.onLine) {
            supabase.rpc('get_low_stock_product_count').then(({ data, error }) => {
                if (!error && data !== null) {
                    setLowStockCount(data);
                }
            });
        }
    } catch (err) {
        console.error("Low stock calculation error:", err);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(session);
        setUser(session?.user ?? null);
        setIsPasswordRecovery(true);
        setLoading(false);
        return;
      }

      // --- IMPROVED OFFLINE SESSION LOCK ---
      // Agar Supabase kahe ke session khatam ho gaya (null), lekin internet nahi hai ya hum pehle se offline hain
      if (!session) {
        const isActuallyConnected = await checkSupabaseConnection();
        if (!isActuallyConnected) {
          const offlineUser = getOfflineBackup();
          if (offlineUser) {
            console.log("Internet issue or token expired. Locking session in Offline Mode.");
            isOfflineModeRef.current = true;
            // Purana session barkaraar rakhein
            setLoading(false);
            return; 
          }
        }
      }

      // Agar session mil jaye to backup update karein
      if (session?.user) {
        localStorage.setItem('app_offline_user_backup', JSON.stringify(session.user));
        isOfflineModeRef.current = false;
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
      // Step A: Pehle foran backup se user load karein (Zero Waiting)
      const offlineUser = getOfflineBackup();
      if (offlineUser) {
        setUser(offlineUser);
        setSession({ user: offlineUser, access_token: 'offline_mode' });
        await getProfile(offlineUser);
        fetchStockCount();
        setLoading(false); // App khul gayi!
      }

      // Step B: Background mein Supabase se asli session check karein
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          isOfflineModeRef.current = false;
          await getProfile(currentSession.user);
        }
      } catch (e) {
        console.log("Background auth check failed, staying in offline mode.");
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();

    // --- NAYA CODE: Live Update Listener ---
    // Jab bhi database mein stock badle, yeh ginti refresh karega
    const handleLocalUpdate = () => fetchStockCount();
    window.addEventListener('local-db-updated', handleLocalUpdate);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('local-db-updated', handleLocalUpdate);
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