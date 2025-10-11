-- Add a new column 'product_id' to the 'sale_return_items' table.
-- This creates a direct link to the products table.
ALTER TABLE public.sale_return_items
ADD COLUMN product_id BIGINT;

-- Add a foreign key constraint to the new column.
-- This ensures that every returned item is linked to an existing product.
ALTER TABLE public.sale_return_items
ADD CONSTRAINT sale_return_items_product_id_fkey
FOREIGN KEY (product_id) REFERENCES public.products(id);