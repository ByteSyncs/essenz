DO $$
DECLARE
  v_account_id uuid;
  v_existing integer;
  v_branch record;
  v_org_id uuid;
BEGIN
  SELECT a.id INTO v_account_id
  FROM public.accounts a
  ORDER BY a.created_at
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'No account found';
  END IF;

  SELECT count(*) INTO v_existing FROM public.organizations WHERE account_id = v_account_id;

  IF v_existing + 2 > 5 THEN
    RAISE EXCEPTION 'The account would exceed 5 branches';
  END IF;

  FOR v_branch IN
    SELECT * FROM (VALUES
      ('Demo Sucursal Centro', 'demo-sucursal-centro', 1.0),
      ('Demo Sucursal Norte', 'demo-sucursal-norte', 0.55)
    ) AS t(name, slug, factor)
  LOOP
    INSERT INTO public.organizations (name, slug, account_id, theme)
    VALUES (v_branch.name, v_branch.slug, v_account_id, 'minimalist')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO v_org_id;

    IF v_org_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.organization_settings (organization_id, menu_active)
    VALUES (v_org_id, v_branch.slug <> 'demo-sucursal-norte')
    ON CONFLICT (organization_id) DO NOTHING;

    INSERT INTO public.orders (org_slug, customer_name, status, items, total_price, payments, tip_amount, created_at)
    SELECT
      v_branch.slug,
      'Cliente demo ' || g,
      CASE WHEN g % 17 = 0 THEN 'cancelled' ELSE 'delivered' END,
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Cafe demo', 'price', 3500, 'qty', 1 + g % 3)),
      (3500 * (1 + g % 3))::numeric,
      jsonb_build_array(jsonb_build_object('method', CASE WHEN g % 2 = 0 THEN 'cash' ELSE 'virtual' END, 'amount', (3500 * (1 + g % 3))::numeric)),
      0,
      now() - make_interval(hours => (g * 7) % (24 * 62))
    FROM generate_series(1, (140 * v_branch.factor)::integer) AS g;

    INSERT INTO public.expenses (organization_id, description, amount, category, created_at)
    SELECT
      v_org_id,
      'Gasto demo ' || g,
      (8000 + g * 1300)::numeric,
      (ARRAY['supplies', 'maintenance', 'utilities', 'staff', 'other'])[1 + g % 5],
      now() - make_interval(days => (g * 5) % 60)
    FROM generate_series(1, 12) AS g;

    INSERT INTO public.inventory_items (organization_id, name, unit, stock, stock_min)
    VALUES
      (v_org_id, 'Leche demo', 'l', 2, 6),
      (v_org_id, 'Cafe demo', 'kg', 12, 3);
  END LOOP;
END;
$$;
