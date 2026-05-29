-- 1. Products table mein image_url ka column add karna
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Supabase Storage mein 'product-images' ke naam se ek folder (bucket) banana
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Hifazati Rulues (Security Policies) lagana taake sirf login users upload kar sakein

-- Tasveer dekhne ki ijazat sab ko hai (taake app mein nazar aaye)
CREATE POLICY "Allow public viewing of product images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- Tasveer upload karne ki ijazat sirf login users ko hai
CREATE POLICY "Allow authenticated users to upload product images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Tasveer tabdeel (update) karne ki ijazat sirf login users ko hai
CREATE POLICY "Allow authenticated users to update product images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Tasveer delete karne ki ijazat sirf login users ko hai
CREATE POLICY "Allow authenticated users to delete product images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');