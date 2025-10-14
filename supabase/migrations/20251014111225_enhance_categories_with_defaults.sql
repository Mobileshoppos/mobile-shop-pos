-- ========= STEP 1: ADD THE "IS_IMEI_BASED" SWITCH TO THE CATEGORIES TABLE =========
-- This adds a new boolean column to control the stock type for a category.
-- It defaults to FALSE, meaning new categories are "Quantity-based" by default.

ALTER TABLE public.categories
ADD COLUMN is_imei_based BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.categories.is_imei_based IS 'If TRUE, items in this category are tracked individually (like with IMEI). If FALSE, they are tracked in bulk by quantity.';


-- ========= STEP 2: MARK THE DEFAULT "SMART PHONES" CATEGORY AS IMEI-BASED =========
-- We need to update our existing default category to use this new flag.

UPDATE public.categories
SET is_imei_based = TRUE
WHERE name = 'Smart Phones / Devices';


-- ========= STEP 3: ADD A UNIQUE CONSTRAINT FOR SAFER INSERTS (Good Practice) =========
-- This ensures that a category cannot have two attributes with the exact same name.

ALTER TABLE public.category_attributes
ADD CONSTRAINT unique_category_attribute_name UNIQUE (category_id, attribute_name);


-- ========= STEP 4: SEED DEFAULT ATTRIBUTES FOR OUR DEFAULT CATEGORIES =========
-- This is the core part that solves Problem #1.
-- It will insert the necessary attributes for the most common default categories.

-- Attributes for "Smart Phones / Devices"
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required) VALUES
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones / Devices'), 'IMEI', 'text', NULL, TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones / Devices'), 'Condition', 'select', '["New", "Open Box", "Used"]', TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones / Devices'), 'PTA Status', 'select', '["Approved", "Not Approved"]', TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones / Devices'), 'Color', 'text', NULL, FALSE),
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones / Devices'), 'RAM/ROM', 'text', NULL, FALSE),
    ((SELECT id FROM public.categories WHERE name = 'Smart Phones / Devices'), 'Guaranty', 'text', NULL, FALSE)
ON CONFLICT (category_id, attribute_name) DO NOTHING; -- If attribute already exists, do nothing.

-- Attributes for "Charging & Power"
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required) VALUES
    ((SELECT id FROM public.categories WHERE name = 'Charging & Power'), 'Wattage', 'text', NULL, FALSE),
    ((SELECT id FROM public.categories WHERE name = 'Charging & Power'), 'Type', 'select', '["Cable", "Adapter", "Power Bank"]', TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Charging & Power'), 'Color', 'text', NULL, FALSE)
ON CONFLICT (category_id, attribute_name) DO NOTHING;

-- Attributes for "Protective Accessories"
INSERT INTO public.category_attributes (category_id, attribute_name, attribute_type, options, is_required) VALUES
    ((SELECT id FROM public.categories WHERE name = 'Protective Accessories'), 'For Model', 'text', NULL, TRUE),
    ((SELECT id FROM public.categories WHERE name = 'Protective Accessories'), 'Material', 'text', NULL, FALSE),
    ((SELECT id FROM public.categories WHERE name = 'Protective Accessories'), 'Color', 'text', NULL, FALSE)
ON CONFLICT (category_id, attribute_name) DO NOTHING;