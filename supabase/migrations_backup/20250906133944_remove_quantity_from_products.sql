-- Remove the quantity column from the products table as it is now managed in the inventory table
ALTER TABLE public.products
DROP COLUMN quantity;