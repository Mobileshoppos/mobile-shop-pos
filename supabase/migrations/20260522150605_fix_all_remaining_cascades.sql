-- 1. Multi-Counter (Registers & Sessions) Ke Links Theek Karein
ALTER TABLE public.cash_adjustments DROP CONSTRAINT IF EXISTS cash_adjustments_register_id_fkey;
ALTER TABLE public.cash_adjustments ADD CONSTRAINT cash_adjustments_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id) ON DELETE CASCADE;
ALTER TABLE public.cash_adjustments DROP CONSTRAINT IF EXISTS cash_adjustments_session_id_fkey;
ALTER TABLE public.cash_adjustments ADD CONSTRAINT cash_adjustments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.register_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.credit_payouts DROP CONSTRAINT IF EXISTS credit_payouts_register_id_fkey;
ALTER TABLE public.credit_payouts ADD CONSTRAINT credit_payouts_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id) ON DELETE CASCADE;
ALTER TABLE public.credit_payouts DROP CONSTRAINT IF EXISTS credit_payouts_session_id_fkey;
ALTER TABLE public.credit_payouts ADD CONSTRAINT credit_payouts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.register_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.customer_payments DROP CONSTRAINT IF EXISTS customer_payments_register_id_fkey;
ALTER TABLE public.customer_payments ADD CONSTRAINT customer_payments_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id) ON DELETE CASCADE;
ALTER TABLE public.customer_payments DROP CONSTRAINT IF EXISTS customer_payments_session_id_fkey;
ALTER TABLE public.customer_payments ADD CONSTRAINT customer_payments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.register_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_register_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id) ON DELETE CASCADE;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_session_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.register_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.held_bills DROP CONSTRAINT IF EXISTS held_bills_register_id_fkey;
ALTER TABLE public.held_bills ADD CONSTRAINT held_bills_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id) ON DELETE CASCADE;

ALTER TABLE public.sale_returns DROP CONSTRAINT IF EXISTS sale_returns_register_id_fkey;
ALTER TABLE public.sale_returns ADD CONSTRAINT sale_returns_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id) ON DELETE CASCADE;
ALTER TABLE public.sale_returns DROP CONSTRAINT IF EXISTS sale_returns_session_id_fkey;
ALTER TABLE public.sale_returns ADD CONSTRAINT sale_returns_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.register_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_register_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id) ON DELETE CASCADE;
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_session_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.register_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.supplier_payments DROP CONSTRAINT IF EXISTS supplier_payments_register_id_fkey;
ALTER TABLE public.supplier_payments ADD CONSTRAINT supplier_payments_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id) ON DELETE CASCADE;
ALTER TABLE public.supplier_payments DROP CONSTRAINT IF EXISTS supplier_payments_session_id_fkey;
ALTER TABLE public.supplier_payments ADD CONSTRAINT supplier_payments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.register_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.supplier_refunds DROP CONSTRAINT IF EXISTS supplier_refunds_register_id_fkey;
ALTER TABLE public.supplier_refunds ADD CONSTRAINT supplier_refunds_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id) ON DELETE CASCADE;
ALTER TABLE public.supplier_refunds DROP CONSTRAINT IF EXISTS supplier_refunds_session_id_fkey;
ALTER TABLE public.supplier_refunds ADD CONSTRAINT supplier_refunds_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.register_sessions(id) ON DELETE CASCADE;

-- 2. Purchase Returns Ke Links Theek Karein
ALTER TABLE public.purchase_returns DROP CONSTRAINT IF EXISTS purchase_returns_purchase_id_fkey;
ALTER TABLE public.purchase_returns ADD CONSTRAINT purchase_returns_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_returns DROP CONSTRAINT IF EXISTS purchase_returns_supplier_id_fkey;
ALTER TABLE public.purchase_returns ADD CONSTRAINT purchase_returns_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

-- 3. Warranty Claims Ke Links Theek Karein
ALTER TABLE public.warranty_claims DROP CONSTRAINT IF EXISTS warranty_claims_customer_id_fkey;
ALTER TABLE public.warranty_claims ADD CONSTRAINT warranty_claims_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
ALTER TABLE public.warranty_claims DROP CONSTRAINT IF EXISTS warranty_claims_inventory_id_fkey;
ALTER TABLE public.warranty_claims ADD CONSTRAINT warranty_claims_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE CASCADE;