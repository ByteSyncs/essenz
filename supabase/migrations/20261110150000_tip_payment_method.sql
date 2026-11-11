ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tip_payment_method text,
  ADD COLUMN IF NOT EXISTS tip_included_in_payments boolean NOT NULL DEFAULT true;

ALTER TABLE public.orders
  ALTER COLUMN tip_payment_method SET DEFAULT 'cash';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_tip_payment_method_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_tip_payment_method_check
      CHECK (
        tip_payment_method IS NULL
        OR tip_payment_method IN ('cash', 'debit', 'credit', 'mercadopago', 'virtual')
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cash_register_summary(p_session_id uuid)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH register_session AS (
    SELECT s.id, s.opening_amount
    FROM public.cash_register_sessions s
    WHERE s.id = p_session_id
  ),
  session_orders AS (
    SELECT o.id, o.status, o.total_price,
      COALESCE(o.discount_amount, 0)::numeric AS discount_amount,
      COALESCE(o.tip_amount, 0)::numeric AS tip_amount,
      o.tip_payment_method,
      o.tip_included_in_payments,
      COALESCE(o.payments::jsonb, '[]'::jsonb) AS payments
    FROM public.orders o
    WHERE o.cash_register_session_id = p_session_id
  ),
  order_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE o.status <> 'cancelled') AS ticket_count,
      COUNT(*) FILTER (WHERE o.status = 'cancelled') AS cancelled_ticket_count,
      COALESCE(SUM(o.total_price) FILTER (WHERE o.status <> 'cancelled'), 0)::numeric AS net_sales,
      COALESCE(SUM(o.total_price + o.discount_amount)
        FILTER (WHERE o.status <> 'cancelled'), 0)::numeric AS gross_sales,
      COALESCE(SUM(o.discount_amount) FILTER (WHERE o.status <> 'cancelled'), 0)::numeric AS discounts,
      COALESCE(SUM(o.tip_amount) FILTER (WHERE o.status <> 'cancelled'), 0)::numeric AS tips
    FROM session_orders o
  ),
  cash_tip_ambiguity AS (
    SELECT COALESCE(SUM(o.tip_amount) FILTER (
      WHERE o.status <> 'cancelled'
        AND o.tip_included_in_payments
        AND o.tip_payment_method IS NULL
        AND jsonb_array_length(
          CASE WHEN jsonb_typeof(o.payments) = 'array' THEN o.payments ELSE '[]'::jsonb END
        ) > 1
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(o.payments) = 'array' THEN o.payments ELSE '[]'::jsonb END
          ) AS payment(value)
          WHERE payment.value->>'method' = 'cash'
        )
    ), 0)::numeric AS amount
    FROM session_orders o
  ),
  payment_rows AS (
    SELECT o.id AS order_id,
      COALESCE(NULLIF(p.value->>'method', ''), 'other') AS method,
      CASE
        WHEN COALESCE(p.value->>'amount', '') ~ '^[0-9]+([.][0-9]{1,2})?$'
          THEN (p.value->>'amount')::numeric
        ELSE 0
      END AS amount
    FROM session_orders o
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(o.payments) = 'array' THEN o.payments ELSE '[]'::jsonb END
    ) AS p(value)
    WHERE o.status <> 'cancelled'

    UNION ALL

    SELECT o.id,
      COALESCE(
        o.tip_payment_method,
        CASE WHEN o.tip_included_in_payments THEN o.payments->0->>'method' END,
        'cash'
      ),
      o.tip_amount
    FROM session_orders o
    WHERE o.status <> 'cancelled'
      AND o.tip_amount > 0
      AND (
        NOT o.tip_included_in_payments
        OR jsonb_array_length(
          CASE WHEN jsonb_typeof(o.payments) = 'array' THEN o.payments ELSE '[]'::jsonb END
        ) = 1
      )
  ),
  payment_totals AS (
    SELECT
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'method', m.method,
          'amount', round(m.amount, 2),
          'tickets', m.tickets
        )
        ORDER BY m.method
      ), '[]'::jsonb) AS payment_methods,
      COALESCE(SUM(m.amount) FILTER (WHERE m.method = 'cash'), 0)::numeric AS cash_sales
    FROM (
      SELECT p.method, SUM(p.amount) AS amount, COUNT(DISTINCT p.order_id) AS tickets
      FROM payment_rows p
      GROUP BY p.method
    ) m
  ),
  movement_totals AS (
    SELECT
      COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'cash_in'), 0)::numeric AS cash_in,
      COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'cash_out'), 0)::numeric AS cash_out,
      COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'safe_drop'), 0)::numeric AS safe_drop
    FROM public.cash_register_movements m
    WHERE m.session_id = p_session_id AND m.voided_at IS NULL
  )
  SELECT jsonb_build_object(
    'ticketCount', o.ticket_count,
    'cancelledTicketCount', o.cancelled_ticket_count,
    'grossSales', round(o.gross_sales, 2),
    'discounts', round(o.discounts, 2),
    'netSales', round(o.net_sales, 2),
    'tips', round(o.tips, 2),
    'cashTipAmbiguity', round(t.amount, 2),
    'paymentMethods', p.payment_methods,
    'movements', jsonb_build_object(
      'cashIn', round(m.cash_in, 2),
      'cashOut', round(m.cash_out, 2),
      'safeDrop', round(m.safe_drop, 2)
    ),
    'cashExpected', round(s.opening_amount + p.cash_sales + m.cash_in - m.cash_out - m.safe_drop, 2)
  )
  FROM register_session s
  CROSS JOIN order_totals o
  CROSS JOIN cash_tip_ambiguity t
  CROSS JOIN payment_totals p
  CROSS JOIN movement_totals m;
$$;

REVOKE ALL ON FUNCTION public.cash_register_summary(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cash_register_summary(uuid) TO service_role;

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
    FROM public.orders o,
    LATERAL jsonb_array_elements(o.payments) AS p
    WHERE o.org_slug = p_org_slug
      AND o.status != 'cancelled'
      AND o.created_at >= v_since

    UNION ALL

    SELECT
      COALESCE(
        o.tip_payment_method,
        CASE WHEN o.tip_included_in_payments THEN o.payments->0->>'method' END,
        'cash'
      ),
      o.tip_amount
    FROM public.orders o
    WHERE o.org_slug = p_org_slug
      AND o.status != 'cancelled'
      AND o.created_at >= v_since
      AND o.tip_amount > 0
      AND (
        NOT o.tip_included_in_payments
        OR jsonb_array_length(o.payments) = 1
      )
  ),
  grouped_payments AS (
    SELECT payment_method, SUM(amount) AS total_amount
    FROM flattened_payments
    GROUP BY 1
  ),
  total_payments AS (
    SELECT SUM(total_amount) AS grand_total FROM grouped_payments
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', CASE payment_method
      WHEN 'cash' THEN 'Efectivo'
      WHEN 'debit' THEN 'Débito'
      WHEN 'credit' THEN 'Crédito'
      WHEN 'mercadopago' THEN 'Mercado Pago'
      WHEN 'mp' THEN 'Mercado Pago'
      WHEN 'virtual' THEN 'Virtual'
      ELSE INITCAP(payment_method)
    END,
    'value', CASE WHEN grand_total > 0 THEN ROUND((total_amount / grand_total) * 100) ELSE 0 END,
    'color', CASE
      WHEN payment_method = 'cash' THEN 'var(--clr-accent)'
      WHEN payment_method IN ('virtual', 'mercadopago', 'mp') THEN 'var(--clr-accent-light)'
      WHEN payment_method IN ('debit', 'credit') THEN 'var(--clr-ink)'
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
