UPDATE public.orders AS o
SET payments = (
  SELECT jsonb_agg(
    CASE
      WHEN lower(btrim(p.value->>'method')) IN ('mp', 'mercado pago', 'mercado_pago') THEN
        jsonb_set(p.value, '{method}', to_jsonb('mercadopago'::text))
      ELSE p.value
    END
    ORDER BY p.ordinality
  )
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(o.payments) = 'array' THEN o.payments ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS p(value, ordinality)
)
WHERE jsonb_typeof(o.payments) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(o.payments) = 'array' THEN o.payments ELSE '[]'::jsonb END
    ) AS p(value)
    WHERE lower(btrim(p.value->>'method')) IN ('mp', 'mercado pago', 'mercado_pago')
  );
