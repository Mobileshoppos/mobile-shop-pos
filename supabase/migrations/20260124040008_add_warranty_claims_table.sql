-- Warranty Claims Table: Repair aur claims ka record rakhne ke liye
CREATE TABLE IF NOT EXISTS "public"."warranty_claims" (
    "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "local_id" uuid UNIQUE DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT now(),
    "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    "inventory_id" bigint REFERENCES public.inventory(id),
    "customer_id" bigint REFERENCES public.customers(id),
    "imei" text,
    "product_name_snapshot" text,
    "issue_description" text,
    "status" text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Received from Customer', 'Sent to Supplier', 'Received from Supplier', 'Returned to Customer', 'Rejected')),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Security: Sirf dukan ka malik apna data dekh sake
ALTER TABLE "public"."warranty_claims" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own claims" ON "public"."warranty_claims"
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated_at column ko auto-update karne ke liye trigger
CREATE TRIGGER "set_warranty_updated_at" BEFORE UPDATE ON "public"."warranty_claims" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();