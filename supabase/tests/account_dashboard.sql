BEGIN;

SET LOCAL TIME ZONE 'UTC';

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'test-owner-x@example.test'),
  ('00000000-0000-4000-8000-0000000000a2', 'test-employee-b@example.test'),
  ('00000000-0000-4000-8000-0000000000a3', 'test-owner-y@example.test');

INSERT INTO public.accounts (id, owner_id, max_branches) VALUES
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 5),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a3', 1);

INSERT INTO public.organizations (id, name, slug, account_id, created_at) VALUES
  ('00000000-0000-4000-8000-0000000000c1', 'Test Branch A', 'test-a', '00000000-0000-4000-8000-0000000000b1', now() - interval '3 days'),
  ('00000000-0000-4000-8000-0000000000c2', 'Test Branch B', 'test-b', '00000000-0000-4000-8000-0000000000b1', now() - interval '2 days'),
  ('00000000-0000-4000-8000-0000000000c3', 'Test Branch C', 'test-c', '00000000-0000-4000-8000-0000000000b2', now() - interval '1 day'),
  ('00000000-0000-4000-8000-0000000000c4', 'Test Branch D', 'test-d', '00000000-0000-4000-8000-0000000000b1', now() - interval '1 hour');

INSERT INTO public.profiles (id, organization_id, account_id, role, client_name) VALUES
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'admin', 'Owner X'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000c2', NULL, 'employee', 'Employee B'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000b2', 'admin', 'Owner Y');

INSERT INTO public.subscriptions (id, organization_id, plan_type, status, current_period_end) VALUES
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000c1', 'business', 'active', now() + interval '20 days');

DO $$
BEGIN
  ASSERT (SELECT account_id FROM public.subscriptions WHERE id = '00000000-0000-4000-8000-0000000000d1')
    = '00000000-0000-4000-8000-0000000000b1',
    'subscription trigger must copy account_id from the organization';

  INSERT INTO public.subscriptions (organization_id, plan_type, status)
  VALUES ('00000000-0000-4000-8000-0000000000c1', 'basic', 'pending_payment')
  ON CONFLICT (organization_id) DO UPDATE SET plan_type = EXCLUDED.plan_type, status = EXCLUDED.status;

  ASSERT (SELECT account_id FROM public.subscriptions WHERE id = '00000000-0000-4000-8000-0000000000d1')
    = '00000000-0000-4000-8000-0000000000b1',
    'the checkout upsert must keep the account link';
  ASSERT (SELECT status FROM public.subscriptions WHERE id = '00000000-0000-4000-8000-0000000000d1')
    = 'pending_payment',
    'the checkout upsert must still update the subscription';

  UPDATE public.subscriptions SET plan_type = 'business', status = 'active', current_period_end = now() + interval '20 days'
  WHERE id = '00000000-0000-4000-8000-0000000000d1';
END;
$$;

