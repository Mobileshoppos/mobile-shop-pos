-- 1. Default Categories Insert Karein (Sirf agar missing hon)
INSERT INTO public.categories (name, is_imei_based, user_id)
SELECT 'Smart Phones & Tablets', true, NULL WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Smart Phones & Tablets' AND user_id IS NULL);

INSERT INTO public.categories (name, is_imei_based, user_id)
SELECT 'Accessories', false, NULL WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Accessories' AND user_id IS NULL);

INSERT INTO public.categories (name, is_imei_based, user_id)
SELECT 'Charging & Power', false, NULL WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Charging & Power' AND user_id IS NULL);

INSERT INTO public.categories (name, is_imei_based, user_id)
SELECT 'Audio Devices', false, NULL WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Audio Devices' AND user_id IS NULL);

INSERT INTO public.categories (name, is_imei_based, user_id)
SELECT 'Wearable Tech', true, NULL WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Wearable Tech' AND user_id IS NULL);


-- 2. Attributes (Tags) Insert Karein (Aik aik karke check ke sath)

-- Smart Phones & Tablets Attributes
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Serial / IMEI', 'text', null, true FROM public.categories c 
WHERE c.name = 'Smart Phones & Tablets' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Serial / IMEI');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Condition', 'select', '["New","Used","Refurbished"]'::jsonb, true FROM public.categories c 
WHERE c.name = 'Smart Phones & Tablets' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Condition');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Network Status', 'select', '["Unlocked","Locked"]'::jsonb, true FROM public.categories c 
WHERE c.name = 'Smart Phones & Tablets' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Network Status');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Storage', 'text', null, true FROM public.categories c 
WHERE c.name = 'Smart Phones & Tablets' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Storage');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'RAM', 'text', null, false FROM public.categories c 
WHERE c.name = 'Smart Phones & Tablets' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'RAM');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Color', 'text', null, true FROM public.categories c 
WHERE c.name = 'Smart Phones & Tablets' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Color');

-- Accessories Attributes
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Type', 'select', '["Case","Screen Protector","Camera Lens Guard"]'::jsonb, true FROM public.categories c 
WHERE c.name = 'Accessories' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Type');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'For Model', 'text', null, true FROM public.categories c 
WHERE c.name = 'Accessories' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'For Model');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Color', 'text', null, false FROM public.categories c 
WHERE c.name = 'Accessories' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Color');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Material', 'text', null, false FROM public.categories c 
WHERE c.name = 'Accessories' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Material');

-- Charging & Power Attributes
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Type', 'select', '["Adapter","Cable","Power Bank","Wireless Charger"]'::jsonb, true FROM public.categories c 
WHERE c.name = 'Charging & Power' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Type');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Wattage', 'text', null, false FROM public.categories c 
WHERE c.name = 'Charging & Power' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Wattage');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Port Type', 'select', '["USB-C","Lightning","Micro USB"]'::jsonb, true FROM public.categories c 
WHERE c.name = 'Charging & Power' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Port Type');

-- Audio Devices Attributes
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Type', 'select', '["Earbuds","Headphones","Neckband","Speaker"]'::jsonb, true FROM public.categories c 
WHERE c.name = 'Audio Devices' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Type');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Connectivity', 'select', '["Bluetooth","Wired"]'::jsonb, true FROM public.categories c 
WHERE c.name = 'Audio Devices' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Connectivity');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Color', 'text', null, false FROM public.categories c 
WHERE c.name = 'Audio Devices' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Color');

-- Wearable Tech Attributes
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Serial Number', 'text', null, true FROM public.categories c 
WHERE c.name = 'Wearable Tech' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Serial Number');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Condition', 'select', '["New","Used"]'::jsonb, true FROM public.categories c 
WHERE c.name = 'Wearable Tech' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Condition');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Dial Size', 'text', null, false FROM public.categories c 
WHERE c.name = 'Wearable Tech' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Dial Size');

INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
SELECT id, 'Strap Color', 'text', null, false FROM public.categories c 
WHERE c.name = 'Wearable Tech' AND c.user_id IS NULL 
AND NOT EXISTS (SELECT 1 FROM public.category_attributes WHERE category_id = c.id AND attribute_name = 'Strap Color');