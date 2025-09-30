-- Add a new 'barcode' column to the 'products' table.
-- This column will store the barcode/QR code value for each product model.
-- It is set to be UNIQUE to ensure that no two product models have the same barcode.

ALTER TABLE public.products
ADD COLUMN barcode TEXT UNIQUE;

-- Add a comment on the new column for clarity and documentation.
COMMENT ON COLUMN public.products.barcode IS 'Stores the barcode or QR code value associated with the product model.';