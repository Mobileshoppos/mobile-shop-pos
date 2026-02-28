-- 1. Staff Members Table Banana
CREATE TABLE IF NOT EXISTS "public"."staff_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL, -- Owner ki ID
    "name" "text" NOT NULL,
    "pin_code" "text" NOT NULL, -- Login PIN (e.g. 1234)
    "role" "text" DEFAULT 'Salesman'::"text", -- Manager, Salesman etc
    "permissions" "jsonb" DEFAULT '{}'::"jsonb", -- Ijazat (Permissions)
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "local_id" "uuid" -- Offline sync ke liye
);

-- Primary Key set karna
ALTER TABLE "public"."staff_members" 
    ADD CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id");

-- Owner ki ID par index lagana (Tezi ke liye)
CREATE INDEX IF NOT EXISTS "idx_staff_members_user_id" 
    ON "public"."staff_members" ("user_id");

-- 2. Sales Table mein Staff Tracking Column Add karna
ALTER TABLE "public"."sales" 
    ADD COLUMN IF NOT EXISTS "staff_id" "uuid";

-- Link lagana (Foreign Key) taake pata chale yeh staff mojood hai
ALTER TABLE "public"."sales" 
    ADD CONSTRAINT "sales_staff_id_fkey" 
    FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") 
    ON DELETE SET NULL;

-- 3. Returns Table mein bhi Staff Tracking Add karna
ALTER TABLE "public"."sale_returns" 
    ADD COLUMN IF NOT EXISTS "staff_id" "uuid";

ALTER TABLE "public"."sale_returns" 
    ADD CONSTRAINT "sale_returns_staff_id_fkey" 
    FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") 
    ON DELETE SET NULL;

-- 4. Security (RLS) Enable karna
ALTER TABLE "public"."staff_members" ENABLE ROW LEVEL SECURITY;

-- Policy: Owner apna banaya hua staff dekh sake, edit kar sake
CREATE POLICY "Users can manage their own staff" 
ON "public"."staff_members" 
USING ("auth"."uid"() = "user_id") 
WITH CHECK ("auth"."uid"() = "user_id");

-- 5. Realtime enable karna (Taake Owner ko foran pata chale)
alter publication supabase_realtime add table "public"."staff_members";