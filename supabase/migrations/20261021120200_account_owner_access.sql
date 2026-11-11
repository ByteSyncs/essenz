CREATE OR REPLACE FUNCTION public.owner_account_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.account_id
  FROM public.profiles p
  WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'owner')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_account_owner_of_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = p_org_id
      AND o.account_id IS NOT NULL
      AND o.account_id = public.owner_account_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_account_owner_of_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.slug = p_slug
      AND o.account_id IS NOT NULL
      AND o.account_id = public.owner_account_id()
  )
$$;

REVOKE ALL ON FUNCTION public.owner_account_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_account_owner_of_org(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_account_owner_of_slug(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_account_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_account_owner_of_org(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_account_owner_of_slug(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Account owners manage organizations" ON public.organizations;
CREATE POLICY "Account owners manage organizations"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (public.is_account_owner_of_org(id))
  WITH CHECK (public.is_account_owner_of_org(id));

DROP POLICY IF EXISTS "Account owners manage organization settings" ON public.organization_settings;
CREATE POLICY "Account owners manage organization settings"
  ON public.organization_settings
  FOR ALL
  TO authenticated
  USING (public.is_account_owner_of_org(organization_id))
  WITH CHECK (public.is_account_owner_of_org(organization_id));

DROP POLICY IF EXISTS "Account owners manage products" ON public.products;
CREATE POLICY "Account owners manage products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.is_account_owner_of_org(organization_id))
  WITH CHECK (public.is_account_owner_of_org(organization_id));

DROP POLICY IF EXISTS "Account owners manage categories" ON public.categories;
CREATE POLICY "Account owners manage categories"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.is_account_owner_of_org(organization_id))
  WITH CHECK (public.is_account_owner_of_org(organization_id));

DROP POLICY IF EXISTS "Account owners manage expenses" ON public.expenses;
CREATE POLICY "Account owners manage expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (public.is_account_owner_of_org(organization_id))
  WITH CHECK (public.is_account_owner_of_org(organization_id));

DROP POLICY IF EXISTS "Account owners manage inventory items" ON public.inventory_items;
CREATE POLICY "Account owners manage inventory items"
  ON public.inventory_items
  FOR ALL
  TO authenticated
  USING (public.is_account_owner_of_org(organization_id))
  WITH CHECK (public.is_account_owner_of_org(organization_id));

DROP POLICY IF EXISTS "Account owners manage orders" ON public.orders;
CREATE POLICY "Account owners manage orders"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_account_owner_of_slug(org_slug))
  WITH CHECK (public.is_account_owner_of_slug(org_slug));

DROP POLICY IF EXISTS "Account owners view stock movements" ON public.stock_movements;
CREATE POLICY "Account owners view stock movements"
  ON public.stock_movements
  FOR SELECT
  TO authenticated
  USING (public.is_account_owner_of_org(organization_id));

DROP POLICY IF EXISTS "Account owners view product ingredients" ON public.product_ingredients;
CREATE POLICY "Account owners view product ingredients"
  ON public.product_ingredients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_ingredients.product_id
        AND public.is_account_owner_of_org(p.organization_id)
    )
  );

DROP POLICY IF EXISTS "Account owners view subscription" ON public.subscriptions;
CREATE POLICY "Account owners view subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    (account_id IS NOT NULL AND account_id = public.owner_account_id())
    OR public.is_account_owner_of_org(organization_id)
  );

DO $$
DECLARE
  r record;
  v_col text;
  v_cond text;
BEGIN
  FOR r IN
    SELECT p.tablename::text AS tablename, p.policyname::text AS policyname, p.cmd::text AS cmd
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.permissive = 'RESTRICTIVE'
      AND (p.tablename::text, p.policyname::text) IN (
        ('organizations', 'organizations_owner_update'),
        ('organizations', 'organizations_owner_delete'),
        ('organization_settings', 'organization_settings_owner_insert'),
        ('organization_settings', 'organization_settings_owner_update'),
        ('organization_settings', 'organization_settings_owner_delete'),
        ('expenses', 'expenses_owner_select'),
        ('expenses', 'expenses_owner_insert'),
        ('expenses', 'expenses_owner_update'),
        ('expenses', 'expenses_owner_delete')
      )
  LOOP
    v_col := CASE WHEN r.tablename = 'organizations' THEN 'id' ELSE 'organization_id' END;
    v_cond := format(
      '(EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = (SELECT auth.uid()) AND pr.organization_id = %1$I.%2$I AND pr.role IN (''admin'', ''owner'')) OR public.is_account_owner_of_org(%1$I.%2$I))',
      r.tablename,
      v_col
    );

    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s %s',
      r.policyname,
      r.tablename,
      r.cmd,
      CASE WHEN r.cmd IN ('SELECT', 'UPDATE', 'DELETE') THEN 'USING ' || v_cond ELSE '' END,
      CASE WHEN r.cmd IN ('INSERT', 'UPDATE') THEN 'WITH CHECK ' || v_cond ELSE '' END
    );
  END LOOP;
END;
$$;
