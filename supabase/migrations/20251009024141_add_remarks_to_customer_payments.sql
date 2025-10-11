-- Add a 'remarks' column to the customer_payments table.
-- This will be used to store notes, especially for refunds, to make the ledger more descriptive.

ALTER TABLE public.customer_payments
ADD COLUMN remarks TEXT;