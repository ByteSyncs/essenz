ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS uses_cash boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cash_register_session_id uuid
    REFERENCES public.cash_register_sessions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS expenses_cash_register_session
  ON public.expenses (cash_register_session_id)
  WHERE uses_cash = true;

CREATE OR REPLACE FUNCTION public.assign_cash_register_session_to_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  IF NOT NEW.uses_cash THEN
    NEW.cash_register_session_id := NULL;
    RETURN NEW;
  END IF;

  SELECT s.id INTO v_session_id
  FROM public.cash_register_sessions s
  WHERE s.organization_id = NEW.organization_id AND s.closed_at IS NULL
  FOR SHARE;

  IF v_session_id IS NOT NULL THEN
    NEW.cash_register_session_id := v_session_id;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cash_register_sessions s
    WHERE s.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'cash_register_closed' USING ERRCODE = 'P0001';
  END IF;

  NEW.cash_register_session_id := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expenses_assign_cash_register_session ON public.expenses;
CREATE TRIGGER expenses_assign_cash_register_session
  BEFORE INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_cash_register_session_to_expense();

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
  ),
  expense_totals AS (
    SELECT COALESCE(SUM(e.amount), 0)::numeric AS cash_expenses
    FROM public.expenses e
    WHERE e.cash_register_session_id = p_session_id
      AND e.uses_cash = true
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
    'cashExpenses', round(e.cash_expenses, 2),
    'movements', jsonb_build_object(
      'cashIn', round(m.cash_in, 2),
      'cashOut', round(m.cash_out, 2),
      'safeDrop', round(m.safe_drop, 2)
    ),
    'cashExpected',
      round(s.opening_amount + p.cash_sales + m.cash_in - m.cash_out - m.safe_drop - e.cash_expenses, 2)
  )
  FROM register_session s
  CROSS JOIN order_totals o
  CROSS JOIN cash_tip_ambiguity t
  CROSS JOIN payment_totals p
  CROSS JOIN movement_totals m
  CROSS JOIN expense_totals e;
$$;

REVOKE ALL ON FUNCTION public.assign_cash_register_session_to_expense() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cash_register_summary(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cash_register_summary(uuid) TO service_role;
