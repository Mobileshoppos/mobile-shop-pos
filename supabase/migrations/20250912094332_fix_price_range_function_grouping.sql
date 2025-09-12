-- This function replaces the previous faulty one.
-- The key fix is the complete GROUP BY clause, which is required by PostgreSQL.

CREATE OR REPLACE FUNCTION get_products_with_price_range()
RETURNS TABLE (
    id BIGINT,
    name TEXT,
    brand TEXT,
    default_purchase_price NUMERIC,
    default_sale_price NUMERIC,
    quantity BIGINT,
    min_sale_price NUMERIC,
    max_sale_price NUMERIC,
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
    -- THE FIX IS HERE: All non-aggregated columns are now in GROUP BY
    GROUP BY
        p.id,
        p.name,
        p.brand,
        p.purchase_price,
        p.sale_price,
        c.name
    ORDER BY
        p.name;
END;
$$;