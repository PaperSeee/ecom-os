-- Clean delivery reset: remove seeded/demo operational data
-- Keep workspace/users/settings structure

truncate table
  public.checklist_task_validations,
  public.scaling_logs,
  public.campaigns,
  public.cashflow_entries,
  public.alerts,
  public.competitors,
  public.checklist_tasks,
  public.products,
  public.recurring_costs
restart identity cascade;

update public.financial_settings
set starting_capital = 0,
    updated_at = now();
