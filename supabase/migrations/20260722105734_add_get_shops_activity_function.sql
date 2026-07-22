-- Dukanon ki product counts aur last activity time tezi se nikalne ke liye custom database function
CREATE OR REPLACE FUNCTION public.get_shops_activity()
RETURNS TABLE (
  target_user_id UUID,
  active_products_count BIGINT,
  last_active_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id as target_user_id,
    -- 1. Har user ke active products ki ginti nikalna
    COALESCE((SELECT COUNT(*) FROM public.products pr WHERE pr.user_id = p.user_id AND pr.is_active != false), 0)::BIGINT as active_products_count,
    -- 2. Har user ka aakhri activity time (pehle system_logs se, phir profile updates se, aur aakhir mein creation time se)
    COALESCE(
      (SELECT MAX(created_at) FROM public.system_logs l WHERE l.user_id = p.user_id),
      p.updated_at,
      p.created_at
    ) as last_active_at
  FROM public.profiles p;
END;
$$;