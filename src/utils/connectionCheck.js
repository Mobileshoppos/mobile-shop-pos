import { supabase } from '../supabaseClient';

// Yeh function Supabase ko ek halki si 'Hello' bhejta hai
export const checkSupabaseConnection = async () => {
  try {
    // Agar browser hi keh raha hai ke net nahi hai, to foran false bhej do
    if (!navigator.onLine) return false;

    // Agar browser keh raha hai net hai, to confirm karne ke liye server se waqt poocho
    // (Yeh boht fast request hoti hai)
    const { error } = await supabase.rpc('get_server_time');
    
    // Agar koi error nahi aaya, iska matlab Internet Zinda hai
    if (!error) return true;
    
    return false;
  } catch (err) {
    // Agar koi bhi masla hua, iska matlab Internet kharab hai
    return false;
  }
};