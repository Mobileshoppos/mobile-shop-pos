-- 1. Smart Guard Function
CREATE OR REPLACE FUNCTION "public"."enforce_profile_security"()
RETURNS TRIGGER AS $$
BEGIN
    -- Check karein ke kya request karne wala aam user (authenticated) hai?
    -- System (service_role) ko hum nahi rokenge taake Paddle kaam kar sakay.
    IF auth.role() = 'authenticated' THEN
        
        -- A. is_admin ki hifazat
        IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
            RAISE EXCEPTION 'Security Error: You are not allowed to change admin status.';
        END IF;

        -- B. subscription_tier ki hifazat
        IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
            RAISE EXCEPTION 'Security Error: Subscription plans can only be updated via payment gateway.';
        END IF;

        -- C. subscription_expires_at ki hifazat
        IF NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN
            RAISE EXCEPTION 'Security Error: Expiry dates are managed by the system.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger Lagana
DROP TRIGGER IF EXISTS "trg_enforce_profile_security" ON "public"."profiles";
CREATE TRIGGER "trg_enforce_profile_security"
BEFORE UPDATE ON "public"."profiles"
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_profile_security"();

-- Permissions
ALTER FUNCTION "public"."enforce_profile_security"() OWNER TO "postgres";