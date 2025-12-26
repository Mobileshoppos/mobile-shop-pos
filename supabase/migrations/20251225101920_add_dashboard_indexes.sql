-- Sales table par index (Raftar barhane ke liye)
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales (user_id);

-- Expenses table par index
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses (user_id);

-- Sale Items par index (Profit calculation fast karne ke liye)
CREATE INDEX IF NOT EXISTS idx_sale_items_created_at ON public.sale_items (created_at);

-- Cash Adjustments aur Daily Closings par index
CREATE INDEX IF NOT EXISTS idx_cash_adjustments_created_at ON public.cash_adjustments (created_at);
CREATE INDEX IF NOT EXISTS idx_daily_closings_date ON public.daily_closings (closing_date);