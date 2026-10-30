"""Cookie-authenticated, account-scoped conversation storage."""
import json
import os
import sqlite3
import time
import uuid
import urllib.request
import re
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DB = os.environ.get('HISTORY_DB', '/data/history.db')
UPSTREAM = os.environ.get('ONE_API_URL', 'http://one-api:3000')
ORIGIN = os.environ.get('PUBLIC_ORIGIN', 'https://ai.ristoolweb.com')
MODELS = {'gpt-5.6-sol', 'gpt-6-astra'}
FILES_URL = os.environ.get('FILES_URL', 'http://files:3003')
INTERNAL_SECRET = os.environ.get('FILES_INTERNAL_SECRET', '')
ARTIFACT_ID = re.compile(r'^[0-9a-f]{32}$')


def remove_artifacts(owner, conversation):
    if not INTERNAL_SECRET:
        return
    body = json.dumps({'owner': owner, 'conversation': conversation}).encode()
    request = urllib.request.Request(FILES_URL + '/files-api/internal/delete', data=body,
                                     headers={'Content-Type': 'application/json', 'X-Internal-Secret': INTERNAL_SECRET})
    with urllib.request.urlopen(request, timeout=8):
        pass

def init_db():
    Path(DB).parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(DB)) as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, owner INTEGER NOT NULL, title TEXT NOT NULL, model TEXT NOT NULL, messages TEXT NOT NULL, revision INTEGER NOT NULL, updated INTEGER NOT NULL)')
        db.execute('CREATE INDEX IF NOT EXISTS owner_updated ON conversations(owner, updated DESC)')
        db.commit()

def identity(cookie):
    if not cookie:
        raise ValueError('未登录')
    request = urllib.request.Request(UPSTREAM + '/api/user/self', headers={'Cookie': cookie})
    with urllib.request.urlopen(request, timeout=8) as response:
        result = json.load(response)
    user = result.get('data') or {}
    if result.get('success') is not True or type(user.get('id')) is not int or user['id'] <= 0:
        raise ValueError('登录失效')
    return user['id']

