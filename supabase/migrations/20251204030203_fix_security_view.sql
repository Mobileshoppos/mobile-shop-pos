-- Security Advisor Error Fix
-- View ko 'Security Definer' se hata kar 'Security Invoker' par set kar rahe hain
ALTER VIEW public.products_display_view SET (security_invoker = true);