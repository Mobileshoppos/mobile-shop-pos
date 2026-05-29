-- 1. Warning wali purani SELECT policy ko khatam karna (Kyunke public bucket mein iski zaroorat nahi)
DROP POLICY IF EXISTS "Allow public viewing of product images" ON storage.objects;

-- 2. Purani Delete policy ko khatam karke NAYI SAKHT policy lagana
DROP POLICY IF EXISTS "Allow authenticated users to delete product images" ON storage.objects;

CREATE POLICY "Allow users to delete their own product images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- 3. Purani Update policy ko khatam karke NAYI SAKHT policy lagana
DROP POLICY IF EXISTS "Allow authenticated users to update product images" ON storage.objects;

CREATE POLICY "Allow users to update their own product images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.uid() = owner);