-- Function to get a customer's ledger with running balance
create or replace function get_customer_ledger(p_customer_id uuid)
returns table (
    transaction_date timestamptz,
    description text,
    debit numeric,
    credit numeric,
    balance numeric,
    transaction_type text,
    reference_id bigint
)
language plpgsql
as $$
begin
    return query
    with all_transactions as (
        -- Select all sales for the customer
        select
            s.created_at,
            'Sale (Invoice #' || s.id::text || ')' as description,
            coalesce(s.total_amount, 0) - coalesce(s.amount_paid_at_sale, 0) as debit,
            0 as credit,
            'sale' as transaction_type,
            s.id as reference_id
        from
            public.sales s
        where
            s.customer_id = p_customer_id

        union all

        -- Select all payments for the customer
        select
            cp.created_at,
            'Payment Received' as description,
            0 as debit,
            coalesce(cp.amount_paid, 0) as credit,
            'payment' as transaction_type,
            cp.id as reference_id
        from
            public.customer_payments cp
        where
            cp.customer_id = p_customer_id
    ),
    ordered_transactions as (
        -- Order all transactions by date to calculate running balance correctly
        select
            *,
            sum(at.debit - at.credit) over (order by at.created_at, at.reference_id) as running_balance
        from
            all_transactions at
    )
    -- Select final columns
    select
        ot.created_at as transaction_date,
        ot.description,
        ot.debit,
        ot.credit,
        ot.running_balance as balance,
        ot.transaction_type,
        ot.reference_id
    from
        ordered_transactions ot
    order by
        ot.created_at desc, ot.reference_id desc;
end;
$$;