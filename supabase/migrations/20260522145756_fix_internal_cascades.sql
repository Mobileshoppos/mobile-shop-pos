-- 1. Sales aur Sale Items ka rishta theek karein
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_sale_id_fkey;
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;

ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_inventory_id_fkey;
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE CASCADE;

-- 2. Inventory aur Products ka rishta theek karein
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_product_id_fkey;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- 3. Sales aur Customers ka rishta theek karein
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

-- 4. Expenses aur Categories ka rishta theek karein
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE CASCADE;

-- 5. Purchases aur uske items ka rishta theek karein
ALTER TABLE public.purchase_items DROP CONSTRAINT IF EXISTS purchase_items_purchase_id_fkey;
ALTER TABLE public.purchase_items ADD CONSTRAINT purchase_items_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE CASCADE;

-- 6. Returns aur Payments ke rishte theek karein
ALTER TABLE public.sale_return_items DROP CONSTRAINT IF EXISTS sale_return_items_inventory_id_fkey;
ALTER TABLE public.sale_return_items ADD CONSTRAINT sale_return_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE CASCADE;

ALTER TABLE public.sale_returns DROP CONSTRAINT IF EXISTS sale_returns_customer_id_fkey;
ALTER TABLE public.sale_returns ADD CONSTRAINT sale_returns_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.customer_payments DROP CONSTRAINT IF EXISTS customer_payments_customer_id_fkey;
ALTER TABLE public.customer_payments ADD CONSTRAINT customer_payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.credit_payouts DROP CONSTRAINT IF EXISTS credit_payouts_customer_id_fkey;
ALTER TABLE public.credit_payouts ADD CONSTRAINT credit_payouts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;