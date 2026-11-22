-- Email OTP verification for self-service web & Android signup via Resend.
-- Keeps users unconfirmed in auth.users until they enter the 6-digit code from their email.
BEGIN;

CREATE TABLE fp.email_otps (
  email_norm text PRIMARY KEY CHECK (length(email_norm) BETWEEN 3 AND 254),
  code_hash bytea NOT NULL CHECK (octet_length(code_hash) = 32),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fp.email_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fp.email_otps FROM PUBLIC, anon, authenticated, service_role, fp_app;

CREATE FUNCTION fp.api_register_email_otp(p_email text, p_password text, p_code_hash bytea)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user_id uuid;
  v_confirmed boolean := false;
BEGIN
  IF length(v_email) < 3 OR length(v_email) > 254 OR position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'FP400', MESSAGE = 'Enter a valid email address.';
  END IF;
  IF p_code_hash IS NULL OR octet_length(p_code_hash) <> 32 THEN
    RAISE EXCEPTION USING ERRCODE = 'FP400', MESSAGE = 'Invalid verification code digest.';
  END IF;
  IF p_password IS NULL OR length(p_password) < 12 THEN
    RAISE EXCEPTION USING ERRCODE = 'FP400', MESSAGE = 'Use at least 12 characters for your password.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    EXECUTE 'SELECT id, (email_confirmed_at IS NOT NULL) FROM auth.users WHERE lower(email) = $1 LIMIT 1'
      INTO v_user_id, v_confirmed
      USING v_email;

    IF v_user_id IS NOT NULL AND v_confirmed THEN
      RAISE EXCEPTION USING ERRCODE = 'FP409', MESSAGE = 'This email is already registered. Sign in instead.';
    END IF;

    IF v_user_id IS NULL THEN
      v_user_id := extensions.gen_random_uuid();
      EXECUTE $sql$
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, confirmation_token, recovery_token,
          email_change_token_new, email_change, phone_change,
          phone_change_token, email_change_token_current,
          email_change_confirm_status, reauthentication_token,
          raw_app_meta_data, raw_user_meta_data,
          is_sso_user, is_anonymous, created_at, updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
          $2, extensions.crypt($3, extensions.gen_salt('bf', 10)),
          NULL, '', '', '', '', '', '', '', 0, '',
          '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
          false, false, now(), now()
        )
      $sql$ USING v_user_id, v_email, p_password;

      EXECUTE $sql$
        INSERT INTO auth.identities (
          id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
          extensions.gen_random_uuid(), $1, $1::text,
          jsonb_build_object('sub', $1::text, 'email', $2, 'email_verified', false, 'phone_verified', false),
          'email', now(), now(), now()
        )
      $sql$ USING v_user_id, v_email;
    ELSE
      EXECUTE $sql$
        UPDATE auth.users
        SET encrypted_password = extensions.crypt($2, extensions.gen_salt('bf', 10)),
            updated_at = now()
        WHERE id = $1
      $sql$ USING v_user_id, p_password;
    END IF;
  ELSE
    v_user_id := md5(v_email)::uuid;
    INSERT INTO auth.users(id) VALUES (v_user_id) ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO fp.email_otps(email_norm, code_hash, attempts, expires_at, created_at)
  VALUES (v_email, p_code_hash, 0, now() + interval '15 minutes', now())
  ON CONFLICT (email_norm) DO UPDATE
    SET code_hash = EXCLUDED.code_hash,
        attempts = 0,
        expires_at = EXCLUDED.expires_at,
        created_at = EXCLUDED.created_at;

  RETURN v_user_id;
END $$;

CREATE FUNCTION fp.api_verify_email_otp(p_email text, p_code_hash bytea)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_row fp.email_otps%ROWTYPE;
  v_user_id uuid;
BEGIN
  IF length(v_email) < 3 OR p_code_hash IS NULL OR octet_length(p_code_hash) <> 32 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_row
  FROM fp.email_otps
  WHERE email_norm = v_email
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_row.expires_at <= now() OR v_row.attempts >= 5 THEN
    DELETE FROM fp.email_otps WHERE email_norm = v_email;
    RETURN false;
  END IF;

  IF v_row.code_hash <> p_code_hash THEN
    UPDATE fp.email_otps
    SET attempts = attempts + 1
    WHERE email_norm = v_email;
    RETURN false;
  END IF;

  DELETE FROM fp.email_otps WHERE email_norm = v_email;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    EXECUTE $sql$
      UPDATE auth.users
      SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE lower(email) = $1
      RETURNING id
    $sql$ INTO v_user_id USING v_email;

    IF v_user_id IS NOT NULL THEN
      EXECUTE $sql$
        UPDATE auth.identities
        SET identity_data = jsonb_set(identity_data, '{email_verified}', 'true'::jsonb),
            updated_at = now()
        WHERE user_id = $1
      $sql$ USING v_user_id;
    END IF;
  END IF;

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION fp.api_register_email_otp(text, text, bytea), fp.api_verify_email_otp(text, bytea)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fp.api_register_email_otp(text, text, bytea), fp.api_verify_email_otp(text, bytea)
  TO fp_app;

COMMIT;
