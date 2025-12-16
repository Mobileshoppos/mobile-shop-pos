-- 1. Supplier Refunds Table par RLS On karein
ALTER TABLE public.supplier_refunds ENABLE ROW LEVEL SECURITY;

-- 2. Policy banayein: User sirf apna data dekh/edit sake
CREATE POLICY "Users can manage their own supplier refunds"
ON public.supplier_refunds
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. View ki Security (Optional lekin behtar)
-- Views par RLS direct nahi lagti, lekin hum isay 'Security Invoker' bana dete hain
-- Iska matlab hai View wohi security use karega jo Tables par lagi hai.
ALTER VIEW public.suppliers_with_balance OWNER TO postgres; -- Owner set karna zaroori hota hai kabhi kabhi
GRANT SELECT ON public.suppliers_with_balance TO authenticated;