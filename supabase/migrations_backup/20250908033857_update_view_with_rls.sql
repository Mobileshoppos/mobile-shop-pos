-- Drop the old view
DROP VIEW IF EXISTS public.products_with_quantity;

-- Create a new, more secure view
CREATE OR REPLACE VIEW public.products_with_quantity AS
SELECT
    p.*,
    (
        SELECT COUNT(i.id)
        FROM public.inventory i
        WHERE i.product_id = p.id AND i.status = 'Available'
    ) AS quantity
FROM
    public.products p
-- YEH SAB SE AHEM LINE HAI:
-- Yeh view ko batati hai ke sirf us user ke products dikhao jo login hai.
WHERE
    p.user_id = auth.uid();