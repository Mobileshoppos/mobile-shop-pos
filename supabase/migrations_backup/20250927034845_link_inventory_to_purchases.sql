-- Add supplier_id and purchase_id columns to the inventory table
-- to link each stock item with its supplier and purchase record.

ALTER TABLE public.inventory
ADD COLUMN supplier_id BIGINT,
ADD COLUMN purchase_id BIGINT;

-- Add foreign key constraint to link with the suppliers table.
-- ON DELETE SET NULL means if a supplier is deleted, the link in inventory is removed but the item remains.
ALTER TABLE public.inventory
ADD CONSTRAINT fk_inventory_supplier
FOREIGN KEY (supplier_id)
REFERENCES public.suppliers(id)
ON DELETE SET NULL;

-- Add foreign key constraint to link with the purchases table.
-- ON DELETE SET NULL means if a purchase record is deleted, the link in inventory is removed but the item remains.
ALTER TABLE public.inventory
ADD CONSTRAINT fk_inventory_purchase
FOREIGN KEY (purchase_id)
REFERENCES public.purchases(id)
ON DELETE SET NULL;