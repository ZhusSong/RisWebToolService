"""Local deployment preparation and consistent SQLite backup; never prints secrets."""
import argparse
from contextlib import closing
import datetime
import os
from pathlib import Path
import secrets
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {"users", "tokens", "channels", "options", "logs"}


def inspect_db(path):
    if not path.is_file():
        raise RuntimeError("Database missing: start One API and wait for migration first.")
    with closing(sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)) as db:
        integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
        tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if integrity != "ok" or not REQUIRED.issubset(tables):
            raise RuntimeError("Database integrity/schema check failed; do not publish.")
        return tables


def init():
    target = ROOT / ".env"
    if target.exists():
        raise RuntimeError(".env already exists; refusing to replace the session secret.")
    for name in ("data", "backups"):
        (ROOT / name).mkdir(mode=0o700, exist_ok=True)
    data = ("ONE_API_IMAGE=ghcr.io/songquanpeng/one-api:v0.6.10\n"
            f"SESSION_SECRET={secrets.token_hex(32)}\n")
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as output:
        output.write(data)
    print("Created private .env and persistent directories. No database created yet.")


def backup(source, folder):
    inspect_db(source)
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    target = folder / ("one-api-" + stamp + ".db")
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    os.close(fd)
    try:
        with closing(sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True)) as src:
            with closing(sqlite3.connect(target)) as dst:
                src.backup(dst)
        inspect_db(target)
    except Exception:
        target.unlink(missing_ok=True)
        raise
    return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["init", "check-db", "backup"])
    args = parser.parse_args()
    try:
        if args.command == "init":
            init()
        elif args.command == "check-db":
            inspect_db(ROOT / "data/one-api.db")
            print("SQLite integrity and required tables: OK (no user data printed).")
        else:
            print("Backup created:", backup(ROOT / "data/one-api.db", ROOT / "backups"))
    except (RuntimeError, OSError, sqlite3.Error) as error:
        parser.exit(1, str(error) + "\n")
