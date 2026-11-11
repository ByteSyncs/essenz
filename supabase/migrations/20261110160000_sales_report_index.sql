CREATE INDEX IF NOT EXISTS orders_sales_report_branch_created
  ON public.orders (org_slug, created_at DESC)
  WHERE status <> 'cancelled';
