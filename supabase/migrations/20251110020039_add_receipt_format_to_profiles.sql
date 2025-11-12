-- Add receipt_format column to profiles table
ALTER TABLE profiles ADD COLUMN receipt_format TEXT DEFAULT 'pdf'::text;

-- Update existing rows to have 'pdf' as default
UPDATE profiles SET receipt_format = 'pdf' WHERE receipt_format IS NULL;