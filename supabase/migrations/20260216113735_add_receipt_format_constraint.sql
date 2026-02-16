-- profiles table mein receipt_format ke liye pabandi (check constraint) shamil karein
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_receipt_format_check 
CHECK (receipt_format IN ('pdf', 'thermal', 'none'));