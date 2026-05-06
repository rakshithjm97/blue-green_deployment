"""
Import legacy SQLite export (iivms_data_1.db) into PostgreSQL `daily_activity`.

Maps Excel-style column names to the Flask `DailyActivity` model (see backend/app.py).

Usage (from repo root, Postgres reachable per backend env / docker-compose):

  cd ivms3
  python etl/sqlite_ivms_to_postgres.py --sqlite etl/data/iivms_data_1.db

Optional: clear existing old-data rows first

  python etl/sqlite_ivms_to_postgres.py --truncate

pgAdmin (host stack from docker-compose): Host localhost | Port 5432 |
  User postgres | Password password | Database postgres → Table daily_activity.
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import text

from app import DailyActivity, app, db  # noqa: E402


def ensure_daily_activity_orm_columns() -> None:
    """
    Flask `DailyActivity` expects columns that older `create_tables.sql` may omit
    (`name`, `activity_date`, `less_worked_hours`). Safe to run repeatedly.

    Legacy `create_tables.sql` also has NOT NULL `date` while the ORM only maps
    `activity_date`; relax the constraint so ORM inserts succeed, then backfill.
    """
    stmts = [
        "ALTER TABLE daily_activity ADD COLUMN IF NOT EXISTS name TEXT",
        "ALTER TABLE daily_activity ADD COLUMN IF NOT EXISTS activity_date TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE daily_activity ADD COLUMN IF NOT EXISTS less_worked_hours TEXT",
    ]
    with db.engine.begin() as conn:
        for sql in stmts:
            conn.execute(text(sql))
        conn.execute(
            text(
                """
                DO $pl$
                BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'daily_activity' AND column_name = 'date'
                  ) THEN
                    ALTER TABLE daily_activity ALTER COLUMN date DROP NOT NULL;
                  END IF;
                END
                $pl$;
                """
            )
        )


def backfill_legacy_date_column() -> None:
    """Copy `activity_date` into varchar `date` where the old schema still has that column."""
    with db.engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE daily_activity
                SET date = to_char(activity_date AT TIME ZONE 'UTC', 'YYYY-MM-DD')
                WHERE activity_date IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'daily_activity' AND column_name = 'date'
                  )
                  AND (date IS NULL OR trim(date) = '');
                """
            )
        )


def parse_activity_date(raw: object) -> datetime | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if " " in s:
        head = s[:19]
        for fmt in ("%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S"):
            try:
                return datetime.strptime(head, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
    chunk = s[:10]
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(chunk, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


_NA_TOKENS = frozenset(
    {"", "none", "null", "n/a", "na", "-", "--", ".", "nil"}
)


def parse_float(v: object) -> float | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(",", ".").lower()
    if not s or s in _NA_TOKENS:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_numeric_field(v: object) -> float | None:
    """Map text/float SQLite cells to Numeric columns on DailyActivity."""
    return parse_float(v)


def nonempty_str(v: object | None) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _clean_decimal_text(v: object | None) -> str | None:
    """Normalize for DB NUMERIC columns that ORM exposes as Text (reject 'none', etc.)."""
    if v is None:
        return None
    s = str(v).strip().replace(",", ".").lower()
    if not s or s in _NA_TOKENS:
        return None
    try:
        float(s)
    except ValueError:
        return None
    return s.replace(",", ".")


def sqlite_to_model(row: sqlite3.Row) -> DailyActivity | None:
    email = nonempty_str(row["Email"]) or ""
    if not email:
        return None

    lm_h1v0 = row["Line_Miles _H1V0"]

    activity_date = parse_activity_date(row["DATE"])

    return DailyActivity(
        id=str(uuid.uuid4()),
        email=email,
        name=nonempty_str(row["Name"]),
        mode_of_functioning=nonempty_str(row["Mode_Of_Functioning"]),
        pod_name=nonempty_str(row["POD Name"]),
        product=None,
        project_name=nonempty_str(row["Project_Name"]),
        nature_of_work=nonempty_str(row["Nature_Of_Work"]),
        task=nonempty_str(row["Task"]),
        dedicated_hours=parse_numeric_field(row["Dedicated Hours"]),
        dedicated_hours_h1v1=parse_numeric_field(row["Dedicated_Hours_For_H1V1"]),
        dedicated_hours_h1v0=parse_numeric_field(row["Dedicated_Hours_For_H1V0"]),
        line_miles=parse_numeric_field(row["Line Miles"]),
        line_miles_h1v1=_clean_decimal_text(row["Line_Miles_H1V1"]),
        line_miles_h1v0=_clean_decimal_text(lm_h1v0),
        benchmark_for_task=_clean_decimal_text(row["Benchmark_For_the_Task"]),
        remarks=nonempty_str(row["Remarks."]),
        activity_date=activity_date,
        created_at=None,
        less_worked_hours=nonempty_str(row["Less_Worked_Hours"]),
    )


def main() -> int:
    p = argparse.ArgumentParser(description="SQLite iivms_data_1.db → Postgres daily_activity")
    p.add_argument(
        "--sqlite",
        default=str(ROOT / "etl/data/iivms_data_1.db"),
        help="Path to SQLite .db file",
    )
    p.add_argument(
        "--truncate",
        action="store_true",
        help="DELETE all rows from daily_activity before import",
    )
    p.add_argument("--batch", type=int, default=500, help="Commit every N rows")
    args = p.parse_args()

    sqlite_path = Path(args.sqlite)
    if not sqlite_path.is_file():
        print(f"SQLite file not found: {sqlite_path}", file=sys.stderr)
        return 1

    with app.app_context():
        db.create_all()
        ensure_daily_activity_orm_columns()
        if args.truncate:
            n_del = DailyActivity.query.delete(synchronize_session=False)
            db.session.commit()
            print(f"Cleared daily_activity ({n_del} rows).")

        sl = sqlite3.connect(str(sqlite_path))
        sl.row_factory = sqlite3.Row
        cur = sl.execute("SELECT * FROM daily_activity")
        inserted = 0
        skipped = 0
        batch: list[DailyActivity] = []

        for row in cur:
            obj = sqlite_to_model(row)
            if obj is None:
                skipped += 1
                continue
            batch.append(obj)
            if len(batch) >= args.batch:
                db.session.add_all(batch)
                db.session.commit()
                inserted += len(batch)
                batch.clear()
                print(f"  inserted {inserted} ...", flush=True)

        if batch:
            db.session.add_all(batch)
            db.session.commit()
            inserted += len(batch)

        sl.close()

        backfill_legacy_date_column()

    print(f"Done. Inserted {inserted} rows, skipped (no email) {skipped}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
