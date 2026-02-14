-- 1. Pehle purane ghalat function ko khatam karte hain (Kyunke parameter type badal rahi hai)
DROP FUNCTION IF EXISTS "public"."get_product_variants"(bigint);

-- 2. Naya mahfooz aur durust function banate hain
CREATE OR REPLACE FUNCTION "public"."get_product_variants"("p_product_id" uuid) 
RETURNS TABLE("quantity" bigint, "purchase_price" numeric, "sale_price" numeric, "details" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        SUM(inv.available_qty)::bigint AS quantity,
        inv.purchase_price,
        inv.sale_price,
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
        inv.item_attributes
    ORDER BY
        inv.purchase_price,
        inv.sale_price;
END;
$$;