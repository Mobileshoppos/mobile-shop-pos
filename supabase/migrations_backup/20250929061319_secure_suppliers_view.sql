-- =================================================================
-- Migration to secure the 'suppliers_with_balance' view.
-- This is the definitive fix for the data visibility issue.
-- =================================================================

-- Re-create the view with the 'security_invoker' option.
-- This critical option forces the view to respect the RLS policies
-- of the underlying tables ('suppliers' and 'purchases').
-- Now, when a user queries this view, they will only see the data
-- they are permitted to see by the RLS policies.

CREATE OR REPLACE VIEW public.suppliers_with_balance
WITH (security_invoker = true) -- THE CRITICAL FIX IS HERE
AS
 SELECT s.id,
    s.name,
    s.contact_person,
    s.phone,
    s.address,
    s.created_at,
    COALESCE(sum(p.balance_due), (0)::numeric) AS balance_due
   FROM (suppliers s
     LEFT JOIN purchases p ON ((s.id = p.supplier_id)))
  GROUP BY s.id, s.name, s.contact_person, s.phone, s.address, s.created_at
  ORDER BY s.name;