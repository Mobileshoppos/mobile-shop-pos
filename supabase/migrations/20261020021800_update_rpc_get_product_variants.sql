-- PostgreSQL requirement: Return table mein naya column shamil karne ke liye pehle drop kiya jata hai
DROP FUNCTION IF EXISTS "public"."get_product_variants"("p_product_id" "uuid");

CREATE OR REPLACE FUNCTION "public"."get_product_variants"("p_product_id" "uuid") 
RETURNS TABLE(
    "quantity" bigint, 
    "purchase_price" numeric, 
    "sale_price" numeric, 
    "wholesale_price" numeric, 
    "distributor_price" numeric, -- <--- NAYA IZAFA (Distributor Price Return)
    "details" "jsonb"
)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        SUM(inv.available_qty)::bigint AS quantity,
        inv.purchase_price,
        inv.sale_price,
        inv.wholesale_price, -- <--- NAYA IZAFA
        inv.distributor_price, -- <--- NAYA IZAFA (Distributor Price Column)
        -- Purane columns (condition, color) ki jagah ab asli 'item_attributes' use karenge
        inv.item_attributes AS details
    FROM
        public.inventory inv
    WHERE
        inv.product_id = p_product_id
        AND inv.user_id = auth.uid() -- [SECURITY LOCK]: Sirf apna data dekh sakein
        AND inv.status = 'Available'
        AND inv.available_qty > 0
    GROUP BY
        inv.purchase_price,
        inv.sale_price,
        inv.wholesale_price, -- <--- NAYA IZAFA
        inv.distributor_price, -- <--- NAYA IZAFA (Distributor Price Group)
        inv.item_attributes
    ORDER BY
        inv.purchase_price,
        inv.sale_price;
END;
$$;

ALTER FUNCTION "public"."get_product_variants"("p_product_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_product_variants"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_variants"("p_product_id" "uuid") TO "service_role";