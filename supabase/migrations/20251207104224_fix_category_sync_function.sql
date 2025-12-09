-- Pehle purane function ko khatam karein (Drop) kyunke hum return type badal rahe hain
DROP FUNCTION IF EXISTS public.get_user_categories_with_settings();

-- Ab naya function banayein jisme 'is_imei_based' shamil hai
CREATE OR REPLACE FUNCTION public.get_user_categories_with_settings()
 RETURNS TABLE(
    id bigint, 
    created_at timestamp with time zone, 
    name text, 
    user_id uuid, 
    is_visible boolean,
    is_imei_based boolean  -- <--- Yeh Naya Column Add Hua Hai
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.created_at,
        c.name,
        c.user_id,
        COALESCE(ucs.is_visible, TRUE) as is_visible,
        c.is_imei_based    -- <--- Yeh Data Ab Wapis Jayega
    FROM
        categories c
    LEFT JOIN
        user_category_settings ucs ON c.id = ucs.category_id AND ucs.user_id = auth.uid()
    WHERE
        c.user_id IS NULL OR c.user_id = auth.uid();
END;
$function$;