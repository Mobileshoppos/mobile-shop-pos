/**
 * This is the final, robust, and correct migration for scheduling the expiry check.
 * It handles the case where the job might not exist when trying to unschedule it.
 */

-- Step 1: Enable the pg_cron extension if it's not already enabled.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Step 2: Grant necessary permissions to the postgres role.
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
grant all privileges on all sequences in schema cron to postgres;

-- Step 3: Safely unschedule the job only if it exists.
-- We wrap this in a special DO block to catch the error if the job is not found.
DO $$
BEGIN
  -- Try to unschedule the job
  PERFORM cron.unschedule('daily-subscription-expiry-check');
EXCEPTION
  -- If an error occurs (like 'job not found'), do nothing and continue.
  WHEN OTHERS THEN
    RAISE NOTICE 'Job "daily-subscription-expiry-check" did not exist, skipping unschedule. This is normal.';
END;
$$;

-- Step 4: Schedule the definitive job.
-- This will now run successfully because the script won't be stopped by the unschedule error.
SELECT cron.schedule(
  'daily-subscription-expiry-check', -- Job name
  '0 0 * * *', -- Schedule: every day at midnight
  $$
    UPDATE public.profiles
    SET
      subscription_tier = 'free',
      subscription_expires_at = NULL
    WHERE
      subscription_tier = 'pro' AND subscription_expires_at < now();
  $$
);