-- Expense Categories mein parent-child relationship ke liye parent_id column add karna
ALTER TABLE public.expense_categories 
ADD COLUMN parent_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE;