-- Seed data for Product Categories
-- This ensures the default categories exist in the database.
-- The ON CONFLICT clause prevents errors if the data already exists.

INSERT INTO "public"."categories" ("id", "name", "user_id") VALUES
(1, 'Smart Phones / Devices', NULL),
(2, 'Protective Accessories', NULL),
(3, 'Charging & Power', NULL),
(4, 'Audio Accessories', NULL),
(5, 'Wearable Tech', NULL),
(6, 'Storage & Other Accessories', NULL),
(7, 'Services & Repairs', NULL)
ON CONFLICT (id) DO NOTHING;


-- Seed data for Expense Categories
-- This ensures the default expense categories exist.

INSERT INTO "public"."expense_categories" ("id", "name", "user_id") VALUES
(1, 'Rent', NULL),
(2, 'Utilities', NULL),
(3, 'Salaries', NULL),
(4, 'Marketing', NULL),
(5, 'Other', NULL)
ON CONFLICT (id) DO NOTHING;