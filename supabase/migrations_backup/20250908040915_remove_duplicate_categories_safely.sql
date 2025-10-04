-- A safe way to delete duplicate default categories and expense_categories
-- This query preserves the oldest entry for each name and deletes the newer duplicates.

-- Cleanup for 'categories' table
DELETE FROM public.categories
WHERE user_id IS NULL AND id NOT IN (
  SELECT MIN(id)
  FROM public.categories
  WHERE user_id IS NULL
  GROUP BY name
);

-- Cleanup for 'expense_categories' table
DELETE FROM public.expense_categories
WHERE user_id IS NULL AND id NOT IN (
  SELECT MIN(id)
  FROM public.expense_categories
  WHERE user_id IS NULL
  GROUP BY name
);