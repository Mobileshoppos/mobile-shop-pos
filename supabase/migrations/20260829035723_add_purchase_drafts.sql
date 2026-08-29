-- 1. Batane ke liye ke yeh bill 'sale' ka hai ya 'purchase' ka
ALTER TABLE "public"."held_bills" ADD COLUMN IF NOT EXISTS "bill_type" text DEFAULT 'sale';

-- 2. Purchase draft mein supplier ko save karne ke liye
ALTER TABLE "public"."held_bills" ADD COLUMN IF NOT EXISTS "supplier_id" uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;