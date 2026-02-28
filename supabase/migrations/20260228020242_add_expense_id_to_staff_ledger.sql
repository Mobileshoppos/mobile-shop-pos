-- Staff Ledger ko Expense se jorne ke liye
ALTER TABLE public.staff_ledger 
ADD COLUMN expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL;