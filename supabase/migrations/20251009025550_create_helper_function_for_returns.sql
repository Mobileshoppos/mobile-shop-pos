-- This function helps find which items from a specific sale have already been returned.
-- It takes a sale_id as input and returns a list of inventory_ids that are already in the return tables.
-- The application uses this to make sure you can't return the same item twice.

CREATE OR REPLACE FUNCTION public.get_returned_items_for_sale(p_sale_id BIGINT)
RETURNS TABLE (inventory_id BIGINT) -- This specifies that the function will return a table-like structure with one column named 'inventory_id'.
LANGUAGE sql
AS $$
    SELECT
        sri.inventory_id
    FROM
        public.sale_return_items AS sri
    JOIN
        public.sale_returns AS sr ON sri.return_id = sr.id
    WHERE
        sr.sale_id = p_sale_id;
$$;