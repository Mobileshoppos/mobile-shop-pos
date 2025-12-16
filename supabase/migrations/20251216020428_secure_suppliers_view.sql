-- View ko "Security Invoker" bana rahe hain.
-- Iska matlab hai ke yeh View ab underlying tables (suppliers, purchases) ki RLS policies ko follow karega.
-- Is se Supabase Dashboard par "Unrestricted" ka warning khatam ho jayega.

ALTER VIEW public.suppliers_with_balance SET (security_invoker = true);