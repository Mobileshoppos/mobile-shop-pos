-- =================================================================
-- Renames the function 'record_supplier_payment' to 'record_purchase_payment'.
-- This is done to resolve a function overloading ambiguity where Supabase
-- could not distinguish between 'record_supplier_payment' and 'record_bulk_supplier_payment'.
-- Renaming makes the function's purpose clearer and resolves the error.
-- =================================================================

ALTER FUNCTION public.record_supplier_payment(p_supplier_id integer, p_purchase_id integer, p_amount numeric, p_payment_method text, p_payment_date date, p_notes text)
RENAME TO record_purchase_payment;