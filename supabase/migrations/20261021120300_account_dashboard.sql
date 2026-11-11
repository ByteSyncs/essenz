CREATE OR REPLACE FUNCTION public.get_account_dashboard(
  p_account_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_tz constant text := 'America/Argentina/Buenos_Aires';
  v_result jsonb;
BEGIN
  IF p_account_id IS NULL
     OR p_from IS NULL OR p_to IS NULL
     OR p_prev_from IS NULL OR p_prev_to IS NULL
     OR p_to <= p_from
     OR p_prev_to <= p_prev_from
     OR p_to - p_from > interval '367 days'
     OR p_prev_to - p_prev_from > interval '367 days' THEN
    RAISE EXCEPTION 'invalid_parameters' USING ERRCODE = '22023';
  END IF;

  WITH branches AS (
    SELECT o.id, o.slug, o.name, o.created_at, COALESCE(s.menu_active, true) AS menu_active
    FROM public.organizations o
    LEFT JOIN public.organization_settings s ON s.organization_id = o.id
    WHERE o.account_id = p_account_id
  ),
  ord AS (
    SELECT
      o.org_slug,
      o.created_at,
      o.total_price,
      COALESCE(o.tip_amount, 0) AS tip_amount,
      (o.created_at >= p_from AND o.created_at < p_to) AS is_current
    FROM public.orders o
    JOIN branches b ON b.slug = o.org_slug
    WHERE o.status <> 'cancelled'
      AND (
        (o.created_at >= p_from AND o.created_at < p_to)
        OR (o.created_at >= p_prev_from AND o.created_at < p_prev_to)
      )
  ),
  exp AS (
    SELECT
      e.organization_id,
      e.created_at,
      e.amount,
      (e.created_at >= p_from AND e.created_at < p_to) AS is_current
    FROM public.expenses e
    JOIN branches b ON b.id = e.organization_id
    WHERE (e.created_at >= p_from AND e.created_at < p_to)
       OR (e.created_at >= p_prev_from AND e.created_at < p_prev_to)
  ),
  order_totals AS (
    SELECT
      org_slug,
      COALESCE(SUM(total_price) FILTER (WHERE is_current), 0) AS revenue,
      COUNT(*) FILTER (WHERE is_current) AS orders,
      COALESCE(SUM(tip_amount) FILTER (WHERE is_current), 0) AS tips,
      COALESCE(SUM(total_price) FILTER (WHERE NOT is_current), 0) AS prev_revenue,
      COUNT(*) FILTER (WHERE NOT is_current) AS prev_orders
    FROM ord
    GROUP BY org_slug
  ),
  expense_totals AS (
    SELECT
      organization_id,
      COALESCE(SUM(amount) FILTER (WHERE is_current), 0) AS expenses,
      COALESCE(SUM(amount) FILTER (WHERE NOT is_current), 0) AS prev_expenses
    FROM exp
    GROUP BY organization_id
  ),
  branch_rows AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'slug', b.slug,
        'name', b.name,
        'menuActive', b.menu_active,
        'revenue', COALESCE(ot.revenue, 0),
        'orders', COALESCE(ot.orders, 0),
        'tips', COALESCE(ot.tips, 0),
        'expenses', COALESCE(et.expenses, 0),
        'prevRevenue', COALESCE(ot.prev_revenue, 0),
        'prevOrders', COALESCE(ot.prev_orders, 0),
        'prevExpenses', COALESCE(et.prev_expenses, 0)
      )
      ORDER BY b.created_at, b.name
    ) AS rows
    FROM branches b
    LEFT JOIN order_totals ot ON ot.org_slug = b.slug
    LEFT JOIN expense_totals et ON et.organization_id = b.id
  ),
  cur_days AS (
    SELECT d::date AS day
    FROM generate_series(
      (p_from AT TIME ZONE v_tz)::date,
      ((p_to - interval '1 second') AT TIME ZONE v_tz)::date,
      interval '1 day'
    ) d
  ),
  prev_days AS (
    SELECT d::date AS day
    FROM generate_series(
      (p_prev_from AT TIME ZONE v_tz)::date,
      ((p_prev_to - interval '1 second') AT TIME ZONE v_tz)::date,
      interval '1 day'
    ) d
  ),
  daily_orders AS (
    SELECT
      (created_at AT TIME ZONE v_tz)::date AS day,
      is_current,
      SUM(total_price) AS revenue,
      COUNT(*) AS orders
    FROM ord
    GROUP BY 1, 2
  ),
  daily_expenses AS (
    SELECT
      (created_at AT TIME ZONE v_tz)::date AS day,
      is_current,
      SUM(amount) AS expenses
    FROM exp
    GROUP BY 1, 2
  ),
  series_cur AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'date', to_char(c.day, 'YYYY-MM-DD'),
        'revenue', COALESCE(o.revenue, 0),
        'orders', COALESCE(o.orders, 0),
        'expenses', COALESCE(x.expenses, 0)
      ) ORDER BY c.day
    ), '[]'::jsonb) AS rows
    FROM cur_days c
    LEFT JOIN daily_orders o ON o.day = c.day AND o.is_current
    LEFT JOIN daily_expenses x ON x.day = c.day AND x.is_current
  ),
  series_prev AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'date', to_char(c.day, 'YYYY-MM-DD'),
        'revenue', COALESCE(o.revenue, 0),
        'orders', COALESCE(o.orders, 0),
        'expenses', COALESCE(x.expenses, 0)
      ) ORDER BY c.day
    ), '[]'::jsonb) AS rows
    FROM prev_days c
    LEFT JOIN daily_orders o ON o.day = c.day AND NOT o.is_current
    LEFT JOIN daily_expenses x ON x.day = c.day AND NOT x.is_current
  )
  SELECT jsonb_build_object(
    'branches', COALESCE(branch_rows.rows, '[]'::jsonb),
    'series', series_cur.rows,
    'prevSeries', series_prev.rows
  )
  INTO v_result
  FROM branch_rows, series_cur, series_prev;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_activity(
  p_account_id uuid,
  p_orders_limit integer DEFAULT 8,
  p_stock_limit integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_orders_limit integer := LEAST(GREATEST(COALESCE(p_orders_limit, 8), 1), 20);
  v_stock_limit integer := LEAST(GREATEST(COALESCE(p_stock_limit, 6), 1), 20);
  v_result jsonb;
BEGIN
  IF p_account_id IS NULL THEN
    RAISE EXCEPTION 'invalid_parameters' USING ERRCODE = '22023';
  END IF;

  WITH branches AS (
    SELECT o.id, o.slug, o.name
    FROM public.organizations o
    WHERE o.account_id = p_account_id
  ),
  recent AS (
    SELECT o.id, o.org_slug, b.name AS branch_name, o.customer_name, o.total_price, o.status, o.created_at
    FROM public.orders o
    JOIN branches b ON b.slug = o.org_slug
    ORDER BY o.created_at DESC
    LIMIT v_orders_limit
  ),
  last_orders AS (
    SELECT b.slug, MAX(o.created_at) AS last_order_at
    FROM branches b
    LEFT JOIN public.orders o ON o.org_slug = b.slug AND o.status <> 'cancelled'
    GROUP BY b.slug
  ),
  low AS (
    SELECT b.slug, b.name AS branch_name, i.name, i.stock, i.stock_min, i.unit
    FROM public.inventory_items i
    JOIN branches b ON b.id = i.organization_id
    WHERE i.stock <= i.stock_min
  ),
  low_by_branch AS (
    SELECT slug, COUNT(*) AS items FROM low GROUP BY slug
  ),
  low_top AS (
    SELECT *
    FROM low
    ORDER BY (stock = 0) DESC, (stock_min - stock) DESC, name
    LIMIT v_stock_limit
  )
  SELECT jsonb_build_object(
    'recentOrders', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'branchSlug', r.org_slug,
          'branchName', r.branch_name,
          'customerName', r.customer_name,
          'total', r.total_price,
          'status', r.status,
          'createdAt', r.created_at
        ) ORDER BY r.created_at DESC
      ) FROM recent r
    ), '[]'::jsonb),
    'lastOrderAt', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('branchSlug', l.slug, 'lastOrderAt', l.last_order_at)
        ORDER BY l.slug
      ) FROM last_orders l
    ), '[]'::jsonb),
    'lowStock', jsonb_build_object(
      'total', COALESCE((SELECT SUM(items) FROM low_by_branch), 0),
      'byBranch', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('branchSlug', slug, 'items', items) ORDER BY slug)
        FROM low_by_branch
      ), '[]'::jsonb),
      'items', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'branchSlug', t.slug,
            'branchName', t.branch_name,
            'name', t.name,
            'stock', t.stock,
            'stockMin', t.stock_min,
            'unit', t.unit
          )
          ORDER BY (t.stock = 0) DESC, (t.stock_min - t.stock) DESC, t.name
        ) FROM low_top t
      ), '[]'::jsonb)
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_account_dashboard(uuid, timestamptz, timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_account_activity(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_dashboard(uuid, timestamptz, timestamptz, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_account_activity(uuid, integer, integer) TO service_role;
