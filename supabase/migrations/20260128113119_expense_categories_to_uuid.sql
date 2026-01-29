-- 1. Pehle Talluqaat (Constraints) khatam karte hain
ALTER TABLE IF EXISTS "public"."expenses" DROP CONSTRAINT IF EXISTS "expenses_category_id_fkey";

-- 2. Expenses table mein category_id ki 'NOT NULL' pabandi aarzi tor par hatate hain
ALTER TABLE "public"."expenses" ALTER COLUMN "category_id" DROP NOT NULL;

-- 3. Ab category_id ka type badal kar UUID karte hain
ALTER TABLE "public"."expenses" ALTER COLUMN "category_id" TYPE uuid USING NULL;

-- 4. Expense Categories Table ko UUID ke saath dobara banate hain
DROP TABLE IF EXISTS "public"."expense_categories" CASCADE;
CREATE TABLE "public"."expense_categories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" text NOT NULL,
    "user_id" uuid DEFAULT "auth"."uid"(),
    "local_id" uuid,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("id"),
    CONSTRAINT "expense_categories_local_id_key" UNIQUE ("local_id"),
    CONSTRAINT "expense_categories_name_user_id_key" UNIQUE ("name", "user_id")
);

-- 5. Talluqaat (Foreign Keys) dobara jorte hain
-- Note: Hum yahan RESTRICT rakhenge taake koi aisi category delete na ho sake jis mein kharch (expense) mojud ho
ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE RESTRICT;

-- 6. RLS Policies dobara lagate hain
ALTER TABLE "public"."expense_categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow viewing of own and default expense categories" ON "public"."expense_categories" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can create their own categories" ON "public"."expense_categories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can delete their own categories" ON "public"."expense_categories" FOR DELETE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update their own categories" ON "public"."expense_categories" FOR UPDATE USING (("auth"."uid"() = "user_id"));

-- 7. Triggers dobara set karte hain
CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."expense_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- 8. Permissions (Grants) dobara dete hain
GRANT ALL ON TABLE "public"."expense_categories" TO "anon";
GRANT ALL ON TABLE "public"."expense_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_categories" TO "service_role";