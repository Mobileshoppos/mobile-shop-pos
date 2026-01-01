-- Inventory table mein bulk system ke liye columns add karna
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS quantity int4 DEFAULT 1,
ADD COLUMN IF NOT EXISTS available_qty int4 DEFAULT 1,
ADD COLUMN IF NOT EXISTS sold_qty int4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS returned_qty int4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS damaged_qty int4 DEFAULT 0;

-- Purani rows ko update karna taake system crash na ho
UPDATE public.inventory 
SET 
  quantity = 1, 
  available_qty = CASE WHEN status = 'Available' THEN 1 ELSE 0 END,
  sold_qty = CASE WHEN status = 'Sold' THEN 1 ELSE 0 END,
  returned_qty = CASE WHEN status = 'Returned' THEN 1 ELSE 0 END
WHERE quantity IS NULL;