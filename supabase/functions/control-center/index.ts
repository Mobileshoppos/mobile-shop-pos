import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS Preflight request ko handle karna (Browser ki zaroorat)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Supabase ke secure environment variables hasil karna
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // 2. Master Key (Service Role) ke sath connection banana taake RLS bypass ho sake
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Jisne request bheji hai, uska Token (Pehchan card) check karna
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) throw new Error('Unauthorized: Please log in')

    // 4. Check karna ke kya yeh waqayi Super Admin hai?
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.is_super_admin !== true) {
      throw new Error('Forbidden: You are not authorized to use the Control Center')
    }

    // 5. Frontend se aane wala Order (Action) parhna
    const { action, payload } = await req.json()
    let result = null

    // --- ACTION 1: TAMAM USERS KI LIST MANGWANA ---
    if (action === 'get_users') {
      const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers()
      if (authErr) throw authErr

      const { data: profiles, error: profErr } = await supabaseAdmin.from('profiles').select('*')
      if (profErr) throw profErr

      // Auth aur Profiles ke data ko jorna
      result = authUsers.users.map(u => {
        const p = profiles.find(p => p.user_id === u.id)
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          shop_name: p?.shop_name || 'No Shop Name',
          subscription_tier: p?.subscription_tier || 'free',
          is_super_admin: p?.is_super_admin || false
        }
      })
    }

    // --- ACTION 2: KISI KA PLAN UPDATE KARNA ---
    else if (action === 'update_plan') {
      const { target_user_id, new_plan } = payload
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ subscription_tier: new_plan })
        .eq('user_id', target_user_id)
      
      if (updateErr) throw updateErr
      result = { success: true, message: `Plan successfully updated to ${new_plan}` }
    }

    // --- ACTION 3: USER KO HAMESHA KE LIYE DELETE KARNA (WITH IMAGES) ---
    else if (action === 'delete_user') {
      const { target_user_id } = payload
      
      // Hissa A: Database ke andar se us user ki tasveeron ke naam mangwana
      const { data: fileNames, error: rpcErr } = await supabaseAdmin
        .rpc('get_user_image_names', { target_uid: target_user_id })
      
      if (rpcErr) throw rpcErr

      // Hissa B: Agar tasveerein mojood hain, to unhein Storage API se delete karna (Tukron mein)
      if (fileNames && fileNames.length > 0) {
        const chunkSize = 100; // Ek waqt mein 100 tasveerein delete karega
        for (let i = 0; i < fileNames.length; i += chunkSize) {
          const chunk = fileNames.slice(i, i + chunkSize);
          const { error: storageErr } = await supabaseAdmin.storage
            .from('product-images')
            .remove(chunk);
            
          if (storageErr) console.error(`Storage delete error for chunk ${i}:`, storageErr);
        }
      }

      // Hissa B: Ab us user ko Auth se delete kar dein (Jis se Database khud saaf ho jayega)
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(target_user_id)
      if (delErr) throw delErr

      result = { success: true, message: 'User and all associated images deleted successfully' }
    }
    
    // Agar koi ghalat order aaye
    else {
      throw new Error('Unknown action requested')
    }

    // Kamyabi ka jawab wapis bhejna
    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    // Agar koi error aaye to wapis bhejna
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})