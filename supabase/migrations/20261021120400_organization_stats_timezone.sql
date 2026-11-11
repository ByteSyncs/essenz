CREATE OR REPLACE FUNCTION public.get_organization_stats(p_org_slug text, p_range text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tz constant text := 'America/Argentina/Buenos_Aires';
  v_today date := (now() AT TIME ZONE v_tz)::date;
  v_first_day date;
  v_org_id uuid;
  v_since timestamptz;
  v_total_revenue numeric(10,2);
  v_total_expenses numeric(10,2);
  v_total_tips numeric(10,2);
  v_order_count bigint;
  v_history jsonb;
  v_payments jsonb;
  v_top_expenses jsonb;
  v_top_products jsonb;
  v_hourly_distribution jsonb;
  v_result jsonb;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = p_org_slug;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Organization not found');
  END IF;

  CASE p_range
    WHEN 'today' THEN
      v_first_day := v_today;
    WHEN '7d' THEN
      v_first_day := v_today - 6;
    WHEN '30d' THEN
      v_first_day := v_today - 29;
    ELSE
      v_first_day := v_today - 6;
  END CASE;

  v_since := v_first_day::timestamp AT TIME ZONE v_tz;

  SELECT
    COALESCE(SUM(total_price), 0.00),
    COUNT(id),
    COALESCE(SUM(tip_amount), 0.00)
  INTO v_total_revenue, v_order_count, v_total_tips
  FROM public.orders
  WHERE org_slug = p_org_slug
    AND status != 'cancelled'
    AND created_at >= v_since;

  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_expenses
  FROM public.expenses
  WHERE organization_id = v_org_id
    AND created_at >= v_since;

  WITH dates AS (
    SELECT generate_series(
      v_first_day,
      v_today,
      '1 day'::interval
    )::date AS d
  ),
  daily_rev AS (
    SELECT (created_at AT TIME ZONE v_tz)::date AS d, SUM(total_price) AS rev
    FROM public.orders
    WHERE org_slug = p_org_slug AND status != 'cancelled' AND created_at >= v_since
    GROUP BY 1
  ),
  daily_exp AS (
    SELECT (created_at AT TIME ZONE v_tz)::date AS d, SUM(amount) AS exp
    FROM public.expenses
    WHERE organization_id = v_org_id AND created_at >= v_since
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'date', CASE
      WHEN extract(dow from dates.d) = 0 THEN 'Dom'
      WHEN extract(dow from dates.d) = 1 THEN 'Lun'
      WHEN extract(dow from dates.d) = 2 THEN 'Mar'
      WHEN extract(dow from dates.d) = 3 THEN 'Mie'
      WHEN extract(dow from dates.d) = 4 THEN 'Jue'
      WHEN extract(dow from dates.d) = 5 THEN 'Vie'
      WHEN extract(dow from dates.d) = 6 THEN 'Sab'
    END,
    'revenue', COALESCE(daily_rev.rev, 0),
    'expenses', COALESCE(daily_exp.exp, 0)
  ) ORDER BY dates.d)
  INTO v_history
  FROM dates
  LEFT JOIN daily_rev ON dates.d = daily_rev.d
  LEFT JOIN daily_exp ON dates.d = daily_exp.d;

  WITH flattened_payments AS (
    SELECT
      COALESCE(p->>'method', 'Otro') AS payment_method,
      COALESCE((p->>'amount')::numeric, 0) AS amount
    FROM public.orders,
    LATERAL jsonb_array_elements(payments) AS p
    WHERE org_slug = p_org_slug
      AND status != 'cancelled'
      AND created_at >= v_since
  ),
  grouped_payments AS (
    SELECT
      payment_method,
      SUM(amount) AS total_amount
    FROM flattened_payments
    GROUP BY 1
  ),
  total_payments AS (
    SELECT SUM(total_amount) AS grand_total FROM grouped_payments
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', INITCAP(payment_method),
    'value', CASE WHEN grand_total > 0 THEN ROUND((total_amount / grand_total) * 100) ELSE 0 END,
    'color', CASE
      WHEN payment_method ILIKE '%efectivo%' THEN 'var(--clr-accent)'
      WHEN payment_method ILIKE '%transfer%' THEN 'var(--clr-accent-light)'
      WHEN payment_method ILIKE '%debito%' OR payment_method ILIKE '%tarjeta%' THEN 'var(--clr-ink)'
      ELSE 'var(--clr-accent-light)'
    END
  )), '[]'::jsonb)
  INTO v_payments
  FROM grouped_payments, total_payments;

  WITH summarized_expenses AS (
    SELECT
      category,
      SUM(amount) AS total_category_amount
    FROM public.expenses
    WHERE organization_id = v_org_id AND created_at >= v_since
    GROUP BY category
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'category', CASE category
      WHEN 'supplies' THEN 'Insumos'
      WHEN 'maintenance' THEN 'Mantenimiento'
      WHEN 'utilities' THEN 'Servicios'
      WHEN 'staff' THEN 'Personal'
      ELSE 'Otros'
    END,
    'amount', total_category_amount
  ) ORDER BY total_category_amount DESC), '[]'::jsonb)
  INTO v_top_expenses
  FROM summarized_expenses;

  WITH raw_products AS (
    SELECT
      p->>'name' AS product_name,
      COALESCE((p->>'qty')::integer, 0) AS qty
    FROM public.orders,
    LATERAL jsonb_array_elements(items) AS p
    WHERE org_slug = p_org_slug
      AND status != 'cancelled'
      AND created_at >= v_since
  ),
  grouped_products AS (
    SELECT
      product_name,
      SUM(qty) AS total_qty
    FROM raw_products
    GROUP BY product_name
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', product_name,
    'qty', total_qty
  ) ORDER BY total_qty DESC), '[]'::jsonb)
  INTO v_top_products
  FROM grouped_products;

  WITH hours_series AS (
    SELECT generate_series(0, 23) AS hour_val
  ),
  hourly_counts AS (
    SELECT
      EXTRACT(HOUR FROM created_at AT TIME ZONE v_tz) AS order_hour,
      COUNT(id) AS total_orders
    FROM public.orders
    WHERE org_slug = p_org_slug
      AND created_at >= v_since
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'hourRange', to_char(h.hour_val, 'FM00') || ':00 a ' || to_char((h.hour_val + 1) % 24, 'FM00') || ':00',
    'count', COALESCE(c.total_orders, 0)
  ) ORDER BY h.hour_val), '[]'::jsonb)
  INTO v_hourly_distribution
  FROM hours_series h
  LEFT JOIN hourly_counts c ON h.hour_val = c.order_hour;

  v_result := jsonb_build_object(
    'summary', jsonb_build_object(
      'totalRevenue', v_total_revenue,
      'totalExpenses', v_total_expenses,
      'netProfit', (v_total_revenue - v_total_expenses),
      'orderCount', v_order_count,
      'totalTips', v_total_tips
    ),
    'revenueHistory', COALESCE(v_history, '[]'::jsonb),
    'paymentMethods', COALESCE(v_payments, '[]'::jsonb),
    'topExpenses', COALESCE(v_top_expenses, '[]'::jsonb),
    'topProducts', COALESCE(v_top_products, '[]'::jsonb),
    'hourlyDistribution', COALESCE(v_hourly_distribution, '[]'::jsonb)
  );

  RETURN v_result;
END;
$function$;