CREATE TEMP TABLE test_window AS
SELECT
  (((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - 10)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') AS from_ts;

INSERT INTO public.orders (org_slug, customer_name, status, total_price, tip_amount, created_at)
SELECT 'test-a', 'Cliente 1', 'delivered', 1000, 100, from_ts + interval '2 hours' FROM test_window
UNION ALL SELECT 'test-a', 'Cliente 2', 'delivered', 500, 0, from_ts + interval '1 day 23 hours' FROM test_window
UNION ALL SELECT 'test-a', 'Cliente 3', 'cancelled', 9999, 0, from_ts + interval '3 hours' FROM test_window
UNION ALL SELECT 'test-a', 'Cliente 4', 'delivered', 400, 0, from_ts - interval '10 days' + interval '5 hours' FROM test_window
UNION ALL SELECT 'test-b', 'Cliente 5', 'preparing', 2000, 0, from_ts + interval '5 days' FROM test_window
UNION ALL SELECT 'test-c', 'Ajeno', 'delivered', 777777, 0, from_ts + interval '1 hour' FROM test_window;

INSERT INTO public.expenses (organization_id, description, amount, category, created_at)
SELECT '00000000-0000-4000-8000-0000000000c1'::uuid, 'Gasto actual', 300, 'supplies', from_ts + interval '1 hour' FROM test_window
UNION ALL SELECT '00000000-0000-4000-8000-0000000000c1'::uuid, 'Gasto previo', 100, 'other', from_ts - interval '9 days' FROM test_window
UNION ALL SELECT '00000000-0000-4000-8000-0000000000c2'::uuid, 'Gasto B', 50, 'utilities', from_ts + interval '2 days' FROM test_window;

INSERT INTO public.inventory_items (organization_id, name, unit, stock, stock_min) VALUES
  ('00000000-0000-4000-8000-0000000000c1', 'Leche', 'l', 0, 0),
  ('00000000-0000-4000-8000-0000000000c1', 'Cafe', 'kg', 5, 2),
  ('00000000-0000-4000-8000-0000000000c2', 'Azucar', 'kg', 1, 3);

DO $$
DECLARE
  v_from timestamptz := (SELECT from_ts FROM test_window);
  r jsonb;
  b jsonb;
  v_revenue numeric;
  v_series_revenue numeric;
BEGIN
  r := public.get_account_dashboard(
    '00000000-0000-4000-8000-0000000000b1',
    v_from, v_from + interval '10 days',
    v_from - interval '10 days', v_from
  );

  ASSERT jsonb_array_length(r->'branches') = 3, 'only the account branches are returned, including inactive ones';
  ASSERT NOT (r::text LIKE '%777777%'), 'other accounts must never leak into the result';

  SELECT SUM((x->>'revenue')::numeric) INTO v_revenue FROM jsonb_array_elements(r->'branches') x;
  ASSERT v_revenue = 3500, format('consolidated revenue expected 3500, got %s', v_revenue);

  SELECT x INTO b FROM jsonb_array_elements(r->'branches') x WHERE x->>'slug' = 'test-a';
  ASSERT (b->>'revenue')::numeric = 1500, 'branch A revenue excludes cancelled orders';
  ASSERT (b->>'orders')::int = 2, 'branch A order count';
  ASSERT (b->>'tips')::numeric = 100, 'branch A tips are reported apart';
  ASSERT (b->>'expenses')::numeric = 300, 'branch A expenses';
  ASSERT (b->>'prevRevenue')::numeric = 400, 'branch A previous revenue';
  ASSERT (b->>'prevOrders')::int = 1, 'branch A previous orders';
  ASSERT (b->>'prevExpenses')::numeric = 100, 'branch A previous expenses';

  SELECT x INTO b FROM jsonb_array_elements(r->'branches') x WHERE x->>'slug' = 'test-d';
  ASSERT (b->>'revenue')::numeric = 0 AND (b->>'orders')::int = 0, 'branch without activity appears with zeros';

  ASSERT jsonb_array_length(r->'series') = 10, 'current series has one point per day';
  ASSERT jsonb_array_length(r->'prevSeries') = 10, 'previous series has one point per day';

  SELECT SUM((x->>'revenue')::numeric) INTO v_series_revenue FROM jsonb_array_elements(r->'series') x;
  ASSERT v_series_revenue = v_revenue, 'series total must equal branch total';

  ASSERT ((r->'series'->1)->>'revenue')::numeric = 500,
    'an order at 23:00 Argentina time belongs to its Argentine day, not the next UTC day';
END;
$$;

DO $$
DECLARE
  r jsonb;
BEGIN
  r := public.get_account_activity('00000000-0000-4000-8000-0000000000b1');
  ASSERT (r->'lowStock'->>'total')::int = 2, 'two items at or below minimum stock';
  ASSERT jsonb_array_length(r->'recentOrders') = 5, 'recent orders only from this account';
  ASSERT NOT (r::text LIKE '%Ajeno%'), 'activity must not leak other accounts';
  ASSERT jsonb_array_length(r->'lastOrderAt') = 3, 'last order date is reported for every branch';
END;
$$;

DO $$
DECLARE
  s jsonb;
  d jsonb;
  b jsonb;
BEGIN
  s := public.get_organization_stats('test-a', '30d');
  d := public.get_account_dashboard(
    '00000000-0000-4000-8000-0000000000b1',
    (((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - 29)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'),
    now() + interval '1 day',
    now() - interval '90 days',
    now() - interval '60 days'
  );
  SELECT x INTO b FROM jsonb_array_elements(d->'branches') x WHERE x->>'slug' = 'test-a';
  ASSERT (s->'summary'->>'totalRevenue')::numeric = (b->>'revenue')::numeric,
    'branch stats and consolidated dashboard must agree on revenue';
  ASSERT (s->'summary'->>'orderCount')::int = (b->>'orders')::int,
    'branch stats and consolidated dashboard must agree on order count';
  ASSERT (s->'summary'->>'totalExpenses')::numeric = (b->>'expenses')::numeric,
    'branch stats and consolidated dashboard must agree on expenses';
END;
$$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.orders;
  ASSERT v_count = 5, format('owner X sees the orders of all their branches only, got %s', v_count);

  INSERT INTO public.products (organization_id, name, price)
  VALUES ('00000000-0000-4000-8000-0000000000c2', 'Producto B', 10);

  BEGIN
    INSERT INTO public.products (organization_id, name, price)
    VALUES ('00000000-0000-4000-8000-0000000000c3', 'Producto ajeno', 10);
    RAISE EXCEPTION 'insert into another account must fail';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  UPDATE public.organizations SET tagline = 'ok' WHERE id = '00000000-0000-4000-8000-0000000000c2';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, 'owner can update another branch of their account';

  UPDATE public.organizations SET tagline = 'hack' WHERE id = '00000000-0000-4000-8000-0000000000c3';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'owner cannot update a branch of another account';

  BEGIN
    UPDATE public.profiles SET account_id = '00000000-0000-4000-8000-0000000000b2'
    WHERE id = '00000000-0000-4000-8000-0000000000a1';
    RAISE EXCEPTION 'changing account_id must fail';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.profiles SET role = 'owner' WHERE id = '00000000-0000-4000-8000-0000000000a1';
    RAISE EXCEPTION 'changing role must fail';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.organizations SET account_id = '00000000-0000-4000-8000-0000000000b2'
    WHERE id = '00000000-0000-4000-8000-0000000000c1';
    RAISE EXCEPTION 'changing organization account must fail';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  UPDATE public.profiles SET client_name = 'Owner X editado' WHERE id = '00000000-0000-4000-8000-0000000000a1';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, 'a user can still edit their own name';

  BEGIN
    PERFORM public.get_account_dashboard(
      '00000000-0000-4000-8000-0000000000b1', now() - interval '1 day', now(), now() - interval '2 days', now() - interval '1 day'
    );
    RAISE EXCEPTION 'authenticated must not execute dashboard functions';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    PERFORM public.get_organization_stats('test-c', '7d');
    RAISE EXCEPTION 'authenticated must not execute stats';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    PERFORM public.adjust_inventory_stock('00000000-0000-4000-8000-0000000000c3', gen_random_uuid(), 1, 'restock');
    RAISE EXCEPTION 'authenticated must not adjust stock directly';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.organizations (name, slug) VALUES ('Intruso', 'intruso');
    RAISE EXCEPTION 'users must not create organizations';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a2', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.orders;
  ASSERT v_count = 1, format('employee sees only the orders of their branch, got %s', v_count);

  UPDATE public.organizations SET tagline = 'hack' WHERE id = '00000000-0000-4000-8000-0000000000c1';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'employee cannot update another branch';

  UPDATE public.organizations SET tagline = 'hack' WHERE id = '00000000-0000-4000-8000-0000000000c2';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'employee cannot update their own branch settings';

  BEGIN
    INSERT INTO public.organization_settings (organization_id) VALUES ('00000000-0000-4000-8000-0000000000c2');
    RAISE EXCEPTION 'employee must not insert settings';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

RESET ROLE;

DO $$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  s jsonb;
BEGIN
  INSERT INTO public.orders (org_slug, customer_name, status, total_price, created_at) VALUES
    ('test-d', 'Anoche', 'delivered', 111,
      ((v_today - 1)::timestamp + interval '22 hours') AT TIME ZONE 'America/Argentina/Buenos_Aires'),
    ('test-d', 'Hoy', 'delivered', 222,
      (v_today::timestamp + interval '1 minute') AT TIME ZONE 'America/Argentina/Buenos_Aires');

  s := public.get_organization_stats('test-d', 'today');
  ASSERT (s->'summary'->>'totalRevenue')::numeric = 222,
    'today in branch stats starts at Argentine midnight, not at UTC midnight';
  ASSERT (s->'summary'->>'orderCount')::int = 1, 'only the order placed today is counted';
END;
$$;

ROLLBACK;
