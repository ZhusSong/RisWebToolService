import importlib.util
from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("manage", Path(__file__).resolve().parents[1] / "scripts/manage.py")
manage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manage)


class DatabaseTests(unittest.TestCase):
    def test_missing_database_is_not_created(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "missing.db"
            with self.assertRaises(RuntimeError):
                manage.inspect_db(path)
            self.assertFalse(path.exists())

    def test_wrong_schema_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "empty.db"
            sqlite3.connect(path).close()
            with self.assertRaises(RuntimeError):
                manage.inspect_db(path)

    def test_backup_includes_committed_wal(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "source.db"
            with closing(sqlite3.connect(source)) as db:
                db.execute("PRAGMA journal_mode=WAL")
                for table in manage.REQUIRED:
                    db.execute(f'CREATE TABLE "{table}" (id INTEGER PRIMARY KEY, value TEXT)')
                db.execute("INSERT INTO users(value) VALUES ('test-member')")
                db.commit()
                result = manage.backup(source, Path(folder) / "backups")
                with closing(sqlite3.connect(result)) as copied:
                    self.assertEqual(copied.execute("SELECT value FROM users").fetchone()[0], "test-member")


if __name__ == "__main__":
    unittest.main()
