import { createClient } from '@supabase/supabase-js'

// Keys ab .env.local file se automatically aa jayengi
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Hum yahan Supabase se connection bana rahe hain
export const supabase = createClient(supabaseUrl, supabaseKey)