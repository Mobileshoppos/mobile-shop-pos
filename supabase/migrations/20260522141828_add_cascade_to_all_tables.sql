-- 1. Pehle purane rishte (constraints) hatayenge (agar wo bina CASCADE ke mojood hain) taake error na aaye
ALTER TABLE public.credit_payouts DROP CONSTRAINT IF EXISTS credit_payouts_user_id_fkey;
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_user_id_fkey;
ALTER TABLE public.purchase_returns DROP CONSTRAINT IF EXISTS purchase_returns_user_id_fkey;
ALTER TABLE public.purchase_return_items DROP CONSTRAINT IF EXISTS purchase_return_items_user_id_fkey;
ALTER TABLE public.sale_returns DROP CONSTRAINT IF EXISTS sale_returns_user_id_fkey;
ALTER TABLE public.supplier_payments DROP CONSTRAINT IF EXISTS supplier_payments_user_id_fkey;
ALTER TABLE public.supplier_refunds DROP CONSTRAINT IF EXISTS supplier_refunds_user_id_fkey;
ALTER TABLE public.device_registry DROP CONSTRAINT IF EXISTS device_registry_user_id_fkey;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_user_id_fkey;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_user_id_fkey;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_user_id_fkey;
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_user_id_fkey;
ALTER TABLE public.customer_payments DROP CONSTRAINT IF EXISTS customer_payments_user_id_fkey;
ALTER TABLE public.staff_members DROP CONSTRAINT IF EXISTS staff_members_user_id_fkey;

-- 2. Ab naye rishte (constraints) lagayenge ON DELETE CASCADE ke sath
ALTER TABLE public.categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.expense_categories ADD CONSTRAINT expense_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.sales ADD CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.customer_payments ADD CONSTRAINT customer_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.credit_payouts ADD CONSTRAINT credit_payouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.purchases ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_returns ADD CONSTRAINT purchase_returns_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_return_items ADD CONSTRAINT purchase_return_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.sale_returns ADD CONSTRAINT sale_returns_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.supplier_payments ADD CONSTRAINT supplier_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.supplier_refunds ADD CONSTRAINT supplier_refunds_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.staff_members ADD CONSTRAINT staff_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.device_registry ADD CONSTRAINT device_registry_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;