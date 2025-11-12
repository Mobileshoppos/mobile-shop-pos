create or replace function get_expense_summary_by_category(
    start_date date,
    end_date date
)
returns table (
    category text,
    amount numeric
)
language plpgsql
as $$
begin
    return query
    select
        ec.name as category,
        sum(e.amount) as amount
    from
        expenses e
    join
        expense_categories ec on e.category_id = ec.id
    where
        e.expense_date between start_date and end_date
    group by
        ec.name
    order by
        sum(e.amount) desc;
end;
$$;