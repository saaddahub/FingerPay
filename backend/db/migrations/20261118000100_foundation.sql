-- migrate:up

-- Private application schema. Owned by the migrator; runtime roles get only what they need.
-- (dbmate may already have created it for fp.schema_migrations.)
CREATE SCHEMA IF NOT EXISTS fp AUTHORIZATION fp_owner;
REVOKE ALL ON SCHEMA fp FROM PUBLIC;
GRANT USAGE ON SCHEMA fp TO fp_app, fp_worker, fp_admin, fp_readonly;

-- No implicit privileges on anything created later; every table grants explicitly in its
-- own migration (append-only tables never get UPDATE/DELETE).
ALTER DEFAULT PRIVILEGES FOR ROLE fp_owner IN SCHEMA fp REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE fp_owner IN SCHEMA fp REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE fp_owner IN SCHEMA fp REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- dbmate keeps its bookkeeping in fp.schema_migrations; /ready reads it.
GRANT SELECT ON TABLE fp.schema_migrations TO fp_app, fp_worker, fp_readonly;

-- Background job queue (pg-boss) lives in its own schema, used only by the worker.
CREATE SCHEMA IF NOT EXISTS pgboss AUTHORIZATION fp_owner;
REVOKE ALL ON SCHEMA pgboss FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA pgboss TO fp_worker;

-- migrate:down

DROP SCHEMA IF EXISTS pgboss CASCADE;
REVOKE SELECT ON TABLE fp.schema_migrations FROM fp_app, fp_worker, fp_readonly;
