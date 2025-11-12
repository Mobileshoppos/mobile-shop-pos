create or replace function get_daily_profit_summary(start_date date, end_date date)
returns table (
    report_date date,
    total_revenue numeric,
    total_cost numeric,
    total_expenses numeric,
    net_profit numeric
)
language plpgsql
as $$
begin
    return query
    with date_series as (
        select generate_series(start_date, end_date, '1 day'::interval)::date as day
    ),
    daily_sales as (
        select
            date_trunc('day', created_at)::date as day,
            sum(total_amount) as revenue
        from sales
        where created_at::date between start_date and end_date
        group by 1
    ),
    daily_costs as (
        select
            date_trunc('day', si.created_at)::date as day,
            sum(si.quantity * p.purchase_price) as cost
        from sale_items si
        join products p on si.product_id = p.id
        where si.created_at::date between start_date and end_date
        group by 1
    ),
    daily_expenses as (
        select
            expense_date as day,
            sum(amount) as expenses
        from expenses
        where expense_date between start_date and end_date
        group by 1
    )
    select
        ds.day as report_date,
        coalesce(s.revenue, 0) as total_revenue,
        coalesce(c.cost, 0) as total_cost,
        coalesce(e.expenses, 0) as total_expenses,
        (coalesce(s.revenue, 0) - coalesce(c.cost, 0) - coalesce(e.expenses, 0)) as net_profit
    from date_series ds
    left join daily_sales s on ds.day = s.day
    left join daily_costs c on ds.day = c.day
    left join daily_expenses e on ds.day = e.day
    order by ds.day;
end;
$$;