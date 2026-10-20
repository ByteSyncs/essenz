ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS show_menu_images boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS opening_hours text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF to_regprocedure('public.get_organization_stats(text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_organization_stats(text, text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_organization_stats(text, text) TO service_role';
  END IF;
END;
$$;

CREATE POLICY organization_settings_public_read
  ON public.organization_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY organization_settings_owner_update
  ON public.organization_settings
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organization_settings.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organization_settings.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY organization_settings_owner_insert
  ON public.organization_settings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organization_settings.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY organization_settings_owner_delete
  ON public.organization_settings
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organization_settings.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY organizations_owner_update
  ON public.organizations
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organizations.id
        AND profiles.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organizations.id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY organizations_owner_delete
  ON public.organizations
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organizations.id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY expenses_owner_select
  ON public.expenses
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = expenses.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY expenses_owner_insert
  ON public.expenses
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = expenses.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY expenses_owner_update
  ON public.expenses
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = expenses.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = expenses.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY expenses_owner_delete
  ON public.expenses
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = expenses.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY subscriptions_owner_insert
  ON public.subscriptions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = subscriptions.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY subscriptions_owner_update
  ON public.subscriptions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = subscriptions.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = subscriptions.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY subscriptions_owner_delete
  ON public.subscriptions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = subscriptions.organization_id
        AND profiles.role IN ('admin', 'owner')
    )
  );
