-- ========= TABLE 1: SALE_RETURNS =========
-- Stores the main information about a return transaction.

CREATE TABLE public.sale_returns (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sale_id BIGINT NOT NULL REFERENCES public.sales(id),
    customer_id BIGINT REFERENCES public.customers(id),
    total_refund_amount NUMERIC NOT NULL DEFAULT 0,
    reason TEXT,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id)
);

-- Enable RLS for the new table
ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own returns
CREATE POLICY "Allow users to manage their own sale returns"
ON public.sale_returns
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ========= TABLE 2: SALE_RETURN_ITEMS =========
-- Stores details about each specific inventory item that was returned.

CREATE TABLE public.sale_return_items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    return_id BIGINT NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
    inventory_id BIGINT NOT NULL REFERENCES public.inventory(id),
    price_at_return NUMERIC NOT NULL,
    condition TEXT NOT NULL DEFAULT 'Resellable', -- Can be 'Resellable' or 'Damaged'
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id)
);

-- Enable RLS for the new table
ALTER TABLE public.sale_return_items ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own return items
CREATE POLICY "Allow users to manage their own sale return items"
ON public.sale_return_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ========= AUTOMATION: UPDATE INVENTORY ON RETURN =========
-- This function will be triggered after a new item is inserted into sale_return_items.

CREATE OR REPLACE FUNCTION public.handle_stock_on_return()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the returned item's condition is 'Resellable'
    IF NEW.condition = 'Resellable' THEN
        -- If so, update the status of the corresponding item in the inventory table
        -- back to 'Available' so it can be sold again.
        UPDATE public.inventory
        SET status = 'Available'
        WHERE id = NEW.inventory_id;
    END IF;

    -- This is an AFTER trigger, so we must return the original NEW record.
    RETURN NEW;
END;
$$;

-- ========= TRIGGER: ACTIVATE THE AUTOMATION =========
-- This trigger calls the function above whenever a new row is added to sale_return_items.

CREATE TRIGGER on_sale_item_return
AFTER INSERT ON public.sale_return_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_stock_on_return();