-- Make the IMEI column optional again to allow non-smartphone items
ALTER TABLE public.inventory
ALTER COLUMN imei DROP NOT NULL;