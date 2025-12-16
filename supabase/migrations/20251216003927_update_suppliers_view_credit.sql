-- Pehle purana view delete karein (Safe hai, data loss nahi hoga)
DROP VIEW IF EXISTS public.suppliers_with_balance;

-- Ab naya view banayein jisme credit_balance shamil hai
CREATE VIEW public.suppliers_with_balance AS
SELECT
  s.id,
  s.name,
  s.contact_person,
  s.phone,
  s.address,
  s.created_at,
  s.credit_balance,  -- Yeh naya column ab add ho jayega
  COALESCE(sum(p.balance_due), 0::numeric) as balance_due
FROM
  suppliers s
  LEFT JOIN purchases p ON s.id = p.supplier_id
GROUP BY
  s.id,
  s.name,
  s.contact_person,
  s.phone,
  s.address,
  s.created_at,
  s.credit_balance
ORDER BY
  s.name;