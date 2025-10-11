-- Step 1: Add a new column 'inventory_id' to the 'sale_items' table.
-- This column will store the ID of the specific item sold from the 'inventory' table.
ALTER TABLE public.sale_items
ADD COLUMN inventory_id BIGINT;

-- Step 2: Add a foreign key constraint to the new 'inventory_id' column.
-- This ensures that every value in this column must correspond to an actual record in the 'inventory' table.
-- It also sets up a relationship that helps in maintaining data integrity.
ALTER TABLE public.sale_items
ADD CONSTRAINT sale_items_inventory_id_fkey
FOREIGN KEY (inventory_id) REFERENCES public.inventory(id);

-- Step 3: Make the old 'product_id' column optional.
-- While we have it as nullable, this officially marks it as a legacy column.
-- All new sale logic should use 'inventory_id' instead.
-- The following command is more of a comment in intent; the column is already nullable.
-- For clarity, we will stop relying on 'product_id' for new entries.
-- No SQL needed here if it's already nullable, which it is.

-- Informational Comment: Going forward, 'product_id' in this table is considered deprecated.
-- It can be populated for backward compatibility if needed, but the primary link
-- for sale records to physical stock is now the 'inventory_id'.