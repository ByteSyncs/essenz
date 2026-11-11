DO $$
DECLARE
  v_slugs text[] := ARRAY['demo-sucursal-norte', 'demo-sucursal-centro'];
  v_slug text;
  v_organization_id uuid;
  v_session_id uuid;
BEGIN
  FOREACH v_slug IN ARRAY v_slugs LOOP
    SELECT o.id INTO v_organization_id
    FROM public.organizations o
    WHERE o.slug = v_slug;

    IF v_organization_id IS NULL THEN
      RAISE EXCEPTION 'No existe la sucursal indicada: %', v_slug;
    END IF;

    SELECT s.id INTO v_session_id
    FROM public.cash_register_sessions s
    WHERE s.organization_id = v_organization_id
      AND s.closed_at IS NULL;

    IF v_session_id IS NULL THEN
      RAISE EXCEPTION 'La sucursal % necesita una caja abierta para asociar los pagos de prueba', v_slug;
    END IF;

    INSERT INTO public.orders (
      id, org_slug, customer_name, table_number, status, items, total_price,
      payments, discount_amount, discount_reason, tip_amount, change_returned, created_at
    )
    SELECT
      demo.id,
      v_slug,
      demo.customer_name,
      demo.table_number,
      'delivered',
      jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(),
        'name', demo.product_name,
        'qty', 1,
        'price', demo.total_price
      )),
      demo.total_price,
      demo.payments,
      0,
      NULL,
      0,
      0,
      now() - demo.minutes_ago * interval '1 minute'
    FROM (
      VALUES
        (
          CASE v_slug
            WHEN 'demo-sucursal-norte' THEN 'f1020001-1111-4111-8111-111111111101'::uuid
            ELSE 'f1020002-2222-4222-8222-222222222201'::uuid
          END,
          'Demo MP · pago completo',
          'Mostrador',
          'Combo merienda',
          15400::numeric,
          jsonb_build_array(jsonb_build_object('method', 'mercadopago', 'amount', 15400)),
          12::integer
        ),
        (
          CASE v_slug
            WHEN 'demo-sucursal-norte' THEN 'f1020001-1111-4111-8111-111111111102'::uuid
            ELSE 'f1020002-2222-4222-8222-222222222202'::uuid
          END,
          'Demo MP · dividido con efectivo',
          '5',
          'Brunch para compartir',
          15000::numeric,
          jsonb_build_array(
            jsonb_build_object('method', 'mercadopago', 'amount', 10000),
            jsonb_build_object('method', 'cash', 'amount', 5000)
          ),
          8::integer
        ),
        (
          CASE v_slug
            WHEN 'demo-sucursal-norte' THEN 'f1020001-1111-4111-8111-111111111103'::uuid
            ELSE 'f1020002-2222-4222-8222-222222222203'::uuid
          END,
          'Demo MP · dividido con débito',
          '8',
          'Café y pastelería',
          20000::numeric,
          jsonb_build_array(
            jsonb_build_object('method', 'mercadopago', 'amount', 12000),
            jsonb_build_object('method', 'debit', 'amount', 8000)
          ),
          4::integer
        )
    ) AS demo(id, customer_name, table_number, product_name, total_price, payments, minutes_ago)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.orders existing
      WHERE existing.id = demo.id
    );
  END LOOP;
END;
$$;
