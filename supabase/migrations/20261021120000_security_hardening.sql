CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.account_id IS DISTINCT FROM OLD.account_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.username IS DISTINCT FROM OLD.username
  ) THEN
    RAISE EXCEPTION 'profile_protected_columns' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

CREATE OR REPLACE FUNCTION public.guard_organization_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.account_id IS DISTINCT FROM OLD.account_id
    OR NEW.slug IS DISTINCT FROM OLD.slug
    OR NEW.custom_domain IS DISTINCT FROM OLD.custom_domain
  ) THEN
    RAISE EXCEPTION 'organization_protected_columns' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_organization_update ON public.organizations;
CREATE TRIGGER trg_guard_organization_update
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.guard_organization_update();

DROP POLICY IF EXISTS "Auth users can create organizations" ON public.organizations;

DROP POLICY IF EXISTS "Owners can update their own org" ON public.organizations;
CREATE POLICY "Owners can update their own org"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.organization_id = organizations.id
        AND p.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.organization_id = organizations.id
        AND p.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Allow insert for organization members" ON public.organization_settings;
DROP POLICY IF EXISTS "Owners can insert organization settings" ON public.organization_settings;
CREATE POLICY "Owners can insert organization settings"
  ON public.organization_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.organization_id = organization_settings.organization_id
        AND p.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Allow update for organization members" ON public.organization_settings;
DROP POLICY IF EXISTS "Owners can update organization settings" ON public.organization_settings;
CREATE POLICY "Owners can update organization settings"
  ON public.organization_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.organization_id = organization_settings.organization_id
        AND p.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.organization_id = organization_settings.organization_id
        AND p.role IN ('admin', 'owner')
    )
  );

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
        'adjust_inventory_stock',
        'deduct_stock_for_order',
        'create_user_setup',
        'get_organization_stats',
        'process_mp_payment'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END;
$$;
