#!/bin/sh
set -e

echo "Waiting for Postgres at ${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432} ..."
python - <<'PY'
import os, time, socket, sys
host = os.getenv("POSTGRES_HOST", "postgres")
port = int(os.getenv("POSTGRES_PORT", "5432"))
for i in range(60):
    try:
        with socket.create_connection((host, port), timeout=1):
            print("Postgres is ready")
            sys.exit(0)
    except OSError:
        time.sleep(1)
print("Postgres not reachable after 60s")
sys.exit(1)
PY

python manage.py migrate
exec python manage.py runserver 0.0.0.0:8001
