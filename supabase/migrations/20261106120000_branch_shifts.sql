CREATE TABLE IF NOT EXISTS public.branch_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  started_by uuid,
  ended_by uuid,
  CONSTRAINT branch_shifts_period_check CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS branch_shifts_one_open_per_branch
  ON public.branch_shifts (organization_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS branch_shifts_branch_started
  ON public.branch_shifts (organization_id, started_at DESC);

ALTER TABLE public.branch_shifts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.branch_shifts TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_branch_shift(p_organization_id uuid)
RETURNS TABLE (shift_id uuid, shift_started_at timestamptz)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.branch_shifts (organization_id, started_at)
  VALUES (
    p_organization_id,
    date_trunc('day', now() AT TIME ZONE 'America/Argentina/Buenos_Aires')
      AT TIME ZONE 'America/Argentina/Buenos_Aires'
  )
  ON CONFLICT (organization_id) WHERE ended_at IS NULL DO NOTHING;

  RETURN QUERY
  SELECT s.id, s.started_at
  FROM public.branch_shifts s
  WHERE s.organization_id = p_organization_id AND s.ended_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_branch_shift(p_organization_id uuid, p_user_id uuid)
RETURNS TABLE (shift_id uuid, shift_started_at timestamptz)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_id uuid;
  v_started timestamptz;
BEGIN
  UPDATE public.branch_shifts
  SET ended_at = GREATEST(v_now, started_at), ended_by = p_user_id
  WHERE organization_id = p_organization_id AND ended_at IS NULL;

  INSERT INTO public.branch_shifts (organization_id, started_at, started_by)
  VALUES (p_organization_id, v_now, p_user_id)
  RETURNING id, started_at INTO v_id, v_started;

  RETURN QUERY SELECT v_id, v_started;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_branch_shift(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_branch_shift(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_branch_shift(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.change_branch_shift(uuid, uuid) TO service_role;
