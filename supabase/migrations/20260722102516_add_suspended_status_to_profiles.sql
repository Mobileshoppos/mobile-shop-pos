-- 1. Profiles table mein is_suspended column add karein (Default false hoga yani dukan active hai)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- 2. Enforce profile security function ko update karein taake dukan-dar khud ko un-suspend na kar sake
CREATE OR REPLACE FUNCTION "public"."enforce_profile_security"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check karein ke kya request karne wala aam user (authenticated) hai?
    -- System (service_role) ko hum nahi rokenge taake Paddle/Edge functions kaam kar sakein.
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

        -- [SECURITY FIX]: is_suspended ki hifazat taake user khud ise change na kar sake
        IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
            RAISE EXCEPTION 'Security Error: Suspension status can only be managed by system administrators.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$;