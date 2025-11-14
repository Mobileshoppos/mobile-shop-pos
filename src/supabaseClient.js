import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Hum yahan Supabase se connection bana rahe hain.
// NAYI AUR AHEM CHEEZ: Hum ne ek teesra option object shamil kiya hai.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Yeh Supabase ko batata hai ke user ke session (login state) ko
    // browser ki local storage mein mehfooz rakho. Is se user
    // page refresh karne ke baad bhi login rehta hai.
    persistSession: true,
    
    // YEH SAB SE ZAROORI LINE HAI:
    // Yeh Supabase ko hidayat deta hai ke woh har request ke saath
    // authentication token ko khud-ba-khud detect karke shamil kar de.
    // Iske bina, RLS policies kaam nahi kartin.
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})