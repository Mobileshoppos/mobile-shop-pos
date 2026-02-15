-- 1. Purane bigint wale function ko hatana taake UUID wala chal sakay
DROP FUNCTION IF EXISTS "public"."get_products_with_quantity"();

-- 2. Naya mehfooz function (Asli logic ke sath)
CREATE OR REPLACE FUNCTION "public"."get_products_with_quantity"() 
RETURNS TABLE(
    "id" uuid, -- [FIX]: bigint se uuid kiya
    "name" "text", 
    "category_id" uuid, -- [FIX]: bigint se uuid kiya
    "brand" "text", 
    "purchase_price" numeric, 
    "sale_price" numeric, 
    "user_id" "uuid", 
    "created_at" timestamp with time zone, 
    "quantity" bigint, 
    "categories" json
)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.category_id,
        p.brand,
        p.purchase_price::numeric, -- Cast to numeric for consistency
        p.sale_price::numeric,     -- Cast to numeric for consistency
        p.user_id,
        p.created_at,
        (SELECT count(i.id) FROM public.inventory i WHERE i.product_id = p.id AND i.status = 'Available'::text AND i.user_id = auth.uid()) AS quantity,
        json_build_object('name', c.name) as categories
    FROM
        public.products p
    LEFT JOIN
        public.categories c ON p.category_id = c.id
    WHERE
        p.user_id = auth.uid(); -- [SECURITY CHECK]: Sirf apni dukan ka data
END;
$$;

-- Permissions set karna
ALTER FUNCTION "public"."get_products_with_quantity"() OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."get_products_with_quantity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_with_quantity"() TO "service_role";