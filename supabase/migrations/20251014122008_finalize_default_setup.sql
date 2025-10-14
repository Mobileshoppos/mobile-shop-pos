-- This migration performs a full reset of the default categories and their attributes.
-- It ensures a clean, standardized, and globally relevant setup for all new users.
-- Strategy: DELETE all old defaults first, then INSERT the new, improved set.

-- ========= STEP 1: DELETE ALL OLD DEFAULT ATTRIBUTES =========
DELETE FROM public.category_attributes
WHERE category_id IN (SELECT id FROM public.categories WHERE user_id IS NULL);

-- ========= STEP 2: DELETE ALL OLD DEFAULT CATEGORIES =========
DELETE FROM public.categories WHERE user_id IS NULL;

-- ========= STEP 3: INSERT THE NEW, STANDARDIZED LIST OF DEFAULT CATEGORIES =========
INSERT INTO public.categories (name, is_imei_based, user_id) VALUES
    ('Smart Phones & Tablets', TRUE, NULL),
    ('Accessories', FALSE, NULL),
    ('Charging & Power', FALSE, NULL),
    ('Audio Devices', FALSE, NULL),
    ('Wearable Tech', TRUE, NULL);

-- ========= STEP 4: SEED THE NEW, IMPROVED DEFAULT ATTRIBUTES FOR EACH CATEGORY =========

-- Attributes for "Smart Phones & Tablets"
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required) VALUES
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones & Tablets'), 'Serial / IMEI', 'text', NULL, TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones & Tablets'), 'Condition', 'select', '["New", "Used", "Refurbished"]', TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones & Tablets'), 'Network Status', 'select', '["Unlocked", "Locked"]', TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones & Tablets'), 'Storage', 'text', NULL, TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones & Tablets'), 'RAM', 'text', NULL, FALSE),
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones & Tablets'), 'Color', 'text', NULL, TRUE)
ON CONFLICT (category_id, attribute_name) DO NOTHING;

-- Attributes for "Accessories"
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required) VALUES
    ((SELECT id FROM public.categories WHERE name = 'Accessories'), 'Type', 'select', '["Case", "Screen Protector", "Camera Lens Guard"]', TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Accessories'), 'For Model', 'text', NULL, TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Accessories'), 'Color', 'text', NULL, FALSE),
    ((SELECT id FROM public.categories WHERE name = 'Accessories'), 'Material', 'text', NULL, FALSE)
ON CONFLICT (category_id, attribute_name) DO NOTHING;

-- Attributes for "Charging & Power"
-- --- YAHAN GHALTI THEEK KI GAYI HAI ---
-- The subqueries now correctly select from the 'public.categories' table.
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required) VALUES
    ((SELECT id FROM public.categories WHERE name = 'Charging & Power'), 'Type', 'select', '["Adapter", "Cable", "Power Bank", "Wireless Charger"]', TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Charging & Power'), 'Wattage', 'text', NULL, FALSE),
    ((SELECT id FROM public.categories WHERE name = 'Charging & Power'), 'Port Type', 'select', '["USB-C", "Lightning", "Micro USB"]', TRUE)
ON CONFLICT (category_id, attribute_name) DO NOTHING;

-- Attributes for "Audio Devices"
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required) VALUES
    ((SELECT id FROM public.categories WHERE name = 'Audio Devices'), 'Type', 'select', '["Earbuds", "Headphones", "Neckband", "Speaker"]', TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Audio Devices'), 'Connectivity', 'select', '["Bluetooth", "Wired"]', TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Audio Devices'), 'Color', 'text', NULL, FALSE)
ON CONFLICT (category_id, attribute_name) DO NOTHING;

-- Attributes for "Wearable Tech"
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required) VALUES
    ((SELECT id FROM public.categories WHERE name = 'Wearable Tech'), 'Serial Number', 'text', NULL, TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Wearable Tech'), 'Condition', 'select', '["New", "Used"]', TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Wearable Tech'), 'Dial Size', 'text', NULL, FALSE),
    ((SELECT id FROM public.categories WHERE name = 'Wearable Tech'), 'Strap Color', 'text', NULL, FALSE)
ON CONFLICT (category_id, attribute_name) DO NOTHING;