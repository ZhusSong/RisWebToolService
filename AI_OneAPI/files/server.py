"""Ephemeral file jobs: cookie auth, owner-scoped token lookup, one bounded worker."""
import json
import os
import subprocess
import sys
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ORIGIN = os.getenv('PUBLIC_ORIGIN', 'https://ai.ristoolweb.com')
UPSTREAM = os.getenv('ONE_API_URL', 'http://one-api:3000').rstrip('/')
IMAGE_MODEL = os.getenv('IMAGE_MODEL', '').strip()
CONVERTER_ORIGIN = os.getenv('CONVERTER_ORIGIN', '').strip()
SLOT = threading.BoundedSemaphore(1)
MAX_BODY = 12 * 1024 * 1024

def account_get(path, cookie):
    request = urllib.request.Request(UPSTREAM + path, headers={'Cookie': cookie})
    with urllib.request.urlopen(request, timeout=8) as response:
        result = json.loads(response.read(1024 * 1024))
    if result.get('success') is not True:
        raise ValueError('登录或令牌失效')
    return result['data']

def authorize(cookie, expected, token_id=None):
    if not cookie:
        raise ValueError('请先登录')
    user = account_get('/api/user/self', cookie)
    owner = user.get('id')
    if type(owner) is not int or owner <= 0 or str(owner) != expected:
        raise ValueError('登录账号已变化，请刷新页面')
    if token_id is None:
        return owner, None
    if not str(token_id).isdigit():
        raise ValueError('请选择自己的令牌')
    # One API scopes this endpoint to the current session's owner.
    token = account_get('/api/token/' + str(token_id), cookie)
    if str(token.get('id')) != str(token_id) or token.get('status') != 1:
        raise ValueError('令牌不可用')
    if token.get('expired_time', 0) != -1 and token.get('expired_time', 0) <= time.time():
        raise ValueError('令牌已过期')
    if not token.get('unlimited_quota') and token.get('remain_quota', 0) <= 0:
        raise ValueError('令牌额度不足')
    key = token.get('key')
    if not isinstance(key, str) or not key:
        raise ValueError('无法读取令牌')
    return owner, key if key.startswith('sk-') else 'sk-' + key

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Never log upload bodies, prompts, cookies or tokens.

    def setup(self):
        super().setup()
        self.connection.settimeout(30)

    def reply(self, code, body):
        raw = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == '/health':
            return self.reply(200, {'ok': True})
        if self.path != '/files-api/config':
            return self.reply(404, {'error': '地址不存在'})
        try:
            owner, _ = authorize(self.headers.get('Cookie', ''), self.headers.get('X-History-User', ''))
            self.reply(200, {'user_id': owner, 'image_model': IMAGE_MODEL})
        except Exception:
            self.reply(401, {'error': '请重新登录'})

    def do_POST(self):
        public = self.path == '/convert-api/process' and bool(CONVERTER_ORIGIN)
        if self.path != '/files-api/process' and not public:
            return self.reply(404, {'error': '地址不存在'})
        if self.headers.get('Origin') != (CONVERTER_ORIGIN if public else ORIGIN):
            return self.reply(403, {'error': '来源校验失败'})
        if not SLOT.acquire(blocking=False):
            return self.reply(429, {'error': '文件服务忙，请稍后手动重试；本次未调用模型'})
        try:
            cookie, expected = self.headers.get('Cookie', ''), self.headers.get('X-History-User', '')
            try:
                if not public:
                    authorize(cookie, expected)
            except Exception:
                return self.reply(401, {'error': '请重新登录后处理文件'})
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= MAX_BODY:
                return self.reply(413, {'error': '上传请求超过 12 MiB'})
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError()
            try:
                if public:
                    # Dedicated local entry point: ignore all client-supplied AI parameters.
                    data = {'mode': 'convert', 'prompt': 'Convert the document', 'format': data.get('format'), 'files': data.get('files')}
                    owner, key = None, None
                else:
                    owner, key = authorize(cookie, expected, None if data.get('mode') == 'convert' else data.get('token_id', ''))
            except Exception:
                return self.reply(403, {'error': '登录状态或所选令牌不可用，请刷新令牌'})
            # Pass secrets via a pipe, never argv, environment, disk, logs or response.
            job = {'request': data, 'key': key, 'upstream': UPSTREAM, 'image_model': IMAGE_MODEL}
            result = subprocess.run([sys.executable, '-B', str(Path(__file__).with_name('worker.py'))],
                                    input=json.dumps(job).encode(), stdout=subprocess.PIPE,
                                    stderr=subprocess.DEVNULL, timeout=55 if public else 220, check=True)
            output = json.loads(result.stdout)
            if not public:
                output['user_id'] = owner
            self.reply(400 if 'error' in output else 200, output)
        except subprocess.TimeoutExpired:
            self.reply(504, {'error': '处理超时，临时任务已结束；上游可能已扣费，请勿自动重试'})
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        except (ValueError, TypeError):
            self.reply(400, {'error': '请求格式无效'})
        except Exception:
            self.reply(503, {'error': '处理失败，可能已产生模型费用；请检查服务配置'})
        finally:
            SLOT.release()

if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', 3003), Handler).serve_forever()
