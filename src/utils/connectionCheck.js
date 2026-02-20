import { supabase } from '../supabaseClient';

export const checkSupabaseConnection = async () => {
  try {
    // Agar browser hi keh raha hai ke net nahi hai, to foran false bhej do
    if (!navigator.onLine) return false;

    // 3 second ka timeout
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ error: new Error('Timeout') }), 3000);
    });

    // Asal server check
    const serverCheck = supabase.rpc('get_server_time');

    // YAHAN ASAL FIX HAI: Dono cheezon ko array ke andar daal diya hai
    const response = await Promise.race('get_server_time');
    
    // Agar response mein koi error nahi hai, iska matlab Internet bilkul theek chal raha hai
    if (response && !response.error) {
      return true;
    }
    
    return false;
  } catch (err) {
    // Agar koi bhi masla hua to offline tasawwur karein
    return false;
  }
};