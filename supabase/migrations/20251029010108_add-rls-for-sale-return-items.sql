-- Hum policy banane se pehle usko delete kar rahe hain (agar woh mojood ho).
-- 'IF EXISTS' yeh yaqeeni banata hai ke agar policy mojood na ho to koi error na aaye.
DROP POLICY IF EXISTS "Allow users to manage their own sale return items" ON public.sale_return_items;


-- Ab hum policy ko dobara bana rahe hain.
-- Yeh har authenticated (logged-in) user ko ijazat degi ke woh:
-- 1. Items daal sake (INSERT)
-- 2. Apne daale hue items dekh sake (SELECT)
-- Lekin sirf us soorat mein jab woh us parent 'sale_return' record ka maalik ho.

CREATE POLICY "Allow users to manage their own sale return items"
ON public.sale_return_items
FOR ALL -- Yeh policy SELECT, INSERT, UPDATE, DELETE sab ke liye hai
TO authenticated -- Sirf logged-in users ke liye
USING (
  auth.uid() = ( SELECT user_id FROM public.sale_returns WHERE id = sale_return_items.return_id )
)
WITH CHECK (
  auth.uid() = ( SELECT user_id FROM public.sale_returns WHERE id = sale_return_items.return_id )
);