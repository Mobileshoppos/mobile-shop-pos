-- Fixed Assets ka naya table banana
CREATE TABLE IF NOT EXISTS "public"."fixed_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "local_id" "uuid",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "asset_name" "text" NOT NULL,
    "category" "text" DEFAULT 'General'::"text",
    "purchase_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "cost_amount" numeric(12,2) NOT NULL,
    "payment_method" "text" DEFAULT 'Cash'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fixed_assets_local_id_key" UNIQUE ("local_id"),
    CONSTRAINT "fixed_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Security (RLS) lagana taake har dukandar sirf apne assets dekh sake
ALTER TABLE "public"."fixed_assets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own fixed assets" ON "public"."fixed_assets" 
USING (("auth"."uid"() = "user_id")) 
WITH CHECK (("auth"."uid"() = "user_id"));

-- Updated_at time khud ba khud change karne ka trigger
CREATE TRIGGER "set_updated_at_fixed_assets" BEFORE UPDATE ON "public"."fixed_assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();