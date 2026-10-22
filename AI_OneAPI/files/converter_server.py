"""Public, single-job document conversion. No AI credentials or persistent uploads."""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SLOT = threading.BoundedSemaphore(1)
ORIGIN = os.environ.get('CONVERTER_ORIGIN', 'https://ristoolweb.com')
LIMIT = 7 * 1024 * 1024

def run_job(data):
    # Parent owns cleanup, including when the child is killed or conversion fails.
    with tempfile.TemporaryDirectory(prefix='convert-') as directory:
        env = {**os.environ, 'TMPDIR': directory, 'TEMP': directory, 'TMP': directory,
               'HOME': directory, 'OMP_NUM_THREADS': '1', 'OPENBLAS_NUM_THREADS': '1'}
        process = subprocess.Popen([sys.executable, '-B', str(Path(__file__).with_name('converter_worker.py'))],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            env=env, start_new_session=os.name == 'posix')
        try:
            stdout, _ = process.communicate(json.dumps(data).encode(), timeout=100)
            if process.returncode != 0 or len(stdout) > 24 * 1024 * 1024:
                raise ValueError('conversionFailed')
            return json.loads(stdout)
        finally:
            # LibreOffice children must not outlive a timed-out request.
            if os.name == 'posix':
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            elif process.poll() is None:
                process.kill()
            process.wait()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def setup(self):
        super().setup()
        self.connection.settimeout(30)

    def reply(self, code, data):
        raw = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        self.reply(200 if self.path == '/health' else 404, {'ok': self.path == '/health'})

    def do_POST(self):
        if self.path != '/convert-api/process':
            return self.reply(404, {'error': 'notFound'})
        if self.headers.get('Origin') != ORIGIN:
            return self.reply(403, {'error': 'origin'})
        if not SLOT.acquire(blocking=False):
            return self.reply(429, {'error': 'busy'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= LIMIT:
                return self.reply(413, {'error': 'size'})
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError()
            result = run_job({'format': data.get('format'), 'files': data.get('files')})
            self.reply(400 if 'error' in result else 200, result)
        except subprocess.TimeoutExpired:
            self.reply(504, {'error': 'timeout'})
        except (ValueError, TypeError):
            self.reply(400, {'error': 'invalid'})
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        except Exception:
            self.reply(503, {'error': 'unavailable'})
        finally:
            SLOT.release()

if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', 3004), Handler).serve_forever()
