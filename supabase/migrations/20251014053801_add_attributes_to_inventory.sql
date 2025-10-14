-- Add a new column to the inventory table to store dynamic attribute values
ALTER TABLE public.inventory
ADD COLUMN item_attributes JSONB NULL;

-- Add a comment to explain what this new column does
COMMENT ON COLUMN public.inventory.item_attributes IS 'Stores dynamic key-value pairs of attributes for an inventory item, e.g., {"Color": "Blue", "Size": "Large"}.';