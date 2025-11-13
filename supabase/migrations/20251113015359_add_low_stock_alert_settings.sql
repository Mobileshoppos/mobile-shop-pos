-- Add columns for low stock alert settings to the profiles table
alter table public.profiles
add column low_stock_alerts_enabled boolean not null default true,
add column low_stock_threshold integer not null default 5
constraint low_stock_threshold_check check (low_stock_threshold > 0);