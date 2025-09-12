-- This function gathers product details along with inventory stats,
-- including the MIN and MAX sale prices from the actual stock.

CREATE OR REPLACE FUNCTION get_products_with_price_range()
RETURNS TABLE (
    id BIGINT,
    name TEXT,
    brand TEXT,
    -- Default prices from the products table, for the "Add Stock" modal
    default_purchase_price NUMERIC,
    default_sale_price NUMERIC,
    -- Calculated values from the inventory
    quantity BIGINT,
    min_sale_price NUMERIC,
    max_sale_price NUMERIC,
    -- Category details
    category_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.brand,
        p.purchase_price AS default_purchase_price,
        p.sale_price AS default_sale_price,
        COUNT(i.id) AS quantity,
        MIN(i.sale_price) AS min_sale_price,
        MAX(i.sale_price) AS max_sale_price,
        c.name AS category_name
    FROM
        products p
    LEFT JOIN
        inventory i ON p.id = i.product_id
    LEFT JOIN
        categories c ON p.category_id = c.id
    GROUP BY
        p.id, c.name
    ORDER BY
        p.name;
END;
$$;