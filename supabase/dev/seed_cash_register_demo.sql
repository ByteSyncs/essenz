DO $$
DECLARE
  v_slugs text[] := ARRAY['demo-sucursal-norte', 'demo-sucursal-centro'];
  v_slug text;
  v_organization_id uuid;
  v_closed_session_id uuid;
  v_open_session_id uuid;
BEGIN
  FOREACH v_slug IN ARRAY v_slugs LOOP
  SELECT o.id INTO v_organization_id
  FROM public.organizations o
  WHERE o.slug = v_slug;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'No existe la sucursal indicada: %', v_slug;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cash_register_sessions s
    WHERE s.organization_id = v_organization_id AND s.closed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'La sucursal ya tiene una caja abierta; cerrala antes de cargar estos datos de prueba';
  END IF;

  INSERT INTO public.cash_register_sessions (
    organization_id, opened_at, opening_amount, opened_by_name, opening_note
  )
  VALUES (
    v_organization_id,
    now() - interval '7 hours',
    20000,
    'Turno de prueba',
    'Fondo inicial del cierre de demostración'
  )
  RETURNING id INTO v_closed_session_id;

  INSERT INTO public.orders (
    org_slug, customer_name, table_number, status, items, total_price, payments,
    discount_amount, discount_reason, tip_amount, change_returned, created_at
  )
  VALUES
    (
      v_slug, 'Mesa 4', '4', 'delivered',
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Café y tostado', 'qty', 2, 'price', 10000)),
      18000, jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 18000)),
      2000, 'clients', 800, 0, now() - interval '6 hours 20 minutes'
    ),
    (
      v_slug, 'Mesa 7', '7', 'delivered',
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Brunch', 'qty', 1, 'price', 22500)),
      22500, jsonb_build_array(jsonb_build_object('method', 'debit', 'amount', 22500)),
      0, NULL, 0, 0, now() - interval '5 hours 40 minutes'
    ),
    (
      v_slug, 'Mostrador', NULL, 'delivered',
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Pastelería', 'qty', 1, 'price', 12000)),
      12000, jsonb_build_array(jsonb_build_object('method', 'credit', 'amount', 12000)),
      0, NULL, 0, 0, now() - interval '4 hours 50 minutes'
    ),
    (
      v_slug, 'Retiro', NULL, 'delivered',
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Café frío', 'qty', 2, 'price', 4750)),
      9500, jsonb_build_array(jsonb_build_object('method', 'virtual', 'amount', 9500)),
      0, NULL, 0, 0, now() - interval '4 hours 10 minutes'
    ),
    (
      v_slug, 'Mesa 2', '2', 'delivered',
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Almuerzo', 'qty', 1, 'price', 12000)),
      12000,
      jsonb_build_array(
        jsonb_build_object('method', 'cash', 'amount', 5000),
        jsonb_build_object('method', 'debit', 'amount', 7000)
      ),
      0, NULL, 0, 0, now() - interval '3 hours 25 minutes'
    );

  INSERT INTO public.cash_register_movements (
    organization_id, session_id, movement_type, amount, description, created_at
  )
  VALUES
    (v_organization_id, v_closed_session_id, 'cash_in', 4000, 'Reposición de cambio', now() - interval '3 hours'),
    (v_organization_id, v_closed_session_id, 'cash_out', 2000, 'Compra urgente de hielo', now() - interval '2 hours 30 minutes'),
    (v_organization_id, v_closed_session_id, 'safe_drop', 3000, 'Retiro a caja fuerte', now() - interval '2 hours');

  PERFORM public.close_cash_register(
    v_closed_session_id,
    v_organization_id,
    NULL,
    'Cierre de prueba',
    41900,
    'Diferencia de conteo de demostración',
    'Cierre histórico de prueba para revisar el historial'
  );

  INSERT INTO public.cash_register_sessions (
    organization_id, opened_at, opening_amount, opened_by_name, opening_note
  )
  VALUES (
    v_organization_id,
    now() - interval '2 hours',
    30000,
    'Turno actual',
    'Fondo inicial para probar el arqueo'
  )
  RETURNING id INTO v_open_session_id;

  INSERT INTO public.orders (
    org_slug, customer_name, table_number, status, items, total_price, payments,
    discount_amount, discount_reason, tip_amount, change_returned, created_at
  )
  VALUES
    (
      v_slug, 'Mesa 3', '3', 'delivered',
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Café y tostado', 'qty', 2, 'price', 10000)),
      18000, jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 18000)),
      2000, 'clients', 800, 0, now() - interval '1 hour 20 minutes'
    ),
    (
      v_slug, 'Mesa 8', '8', 'preparing',
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Brunch', 'qty', 1, 'price', 22500)),
      22500, jsonb_build_array(jsonb_build_object('method', 'debit', 'amount', 22500)),
      0, NULL, 0, 0, now() - interval '55 minutes'
    ),
    (
      v_slug, 'Mostrador', NULL, 'delivered',
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Pastelería', 'qty', 1, 'price', 12000)),
      12000, jsonb_build_array(jsonb_build_object('method', 'credit', 'amount', 12000)),
      0, NULL, 0, 0, now() - interval '35 minutes'
    ),
    (
      v_slug, 'Retiro', NULL, 'delivered',
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Café frío', 'qty', 2, 'price', 4750)),
      9500, jsonb_build_array(jsonb_build_object('method', 'virtual', 'amount', 9500)),
      0, NULL, 0, 0, now() - interval '20 minutes'
    ),
    (
      v_slug, 'Mesa 2', '2', 'delivered',
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Almuerzo', 'qty', 1, 'price', 12000)),
      12000,
      jsonb_build_array(
        jsonb_build_object('method', 'cash', 'amount', 5000),
        jsonb_build_object('method', 'debit', 'amount', 7800)
      ),
      0, NULL, 800, 0, now() - interval '8 minutes'
    );

  INSERT INTO public.cash_register_movements (
    organization_id, session_id, movement_type, amount, description, created_at
  )
  VALUES
    (v_organization_id, v_open_session_id, 'cash_in', 4000, 'Reposición de cambio', now() - interval '45 minutes'),
    (v_organization_id, v_open_session_id, 'cash_out', 1500, 'Compra de insumos', now() - interval '30 minutes'),
    (v_organization_id, v_open_session_id, 'safe_drop', 6000, 'Retiro a caja fuerte', now() - interval '15 minutes');
  END LOOP;
END;
$$;
