-- First, drop the old function that was counting all stock.
DROP FUNCTION IF EXISTS public.get_product_variants(bigint);

-- Recreate the function with the corrected counting logic.
CREATE OR REPLACE FUNCTION get_product_variants(p_product_id bigint)
RETURNS TABLE (
    quantity BIGINT,
    purchase_price NUMERIC,
    sale_price NUMERIC,
    details JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) AS quantity,
        inv.purchase_price,
        inv.sale_price,
        jsonb_build_object(
            'condition', inv.condition,
            'color', inv.color,
            'ram_rom', inv.ram_rom,
            'pta_status', inv.pta_status,
            'guaranty', inv.guaranty
        ) AS details
    FROM
        inventory inv
    WHERE
        inv.product_id = p_product_id
        -- THE FIX IS HERE: We now only group and count items with 'Available' status.
        AND inv.status = 'Available'
    GROUP BY
        inv.purchase_price,
        inv.sale_price,
        inv.condition,
        inv.color,
        inv.ram_rom,
        inv.pta_status,
        inv.guaranty
    ORDER BY
        inv.purchase_price,
        inv.sale_price;
END;
$$;