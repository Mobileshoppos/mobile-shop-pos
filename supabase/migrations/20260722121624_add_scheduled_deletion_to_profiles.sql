-- 1. Profiles table mein scheduled_deletion_at column add karein (By default yeh khali/null hoga)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP WITH TIME ZONE;

-- 2. Enforce profile security function ko update karein taake dukan-dar scheduled_deletion_at ko khud badal na sakein
CREATE OR REPLACE FUNCTION "public"."enforce_profile_security"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check karein ke kya request karne wala aam user (authenticated) hai?
    -- System (service_role) ko hum nahi rokenge taake Edge functions kaam kar sakein.
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

        -- D. is_suspended ki hifazat
        IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
            RAISE EXCEPTION 'Security Error: Suspension status can only be managed by system administrators.';
        END IF;

        -- [SECURITY FIX]: scheduled_deletion_at ki hifazat taake user ise directly change na kar sake
        IF NEW.scheduled_deletion_at IS DISTINCT FROM OLD.scheduled_deletion_at THEN
            RAISE EXCEPTION 'Security Error: Deletion schedule can only be managed by system administrators.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$;