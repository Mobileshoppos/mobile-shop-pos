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
        // --- OFFLINE-FIRST CONSISTENCY FIX ---
        // Inventory se Available items ginein (Wahi logic jo DataService use karta hai)
        const allInventory = await db.inventory.where('status').anyOf('Available', 'available').toArray();
        const totalStock = allInventory.reduce((sum, item) => sum + (Number(item.available_qty) || 0), 0);
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

      // NAYA LOGIC: Agar hum pehle se offline mode mein ja chuke hain, to Supabase ke expire hone wale event ko ignore karein
      if (!session && isOfflineModeRef.current) {
        console.log("Ignoring Supabase session clear because we are in Offline Mode.");
        return; // Yahin se wapis mur jayein, user ko bahar na nikalen
      }

      if (!session && !navigator.onLine) {
        console.log("Offline mode: Restoring user from backup...");
        const offlineUser = getOfflineBackup();
        if (offlineUser) {
          // Hum ek "Naqli" (Fake) session bana rahe hain taake App khul jaye
          session = { user: offlineUser, access_token: 'offline_mode' };
          isOfflineModeRef.current = true; // Mark kar dein ke hum offline hain
        }
      }

      // Agar Session Valid hai (Online) aur yeh offline mode ka fake session nahi hai, to backup save karein
      if (session?.user && session.access_token !== 'offline_mode') {
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
      // --- TABDEELI YAHAN HAI ---
      
      // Step 1: Sab se pehle check karein ke kya hum Offline hain?
      // Hum 'Ping' kar ke tasdeeq karenge ke waqayi internet chal raha hai
      const isConnected = await checkSupabaseConnection();
      
      if (!isConnected) {
        const offlineUser = getOfflineBackup();
        if (offlineUser) {
          console.log("Startup Offline: Immediate Restore...");
          // Agar offline hain aur backup hai, to foran set karein aur YAHIN RUK JAYEIN
          // Supabase ko call karne ki zaroorat nahi hai.
          isOfflineModeRef.current = true; // NAYA: Mark kar dein ke hum offline hain
          setSession({ user: offlineUser, access_token: 'offline_mode' });
          setUser(offlineUser);
          
          // Profile bhi local DB se utha lein
          await getProfile(offlineUser);
          fetchStockCount();
          
          setLoading(false);
          return; // <--- Yeh return zaroori hai taake code neeche na jaye
        }
      }

      // Step 2: Agar hum yahan pohnche, iska matlab ya to Online hain ya Backup nahi mila
      // Ab hum Supabase ko call karenge (jo 1 minute le sakta hai agar internet slow ho)
      let { data: { session } } = await supabase.auth.getSession();
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await getProfile(session.user);
        fetchStockCount();
      }
      setLoading(false);
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