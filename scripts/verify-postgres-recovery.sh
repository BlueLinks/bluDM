#!/usr/bin/env sh
set -eu

project_name="${BLUDM_RECOVERY_PROJECT:-bludm-recovery-$$}"
backup_dir="$(mktemp -d "${TMPDIR:-/tmp}/bludm-recovery.XXXXXX")"
backup_file="$backup_dir/bludm-recovery.dump"
postgres_db="${POSTGRES_DB:-bludm}"
postgres_user="${POSTGRES_USER:-bludm}"

compose() {
	docker compose -p "$project_name" "$@"
}

cleanup() {
	status=$?
	if [ "$status" -ne 0 ]; then
		compose logs --no-color || true
	fi
	compose down -v >/dev/null 2>&1 || true
	rm -rf "$backup_dir"
	exit "$status"
}

wait_for_postgres() {
	i=0
	until compose exec -T postgres pg_isready -U "$postgres_user" -d "$postgres_db" >/dev/null 2>&1; do
		i=$((i + 1))
		if [ "$i" -ge 45 ]; then
			echo "Postgres did not become ready in time." >&2
			return 1
		fi
		sleep 2
	done
}

psql_value() {
	compose exec -T postgres psql -U "$postgres_user" -d "$postgres_db" -At "$@"
}

trap cleanup EXIT INT TERM

echo "Starting isolated recovery verification stack: $project_name"
compose up -d postgres
wait_for_postgres

echo "Applying schema readiness checks."
compose run --rm migrate

echo "Writing app-owned sentinel data."
psql_value <<'SQL'
with created_user as (
	insert into users (email, password_hash)
	values ('recovery-drill@example.test', 'recovery-drill-hash')
	returning id
)
insert into campaigns (owner_user_id, name, description)
select id, 'Recovery Drill Campaign', 'Verifies backup and restore automation.'
from created_user;
SQL

before_count="$(psql_value -c "select count(*) from campaigns where name = 'Recovery Drill Campaign';")"
if [ "$before_count" != "1" ]; then
	echo "Expected one recovery campaign before backup, got $before_count." >&2
	exit 1
fi

echo "Creating custom-format Postgres dump."
compose exec -T postgres pg_dump -U "$postgres_user" -d "$postgres_db" -Fc >"$backup_file"
if [ ! -s "$backup_file" ]; then
	echo "Backup dump was not created." >&2
	exit 1
fi

echo "Destroying Postgres volume before restore."
compose down -v

echo "Starting fresh Postgres volume."
compose up -d postgres
wait_for_postgres

echo "Restoring dump into fresh volume."
compose exec -T postgres pg_restore -U "$postgres_user" -d "$postgres_db" --no-owner <"$backup_file"

echo "Re-running schema readiness checks after restore."
compose run --rm migrate

after_count="$(psql_value -c "select count(*) from campaigns where name = 'Recovery Drill Campaign';")"
if [ "$after_count" != "1" ]; then
	echo "Expected one recovery campaign after restore, got $after_count." >&2
	exit 1
fi

owner_count="$(psql_value -c "select count(*) from users where email = 'recovery-drill@example.test';")"
if [ "$owner_count" != "1" ]; then
	echo "Expected one recovery user after restore, got $owner_count." >&2
	exit 1
fi

echo "Postgres backup and restore verification passed."
