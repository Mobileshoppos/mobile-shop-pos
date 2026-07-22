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

      // Database se active product count aur activity stats mangwana
      const { data: activityStats, error: actErr } = await supabaseAdmin.rpc('get_shops_activity')
      if (actErr) throw actErr

      // Auth, Profiles aur Activity stats ke data ko jorna
      result = authUsers.users.map(u => {
        const p = profiles.find(p => p.user_id === u.id)
        const stat = activityStats?.find(s => s.target_user_id === u.id)
        
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          shop_name: p?.shop_name || 'No Shop Name',
          subscription_tier: p?.subscription_tier || 'free',
          is_super_admin: p?.is_super_admin || false,
          is_suspended: p?.is_suspended || false, // <-- Naya column dukan block status ke liye
          active_products_count: stat?.active_products_count || 0, // <-- Naya field: Active Products
          last_active_at: stat?.last_active_at || p?.updated_at || u.created_at, // <-- Naya field: Last Activity
          subscription_expires_at: p?.subscription_expires_at || null, // <-- Naya field: Subscription Expiry Date
          scheduled_deletion_at: p?.scheduled_deletion_at || null // <-- NAYA IZAFA: Soft Delete / Grace Period timestamp
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

    // --- ACTION 3: USER KO DELETE SCHEDULE KARNA (YA AGAR PEHLE SE SCHEDULED HAI TO FORCE DELETE KARNA) ---
    else if (action === 'delete_user') {
      const { target_user_id, force_delete } = payload
      
      // Agar Super Admin hamesha ke liye foran data saaf karna chahe (Hard Delete)
      if (force_delete === true) {
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

        result = { success: true, message: 'User and all associated images deleted permanently' }
      } else {
        // Agar normal delete click kiya jaye, to 60 din ki date set karein aur access suspend karein
        const sixtyDaysFromNow = new Date()
        sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
        const expiryStr = sixtyDaysFromNow.toISOString()

        const { error: updateErr } = await supabaseAdmin
          .from('profiles')
          .update({ scheduled_deletion_at: expiryStr, is_suspended: true }) // Dukan-dar ko suspend kar dein taake login na kar sake
          .eq('user_id', target_user_id)
        
        if (updateErr) throw updateErr
        result = { success: true, message: 'User scheduled for deletion in 60 days. Login access has been suspended.' }
      }
    }

    // --- ACTION 4: KISI SHOP KO SUSPEND (BLOCK) YA UNSUSPEND (ACTIVE) KARNA ---
    else if (action === 'toggle_suspension') {
      const { target_user_id, is_suspended } = payload
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ is_suspended: is_suspended })
        .eq('user_id', target_user_id)
      
      if (updateErr) throw updateErr
      result = { success: true, message: `Shop status successfully updated to ${is_suspended ? 'Suspended' : 'Active'}` }
    }

    // --- ACTION 5: KISI SHOP KI SUBSCRIPTION EXPIRY DATE UPDATE KARNA ---
    else if (action === 'update_expiry') {
      const { target_user_id, expiry_date } = payload
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ subscription_expires_at: expiry_date })
        .eq('user_id', target_user_id)
      
      if (updateErr) throw updateErr
      result = { success: true, message: 'Subscription expiry date successfully updated' }
    }

    // --- ACTION 6: DELETED USER KO RESTORE KARNA (UNDO DELETE) ---
    else if (action === 'restore_user') {
      const { target_user_id } = payload
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ scheduled_deletion_at: null, is_suspended: false }) // Expiry khatam karein aur dukan ko wapis active karein
        .eq('user_id', target_user_id)
      
      if (updateErr) throw updateErr
      result = { success: true, message: 'User successfully restored and activated' }
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