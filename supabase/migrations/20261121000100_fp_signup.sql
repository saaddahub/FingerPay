-- Self-service demo accounts are separate from bank-verified customers and terminal staff.
BEGIN;
CREATE TABLE fp.signup_profiles (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  account_type text NOT NULL CHECK (account_type IN ('customer', 'merchant')),
  details_enc bytea NOT NULL CHECK (octet_length(details_enc) BETWEEN 32 AND 8192 AND get_byte(details_enc, 0) = 1),
  consent_version text NOT NULL DEFAULT 'demo-v1' CHECK (consent_version = 'demo-v1'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE fp.demo_signup_credits (
  auth_user_id uuid PRIMARY KEY REFERENCES fp.signup_profiles ON DELETE RESTRICT,
  amount_paisa integer NOT NULL DEFAULT 20000 CHECK (amount_paisa = 20000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fp.signup_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fp.demo_signup_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fp.signup_profiles, fp.demo_signup_credits FROM PUBLIC, anon, authenticated, service_role, fp_app;
CREATE TRIGGER demo_signup_credits_append_only BEFORE UPDATE OR DELETE ON fp.demo_signup_credits
  FOR EACH ROW EXECUTE FUNCTION fp.forbid_mutation();
CREATE TRIGGER demo_signup_credits_no_truncate BEFORE TRUNCATE ON fp.demo_signup_credits
  FOR EACH STATEMENT EXECUTE FUNCTION fp.forbid_mutation();

CREATE FUNCTION fp.api_complete_signup(p_user uuid, p_type text, p_details bytea)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_type IS NULL OR p_type NOT IN ('customer', 'merchant') THEN
    RAISE EXCEPTION USING ERRCODE = 'FP400', MESSAGE = 'Choose customer or merchant.';
  END IF;
  -- The primary key serializes retries and concurrent submissions; profile and credit commit together.
  INSERT INTO fp.signup_profiles(auth_user_id, account_type, details_enc)
    VALUES (p_user, p_type, p_details) ON CONFLICT (auth_user_id) DO NOTHING;
  IF (SELECT account_type FROM fp.signup_profiles WHERE auth_user_id = p_user) <> p_type THEN
    RAISE EXCEPTION USING ERRCODE = 'FP409', MESSAGE = 'This account already has a different account type.';
  END IF;
  INSERT INTO fp.demo_signup_credits(auth_user_id) VALUES (p_user) ON CONFLICT DO NOTHING;
END $$;

CREATE FUNCTION fp.api_signup_wallet(p_user uuid)
RETURNS TABLE (details_enc bytea, balance text, credited_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.details_enc, (c.amount_paisa / 100.0)::numeric(12,2)::text, c.created_at
  FROM fp.signup_profiles p JOIN fp.demo_signup_credits c USING (auth_user_id)
  WHERE p.auth_user_id = p_user;
$$;
REVOKE ALL ON FUNCTION fp.api_complete_signup(uuid, text, bytea), fp.api_signup_wallet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fp.api_complete_signup(uuid, text, bytea), fp.api_signup_wallet(uuid) TO fp_app;
COMMIT;
