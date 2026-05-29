-- Owner ko database mein apni tasveerein dhoondne (SELECT) ki ijazat dena 
-- (Taake wo unhein dhoond kar delete ya update kar sake)
CREATE POLICY "Allow users to select their own product images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images' AND auth.uid() = owner);