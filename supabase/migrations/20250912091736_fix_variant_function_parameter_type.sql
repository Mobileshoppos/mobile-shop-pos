-- Pehle purane function ko delete karein jo ghalti se UUID maang raha tha
DROP FUNCTION IF EXISTS public.get_product_variants(uuid);

-- Ab function ko dobara banayein, is baar sahi tareeqe se BIGINT (number) qubool karne ke liye
-- taakeh yeh aapke products table ki ID se match kare.
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