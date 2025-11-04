-- Add new columns to the profiles table for subscription management
alter table public.profiles 
add column subscription_tier text not null default 'free',
add column subscription_expires_at timestamp with time zone;

-- Add a comment to explain the purpose of the new columns
comment on column public.profiles.subscription_tier is 'The subscription tier of the user (e.g., free, pro).';
comment on column public.profiles.subscription_expires_at is 'The date and time when the current subscription expires.';