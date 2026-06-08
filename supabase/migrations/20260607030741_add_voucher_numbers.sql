-- Har qisam ki payment aur expense ke liye Voucher Number ka column add kar rahe hain
ALTER TABLE "public"."customer_payments" ADD COLUMN IF NOT EXISTS "voucher_no" text;
ALTER TABLE "public"."supplier_payments" ADD COLUMN IF NOT EXISTS "voucher_no" text;
ALTER TABLE "public"."credit_payouts" ADD COLUMN IF NOT EXISTS "voucher_no" text;
ALTER TABLE "public"."supplier_refunds" ADD COLUMN IF NOT EXISTS "voucher_no" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "voucher_no" text;
ALTER TABLE "public"."cash_adjustments" ADD COLUMN IF NOT EXISTS "voucher_no" text;