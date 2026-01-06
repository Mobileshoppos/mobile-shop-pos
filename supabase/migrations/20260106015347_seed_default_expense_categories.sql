-- Default Expense Categories Insert Karein (user_id NULL rakha gaya hai)
INSERT INTO public.expense_categories (name, user_id)
SELECT 'Rent', NULL WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Rent' AND user_id IS NULL);

INSERT INTO public.expense_categories (name, user_id)
SELECT 'Utilities', NULL WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Utilities' AND user_id IS NULL);

INSERT INTO public.expense_categories (name, user_id)
SELECT 'Salaries', NULL WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Salaries' AND user_id IS NULL);

INSERT INTO public.expense_categories (name, user_id)
SELECT 'Marketing', NULL WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Marketing' AND user_id IS NULL);

INSERT INTO public.expense_categories (name, user_id)
SELECT 'Other', NULL WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Other' AND user_id IS NULL);