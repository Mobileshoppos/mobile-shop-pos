-- Add new columns to the inventory table specifically for smartphones
ALTER TABLE public.inventory
ADD COLUMN ram_rom TEXT,
ADD COLUMN guaranty TEXT,
ADD COLUMN pta_status TEXT;

-- Make the IMEI column required (NOT NULL)
-- NOTE: This will fail if you already have items in the inventory table with a NULL imei.
-- Since our test DB is empty, this is safe to run.
ALTER TABLE public.inventory
ALTER COLUMN imei SET NOT NULL;