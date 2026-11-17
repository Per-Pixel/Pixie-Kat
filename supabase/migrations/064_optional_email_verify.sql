-- Email verification no longer gates sign-in.
-- Auth users created by the API are confirmed so they get a session immediately.
-- profiles.email_verified stays false until the customer opens a lock link
-- or staff marks them verified. That flag only locks the username.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_code TEXT;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_code := public.generate_referral_code();

  -- email_confirmed_at may already be set so the person can sign in.
  -- That is login access, not the optional username lock.
  INSERT INTO public.profiles (id, email, name, referral_code, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_code,
    FALSE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- A verified account keeps the username it already saved.
-- Staff (service role, or an admin editing someone else) can still correct it.
CREATE OR REPLACE FUNCTION public.lock_verified_username()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS DISTINCT FROM OLD.id AND public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.email_verified
     AND OLD.username IS NOT NULL
     AND btrim(OLD.username) <> ''
     AND NEW.username IS DISTINCT FROM OLD.username THEN
    RAISE EXCEPTION 'Your username is locked because your email is verified';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS lock_verified_username ON public.profiles;
CREATE TRIGGER lock_verified_username
  BEFORE UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_verified_username();

REVOKE ALL ON FUNCTION public.lock_verified_username() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lock_verified_username() FROM anon, authenticated;

-- One spelling of a username, ignoring case and surrounding spaces.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(btrim(username)))
  WHERE username IS NOT NULL AND btrim(username) <> '';
