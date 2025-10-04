-- supabase/migrations/20250928025817_allow_null_purchase_id_in_payments.sql

ALTER TABLE public.supplier_payments
ALTER COLUMN purchase_id DROP NOT NULL;