-- 1. Registers table par missing trigger lagana
CREATE OR REPLACE TRIGGER "set_updated_at" 
BEFORE UPDATE ON "public"."registers" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- 2. Register Sessions table par missing trigger lagana
CREATE OR REPLACE TRIGGER "set_updated_at" 
BEFORE UPDATE ON "public"."register_sessions" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- 3. Jadoo (Magic): Purane tamaam counters aur sessions ki date aaj ki kar dein
-- Taake mobile app jab sync kare, to usay yeh naye lagain aur wo inhein download kar le
UPDATE public.registers SET updated_at = NOW();
UPDATE public.register_sessions SET updated_at = NOW();