-- 1. Profiles table mein FBR settings ke columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fbr_integration_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fbr_pos_id TEXT,
ADD COLUMN IF NOT EXISTS fbr_ntn TEXT,
ADD COLUMN IF NOT EXISTS fbr_fee NUMERIC DEFAULT 1;

-- 2. Sales table mein FBR Invoice Number aur Fee ka record
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS fbr_invoice_number TEXT,
ADD COLUMN IF NOT EXISTS fbr_fee_applied NUMERIC DEFAULT 0;

-- 3. Sale Returns table mein FBR Invoice Number ka record
ALTER TABLE public.sale_returns 
ADD COLUMN IF NOT EXISTS fbr_invoice_number TEXT;