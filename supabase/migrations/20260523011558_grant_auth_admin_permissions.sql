-- UI (Manager) ko Public schema mein aane ki ijazat
GRANT ALL PRIVILEGES ON SCHEMA public TO supabase_auth_admin;

-- UI ko tamam mojooda tables, sequences, aur functions istemal karne ki ijazat
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO supabase_auth_admin;

-- Mustaqbil (Future) mein banne wale naye tables ke liye bhi ijazat
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO supabase_auth_admin;