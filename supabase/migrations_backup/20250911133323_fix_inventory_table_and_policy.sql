-- STEP 1: Add the user_id column, but allow it to be empty for now.
-- This is safe for production databases with existing data.
ALTER TABLE public.inventory
ADD COLUMN user_id UUID;

-- STEP 2: Backfill the new user_id column for existing rows.
-- It finds the user_id from the 'products' table and fills it in.
-- On a new test database, this will do nothing, which is fine.
UPDATE public.inventory inv
SET user_id = prod.user_id
FROM public.products prod
WHERE inv.product_id = prod.id;

-- STEP 3: Now that all rows have a user_id, enforce the NOT NULL constraint.
-- This ensures all future stock entries MUST have a user_id.
ALTER TABLE public.inventory
ALTER COLUMN user_id SET NOT NULL;

-- STEP 4: Add a foreign key constraint to link to the auth.users table.
ALTER TABLE public.inventory
ADD CONSTRAINT inventory_user_id_fkey FOREIGN KEY (user_id)
REFERENCES auth.users (id) ON DELETE CASCADE;

-- STEP 5: Add an index for better performance.
CREATE INDEX idx_inventory_user_id ON public.inventory(user_id);

-- STEP 6: IMPORTANT - Create the RLS policy for inserting stock.
-- This policy allows a user to insert stock only if the user_id in the new row
-- matches their own authenticated user ID.
CREATE POLICY "Users can insert their own stock"
ON public.inventory
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also, enable RLS on the table if it's not already.
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;