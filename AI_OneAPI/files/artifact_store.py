"""Account-scoped generated artifacts with a strict 24-hour lifetime."""
import base64
import os
import re
import sqlite3
import time
import uuid
from contextlib import closing
from pathlib import Path

ROOT = Path(os.getenv('ARTIFACT_DIR', '/data/artifacts'))
TTL = 24 * 60 * 60
MAX_USER_BYTES = 100 * 1024 * 1024
MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024
MAX_ARTIFACT_BYTES = 16 * 1024 * 1024
ID = re.compile(r'^[0-9a-f]{32}$')


def connect():
    ROOT.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(ROOT / 'index.db', timeout=10)
    db.execute('CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, owner INTEGER NOT NULL, conversation TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, expires INTEGER NOT NULL)')
    db.execute('CREATE INDEX IF NOT EXISTS artifacts_expiry ON artifacts(expires)')
    db.execute('CREATE INDEX IF NOT EXISTS artifacts_conversation ON artifacts(owner, conversation)')
    db.commit()
    return db


def cleanup(now=None):
    now = int(time.time()) if now is None else now
    with closing(connect()) as db:
        rows = db.execute('SELECT id FROM artifacts WHERE expires<=?', (now,)).fetchall()
        db.execute('DELETE FROM artifacts WHERE expires<=?', (now,))
        db.commit()
    for (identifier,) in rows:
        (ROOT / identifier).unlink(missing_ok=True)
    return len(rows)


def save(owner, conversation, artifact):
    raw = base64.b64decode(artifact['data'], validate=True)
    if not 0 < len(raw) <= MAX_ARTIFACT_BYTES:
        raise ValueError('生成文件大小无效')
    name = artifact.get('name')
    mime = artifact.get('mime', 'application/octet-stream')
    if not isinstance(name, str) or not 1 <= len(name) <= 200 or '/' in name or '\\' in name or any(ord(c) < 32 for c in name):
        raise ValueError('生成文件名无效')
    if not isinstance(mime, str) or not re.fullmatch(r'[a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+', mime):
        raise ValueError('生成文件类型无效')
    now = int(time.time())
    cleanup(now)
    identifier = uuid.uuid4().hex
    with closing(connect()) as db:
        db.execute('BEGIN IMMEDIATE')
        used = db.execute('SELECT COALESCE(SUM(size),0) FROM artifacts WHERE owner=? AND expires>?', (owner, now)).fetchone()[0]
        if used + len(raw) > MAX_USER_BYTES:
            raise ValueError('临时文件空间已满，请等待旧文件过期')
        total = db.execute('SELECT COALESCE(SUM(size),0) FROM artifacts WHERE expires>?', (now,)).fetchone()[0]
        if total + len(raw) > MAX_TOTAL_BYTES:
            raise ValueError('服务器临时文件空间已满')
        path = ROOT / identifier
        with path.open('xb') as output:
            output.write(raw)
        try:
            expires = now + TTL
            db.execute('INSERT INTO artifacts VALUES (?,?,?,?,?,?,?)', (identifier, owner, conversation, name, mime, len(raw), expires))
            db.commit()
        except Exception:
            path.unlink(missing_ok=True)
            raise
    return {'id': identifier, 'name': name, 'mime': mime, 'size': len(raw), 'expires': expires}


def lookup(identifier, owner, conversation, now=None):
    if not ID.fullmatch(identifier):
        return None
    now = int(time.time()) if now is None else now
    with closing(connect()) as db:
        row = db.execute('SELECT name,mime,size,expires FROM artifacts WHERE id=? AND owner=? AND conversation=? AND expires>?', (identifier, owner, conversation, now)).fetchone()
    path = ROOT / identifier
    return (row, path) if row and path.is_file() else None


def delete_conversation(owner, conversation):
    with closing(connect()) as db:
        rows = db.execute('SELECT id FROM artifacts WHERE owner=? AND conversation=?', (owner, conversation)).fetchall()
        db.execute('DELETE FROM artifacts WHERE owner=? AND conversation=?', (owner, conversation))
        db.commit()
    for (identifier,) in rows:
        (ROOT / identifier).unlink(missing_ok=True)
