#!/bin/sh
# Local docker only: runs once on first container start (empty volume).
# Applies the same bootstrap an admin runs by hand in staging/production.
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v db_name="$POSTGRES_DB" \
  -v owner_password="$FP_OWNER_PASSWORD" \
  -v app_password="$FP_APP_PASSWORD" \
  -v worker_password="$FP_WORKER_PASSWORD" \
  -v admin_password="$FP_ADMIN_PASSWORD" \
  -v readonly_password="$FP_READONLY_PASSWORD" \
  -f /fp-bootstrap/roles.sql
