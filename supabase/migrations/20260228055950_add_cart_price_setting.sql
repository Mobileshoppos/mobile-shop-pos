-- Profiles table mein naya column add karna (Default TRUE taake purane users ka kaam na ruke)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_cart_price_change BOOLEAN DEFAULT TRUE;