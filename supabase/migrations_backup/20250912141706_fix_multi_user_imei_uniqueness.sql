-- Step 1: Drop the old, global unique constraint on the IMEI column.
-- The name 'inventory_imei_key' is the default name Supabase creates.
ALTER TABLE public.inventory
DROP CONSTRAINT IF EXISTS inventory_imei_key;

-- Step 2: Create a new, composite unique constraint on both user_id and imei.
-- This ensures that an IMEI is unique *per user*, allowing different users
-- to have the same IMEI in their separate inventories.
ALTER TABLE public.inventory
ADD CONSTRAINT unique_imei_per_user
UNIQUE (user_id, imei);