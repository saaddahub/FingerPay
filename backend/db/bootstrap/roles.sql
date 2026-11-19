-- FingerPay cluster bootstrap: run ONCE per environment by a database admin (superuser or
-- a role with CREATEROLE), BEFORE any migration. Roles are cluster-level objects, so they
-- live here and not in dbmate migrations. Idempotent.
--
-- Usage:
--   psql "$ADMIN_URL" -v ON_ERROR_STOP=1 \
--     -v db_name=fingerpay \
--     -v owner_password=... -v app_password=... -v worker_password=... \
--     -v admin_password=... -v readonly_password=... \
--     -f backend/db/bootstrap/roles.sql
--
-- Production: passwords come from a password manager (>= 32 random chars), never from git.

\set ON_ERROR_STOP on

-- 1. Roles (created NOLOGIN, then given LOGIN below so re-runs rotate passwords).
SELECT format('CREATE ROLE %I NOLOGIN', r)
FROM unnest(ARRAY['fp_owner', 'fp_app', 'fp_worker', 'fp_admin', 'fp_readonly']) AS r
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r)
\gexec

ALTER ROLE fp_owner    WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'owner_password';
ALTER ROLE fp_app      WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'app_password';
ALTER ROLE fp_worker   WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'worker_password';
ALTER ROLE fp_admin    WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'admin_password';
ALTER ROLE fp_readonly WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'readonly_password';

-- 2. Per-role session guards (SPEC 4.2): the API must never hold locks or run long.
ALTER ROLE fp_app SET statement_timeout = '5s';
ALTER ROLE fp_app SET lock_timeout = '3s';
ALTER ROLE fp_app SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE fp_worker SET statement_timeout = '60s';
ALTER ROLE fp_worker SET lock_timeout = '5s';
ALTER ROLE fp_worker SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE fp_readonly SET default_transaction_read_only = on;
ALTER ROLE fp_readonly SET statement_timeout = '30s';

-- Every FingerPay timestamp is UTC; "today" is computed explicitly in Asia/Karachi.
ALTER ROLE fp_owner SET timezone = 'UTC';
ALTER ROLE fp_app SET timezone = 'UTC';
ALTER ROLE fp_worker SET timezone = 'UTC';
ALTER ROLE fp_admin SET timezone = 'UTC';
ALTER ROLE fp_readonly SET timezone = 'UTC';

-- 3. Database ownership and connect rights.
ALTER DATABASE :"db_name" OWNER TO fp_owner;
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"db_name" TO fp_owner;
GRANT CONNECT ON DATABASE :"db_name" TO fp_app, fp_worker, fp_admin, fp_readonly;

-- 4. Nobody gets the public schema implicitly.
\connect :"db_name"
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO fp_owner;
