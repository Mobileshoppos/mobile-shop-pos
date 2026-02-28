-- 1. Staff Ledger table banana
CREATE TABLE IF NOT EXISTS "public"."staff_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "local_id" "uuid",
    "staff_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "type" "text" NOT NULL, -- 'Salary/Bonus' ya 'Payment/Advance'
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "staff_ledger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "staff_ledger_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE,
    CONSTRAINT "staff_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- 2. RLS Security enable karna
ALTER TABLE "public"."staff_ledger" ENABLE ROW LEVEL SECURITY;

-- 3. Security Policy: Sirf dukaandar apna ledger dekh aur manage kar sakay
CREATE POLICY "Users can manage their own staff ledger" ON "public"."staff_ledger"
    USING (("auth"."uid"() = "user_id"))
    WITH CHECK (("auth"."uid"() = "user_id"));

-- 4. Updated_at trigger (Hamesha ki tarah)
CREATE TRIGGER "set_staff_ledger_updated_at" BEFORE UPDATE ON "public"."staff_ledger" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();