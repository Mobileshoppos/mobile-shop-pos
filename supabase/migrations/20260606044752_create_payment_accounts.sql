-- Naya table: payment_accounts (Custom Banks, Cash aur Wallets ke liye)
CREATE TABLE IF NOT EXISTS "public"."payment_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL, -- 'Cash', 'Bank', ya 'Wallet'
    "opening_balance" numeric DEFAULT 0 NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL, -- Taake system ke bunyadi accounts delete na hon
    "is_active" boolean DEFAULT true NOT NULL,
    "local_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Primary Key aur Constraints
ALTER TABLE "public"."payment_accounts" ADD CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."payment_accounts" ADD CONSTRAINT "payment_accounts_local_id_key" UNIQUE ("local_id");
ALTER TABLE "public"."payment_accounts" ADD CONSTRAINT "payment_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- RLS (Row Level Security) Policies
ALTER TABLE "public"."payment_accounts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own payment accounts" 
ON "public"."payment_accounts" 
USING (("auth"."uid"() = "user_id")) 
WITH CHECK (("auth"."uid"() = "user_id"));

-- Updated_at trigger
CREATE TRIGGER "set_updated_at_payment_accounts" 
BEFORE UPDATE ON "public"."payment_accounts" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();