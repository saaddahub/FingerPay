// The app's only database connection: role fp_app, which may EXECUTE fp.api_* and nothing else
// (SPEC §4.2). Through Supavisor's transaction pooler, so no prepared statements.
import postgres, { type Sql } from "postgres";
import { env } from "./env.ts";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function sslFor(databaseUrl: string, ca: string | undefined): false | { ca: string; rejectUnauthorized: true } {
  if (LOCAL_HOSTS.has(new URL(databaseUrl).hostname)) return false;
  if (!ca) throw new Error("FP_DATABASE_CA is required for a non-local database (TLS verify-full)");
  return { ca, rejectUnauthorized: true };  // Node also checks the hostname against the certificate
}

let sql: Sql | undefined;

export function db(): Sql {
  if (sql) return sql;
  const e = env();
  sql = postgres(e.databaseUrl, {
    ssl: sslFor(e.databaseUrl, e.databaseCa),
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { application_name: "fingerpay-web" },
  });
  return sql;
}