def validate(data):
    title, model, messages = data.get('title'), data.get('model'), data.get('messages')
    if not isinstance(title, str) or not 1 <= len(title.strip()) <= 100 or model not in MODELS:
        raise ValueError('无效标题或模型')
    if not isinstance(messages, list) or len(messages) > 200:
        raise ValueError('消息过多')
    clean = []
    for message in messages:
        if not isinstance(message, dict) or message.get('role') not in ('user', 'assistant'):
            raise ValueError('无效消息')
        content = message.get('content')
        if not isinstance(content, str) or not 1 <= len(content) <= 60000:
            raise ValueError('无效内容')
        item = {'role': message['role'], 'content': content}
        if message.get('model') in MODELS:
            item['model'] = message['model']
        attachments = message.get('attachments', [])
        if not isinstance(attachments, list) or len(attachments) > 4:
            raise ValueError('附件无效')
        clean_attachments = []
        for attachment in attachments:
            if not isinstance(attachment, dict) or not isinstance(attachment.get('name'), str) or not 1 <= len(attachment['name']) <= 200:
                raise ValueError('附件名称无效')
            name = attachment['name']
            if '/' in name or '\\' in name or any(ord(c) < 32 for c in name):
                raise ValueError('附件名称无效')
            if message['role'] == 'assistant':
                if not isinstance(attachment.get('id'), str) or not ARTIFACT_ID.fullmatch(attachment['id']):
                    raise ValueError('文件引用无效')
                if type(attachment.get('expires')) is not int or attachment['expires'] <= 0:
                    raise ValueError('文件期限无效')
                clean_attachments.append({'id': attachment['id'], 'name': name, 'expires': attachment['expires']})
            else:
                clean_attachments.append({'name': name})
        if clean_attachments:
            item['attachments'] = clean_attachments
        clean.append(item)
    return title.strip(), model, json.dumps(clean, ensure_ascii=False)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def setup(self):
        super().setup()
        self.connection.settimeout(20)

    def reply(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.handle_request()
    def do_POST(self):
        self.handle_request()
    def do_PUT(self):
        self.handle_request()
    def do_DELETE(self):
        self.handle_request()

    def handle_request(self):
        try:
            if self.path == '/health' and self.command == 'GET':
                return self.reply(200, {'ok': True})
            if self.command != 'GET' and self.headers.get('Origin') != ORIGIN:
                return self.reply(403, {'error': '来源校验失败。'})
            try:
                owner = identity(self.headers.get('Cookie', ''))
            except Exception:
                return self.reply(401, {'error': '请重新登录后读取聊天记录。'})
            expected = self.headers.get('X-History-User')
            if expected and expected != str(owner):
                return self.reply(401, {'error': '登录账号已改变，请刷新页面。'})
            base = '/history-api/conversations'
            if self.path != base and not self.path.startswith(base + '/'):
                return self.reply(404, {'error': '地址不存在。'})
            cid = self.path[len(base):].strip('/')
            if cid:
                try:
                    uuid.UUID(cid)
                except ValueError:
                    return self.reply(404, {'error': '会话不存在。'})
            data = {}
            if self.command in ('POST', 'PUT', 'DELETE'):
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= 512000:
                    return self.reply(413, {'error': '请求内容过大。'})
                data = json.loads(self.rfile.read(size))
                if not isinstance(data, dict):
                    raise ValueError('请求格式无效')
            with closing(sqlite3.connect(DB, timeout=10)) as db:
                db.row_factory = sqlite3.Row
                if self.command == 'GET' and not cid:
                    rows = db.execute('SELECT id,title,model,revision,updated FROM conversations WHERE owner=? ORDER BY updated DESC', (owner,)).fetchall()
                    return self.reply(200, {'user_id': owner, 'items': [dict(row) for row in rows]})
                if self.command == 'POST' and not cid:
                    title, model, messages = validate(data)
                    db.execute('BEGIN IMMEDIATE')
                    if db.execute('SELECT count(*) FROM conversations WHERE owner=?', (owner,)).fetchone()[0] >= 200:
                        return self.reply(409, {'error': '最多保存 200 个会话，请删除不需要的记录。'})
                    cid = str(uuid.uuid4())
                    db.execute('INSERT INTO conversations VALUES (?,?,?,?,?,?,?)', (cid, owner, title, model, messages, 1, time.time_ns() // 1000000))
                    db.commit()
                    return self.reply(201, {'id': cid, 'revision': 1, 'user_id': owner})
                row = db.execute('SELECT * FROM conversations WHERE id=? AND owner=?', (cid, owner)).fetchone()
                if not row:
                    return self.reply(404, {'error': '会话不存在或不属于当前账号。'})
                if self.command == 'GET':
                    result = dict(row)
                    result.pop('owner')
                    result['messages'] = json.loads(result['messages'])
                    result['user_id'] = owner
                    return self.reply(200, result)
                if type(data.get('revision')) is not int:
                    raise ValueError('缺少版本')
                if self.command == 'PUT':
                    title, model, messages = validate(data)
                    cursor = db.execute('UPDATE conversations SET title=?,model=?,messages=?,revision=revision+1,updated=? WHERE id=? AND owner=? AND revision=?', (title, model, messages, time.time_ns() // 1000000, cid, owner, data['revision']))
                elif self.command == 'DELETE':
                    cursor = db.execute('DELETE FROM conversations WHERE id=? AND owner=? AND revision=?', (cid, owner, data['revision']))
                else:
                    return self.reply(405, {'error': '不支持此操作。'})
                if not cursor.rowcount:
                    return self.reply(409, {'error': '会话已在另一页面更新，请刷新后重试。'})
                db.commit()
                if self.command == 'DELETE':
                    try:
                        remove_artifacts(owner, cid)
                    except Exception:
                        pass  # Retention worker still removes files within 24 hours.
                return self.reply(200, {'id': cid, 'revision': data['revision'] + 1, 'user_id': owner})
        except ValueError:
            self.reply(400, {'error': '请求内容无效或超出保存限制。'})
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        except Exception:
            self.reply(503, {'error': '记录服务暂时不可用。'})

if __name__ == '__main__':
    init_db()
    ThreadingHTTPServer(('0.0.0.0', 3002), Handler).serve_forever()
