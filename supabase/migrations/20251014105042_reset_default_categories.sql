-- This migration resets the default categories to prevent duplicates.
-- It first deletes all existing default categories and then inserts them fresh.

-- Step 1: Delete all existing default categories (where user_id is NULL).
DELETE FROM public.categories WHERE user_id IS NULL;

-- Step 2: Insert the 7 default product categories cleanly one time.
INSERT INTO public.categories (name, user_id)
VALUES
    ('Smart Phones / Devices', NULL),
    ('Protective Accessories', NULL),
    ('Charging & Power', NULL),
    ('Audio Accessories', NULL),
    ('Wearable Tech', NULL),
    ('Storage & Other Accessories', NULL),
    ('Services & Repairs', NULL);