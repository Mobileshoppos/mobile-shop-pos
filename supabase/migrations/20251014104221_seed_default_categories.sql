-- This migration inserts the 7 default product categories that the application needs.
-- These categories have a NULL user_id to identify them as system-wide defaults.
-- We are using a simple INSERT because we know the table is empty of these defaults.

INSERT INTO public.categories (name, user_id)
VALUES
    ('Smart Phones / Devices', NULL),
    ('Protective Accessories', NULL),
    ('Charging & Power', NULL),
    ('Audio Accessories', NULL),
    ('Wearable Tech', NULL),
    ('Storage & Other Accessories', NULL),
    ('Services & Repairs', NULL);