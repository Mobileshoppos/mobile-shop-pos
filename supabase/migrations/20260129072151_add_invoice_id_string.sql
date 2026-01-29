-- Sales table mein invoice_id ka column add karein (Text type ka)
ALTER TABLE "public"."sales" 
ADD COLUMN "invoice_id" text;

-- Is par index lagayen taake search tez ho (Search bar mein A1234 likhne par foran mile)
CREATE INDEX IF NOT EXISTS idx_sales_invoice_id ON "public"."sales" ("invoice_id");