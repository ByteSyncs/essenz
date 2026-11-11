UPDATE public.subscriptions s
SET account_id = o.account_id
FROM public.organizations o
WHERE o.id = s.organization_id
  AND s.account_id IS NULL
  AND o.account_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_subscription_account()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.account_id IS NULL THEN
    SELECT o.account_id
    INTO NEW.account_id
    FROM public.organizations o
    WHERE o.id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_account ON public.subscriptions;
CREATE TRIGGER trg_subscription_account
  BEFORE INSERT OR UPDATE OF organization_id, account_id ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_account();
