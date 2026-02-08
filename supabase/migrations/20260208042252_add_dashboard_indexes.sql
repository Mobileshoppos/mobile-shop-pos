-- Sales table par indexes (Dashboard reports ke liye)
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON public.sales (payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales (payment_status);

-- Inventory table par indexes (Stock valuation aur filters ke liye)
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory (status);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_price ON public.inventory (purchase_price);

-- Sale Items par index (Profit reports ke liye)
CREATE INDEX IF NOT EXISTS idx_sale_items_inventory_id ON public.sale_items (inventory_id);

-- Expenses par index (Expense breakdown ke liye)
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method ON public.expenses (payment_method);