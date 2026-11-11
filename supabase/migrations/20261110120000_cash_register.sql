CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  opened_by uuid,
  opened_by_name text,
  opening_amount numeric(12, 2) NOT NULL CHECK (opening_amount >= 0),
  opening_note text,
  closed_at timestamptz,
  closed_by uuid,
  closed_by_name text,
  cash_expected numeric(12, 2),
  cash_counted numeric(12, 2),
  difference numeric(12, 2),
  difference_reason text,
  closing_note text,
  summary_snapshot jsonb,
  CONSTRAINT cash_register_sessions_name_length CHECK (
    (opened_by_name IS NULL OR char_length(opened_by_name) <= 80)
    AND (closed_by_name IS NULL OR char_length(closed_by_name) <= 80)
  ),
  CONSTRAINT cash_register_sessions_notes_length CHECK (
    (opening_note IS NULL OR char_length(opening_note) <= 500)
    AND (difference_reason IS NULL OR char_length(difference_reason) <= 300)
    AND (closing_note IS NULL OR char_length(closing_note) <= 500)
  ),
  CONSTRAINT cash_register_sessions_close_state CHECK (
    (closed_at IS NULL AND cash_expected IS NULL AND cash_counted IS NULL
      AND difference IS NULL AND summary_snapshot IS NULL)
    OR
    (closed_at IS NOT NULL AND cash_expected IS NOT NULL AND cash_counted IS NOT NULL
      AND difference IS NOT NULL AND summary_snapshot IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS cash_register_sessions_one_open_per_branch
  ON public.cash_register_sessions (organization_id)
  WHERE closed_at IS NULL;

CREATE INDEX IF NOT EXISTS cash_register_sessions_branch_opened
  ON public.cash_register_sessions (organization_id, opened_at DESC);

CREATE TABLE IF NOT EXISTS public.cash_register_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.cash_register_sessions (id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('cash_in', 'cash_out', 'safe_drop')),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 120),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_by_name text CHECK (created_by_name IS NULL OR char_length(created_by_name) <= 80)
);

CREATE INDEX IF NOT EXISTS cash_register_movements_session_created
  ON public.cash_register_movements (session_id, created_at DESC);

ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cash_register_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cash_register_movements FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.cash_register_sessions TO service_role;
GRANT ALL ON TABLE public.cash_register_movements TO service_role;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cash_register_session_id uuid
  REFERENCES public.cash_register_sessions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_cash_register_session_created
  ON public.orders (cash_register_session_id, created_at);

CREATE OR REPLACE FUNCTION public.assign_cash_register_session_to_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_organization_id uuid;
  v_session_id uuid;
BEGIN
  SELECT o.id INTO v_organization_id
  FROM public.organizations o
  WHERE o.slug = NEW.org_slug;

  IF v_organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.id INTO v_session_id
  FROM public.cash_register_sessions s
  WHERE s.organization_id = v_organization_id AND s.closed_at IS NULL
  FOR SHARE;

  IF v_session_id IS NOT NULL THEN
    NEW.cash_register_session_id := v_session_id;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cash_register_sessions s
    WHERE s.organization_id = v_organization_id
  ) THEN
    RAISE EXCEPTION 'cash_register_closed' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_assign_cash_register_session ON public.orders;
CREATE TRIGGER orders_assign_cash_register_session
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_cash_register_session_to_order();

CREATE OR REPLACE FUNCTION public.guard_cash_register_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_closed_at timestamptz;
BEGIN
  SELECT s.closed_at INTO v_closed_at
  FROM public.cash_register_sessions s
  WHERE s.id = NEW.session_id AND s.organization_id = NEW.organization_id
  FOR SHARE;

  IF NOT FOUND OR v_closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'cash_register_not_open' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cash_register_movements_require_open_session ON public.cash_register_movements;
CREATE TRIGGER cash_register_movements_require_open_session
  BEFORE INSERT ON public.cash_register_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_cash_register_movement();

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
    WHERE m.session_id = p_session_id
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

CREATE OR REPLACE FUNCTION public.close_cash_register(
  p_session_id uuid,
  p_organization_id uuid,
  p_closed_by uuid,
  p_closed_by_name text,
  p_cash_counted numeric,
  p_difference_reason text,
  p_closing_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.cash_register_sessions%ROWTYPE;
  v_summary jsonb;
  v_cash_expected numeric(12, 2);
  v_difference numeric(12, 2);
  v_closed_at timestamptz;
BEGIN
  SELECT * INTO v_session
  FROM public.cash_register_sessions s
  WHERE s.id = p_session_id AND s.organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cash_register_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_session.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'cash_register_already_closed' USING ERRCODE = 'P0001';
  END IF;

  v_closed_at := clock_timestamp();

  IF p_cash_counted IS NULL OR p_cash_counted < 0 OR p_cash_counted > 100000000 THEN
    RAISE EXCEPTION 'invalid_cash_counted' USING ERRCODE = '22023';
  END IF;

  v_summary := public.cash_register_summary(p_session_id);
  IF v_summary IS NULL THEN
    RAISE EXCEPTION 'cash_register_not_found' USING ERRCODE = 'P0001';
  END IF;

  v_cash_expected := (v_summary->>'cashExpected')::numeric;
  v_difference := round(p_cash_counted - v_cash_expected, 2);

  IF v_difference <> 0 AND NULLIF(btrim(p_difference_reason), '') IS NULL THEN
    RAISE EXCEPTION 'cash_difference_reason_required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.cash_register_sessions
  SET closed_at = v_closed_at,
      closed_by = p_closed_by,
      closed_by_name = NULLIF(btrim(p_closed_by_name), ''),
      cash_expected = v_cash_expected,
      cash_counted = round(p_cash_counted, 2),
      difference = v_difference,
      difference_reason = NULLIF(btrim(p_difference_reason), ''),
      closing_note = NULLIF(btrim(p_closing_note), ''),
      summary_snapshot = v_summary
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'sessionId', p_session_id,
    'closedAt', v_closed_at,
    'cashExpected', v_cash_expected,
    'cashCounted', round(p_cash_counted, 2),
    'difference', v_difference,
    'summary', v_summary
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_cash_register_session_to_order() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_cash_register_movement() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cash_register_summary(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_cash_register(uuid, uuid, uuid, text, numeric, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cash_register_summary(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_cash_register(uuid, uuid, uuid, text, numeric, text, text)
  TO service_role;
