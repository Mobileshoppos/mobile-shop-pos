-- Create a default customer for walk-in sales with a fixed ID of 1.
-- This ensures that sales without a selected customer are still recorded.
INSERT INTO public.customers (id, name, phone_number, address, user_id)
VALUES (1, 'Walk-in Customer', '000-0000000', 'N/A', NULL)
ON CONFLICT (id) DO NOTHING;