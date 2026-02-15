-- Pehle purane (bigint wale) function ko khatam karna lazmi hai
DROP FUNCTION IF EXISTS "public"."get_returned_items_for_sale"(bigint);

-- Naya mehfooz function (UUID aur User Check ke sath)
CREATE OR REPLACE FUNCTION "public"."get_returned_items_for_sale"("p_sale_id" uuid) RETURNS TABLE("inventory_id" uuid)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT
        sri.inventory_id
    FROM
        public.sale_return_items AS sri
    JOIN
        public.sale_returns AS sr ON sri.return_id = sr.id
    WHERE
        sr.sale_id = p_sale_id
        AND sr.user_id = auth.uid(); -- [SECURITY FIX]: Sirf apni dukan ka data dekhne ka check
$$;

-- Permissions set karna
ALTER FUNCTION "public"."get_returned_items_for_sale"("p_sale_id" uuid) OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."get_returned_items_for_sale"("p_sale_id" uuid) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_returned_items_for_sale"("p_sale_id" uuid) TO "service_role";