-- Step 1: Fix the foreign key constraint on the 'sale_returns' table.
-- Drop the old, incorrect constraint that points to profiles.id
ALTER TABLE public.sale_returns
DROP CONSTRAINT sale_returns_user_id_fkey;

-- Create the new, correct constraint that points to profiles.user_id
ALTER TABLE public.sale_returns
ADD CONSTRAINT sale_returns_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);


-- Step 2: Fix the foreign key constraint on the 'sale_return_items' table.
-- Drop the old, incorrect constraint that points to profiles.id
ALTER TABLE public.sale_return_items
DROP CONSTRAINT sale_return_items_user_id_fkey;

-- Create the new, correct constraint that points to profiles.user_id
ALTER TABLE public.sale_return_items
ADD CONSTRAINT sale_return_items_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);