import base64
import importlib.util
import io
import json
from pathlib import Path
import unittest
import threading
import urllib.request
import urllib.error
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).parents[1] / 'files'
def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
w = load('worker')
s = load('server')

def upload(name, raw):
    return {'name': name, 'data': base64.b64encode(raw).decode()}

class FileTests(unittest.TestCase):
    def test_direct_conversion_preserves_source_without_model_or_history_leak(self):
        source = '志望動機\n\n私はゲームが好きです。\n第二段落。'
        job = {'request':{'prompt':'Convert this file','mode':'convert','format':'pdf',
                         'files':[upload('input.txt',source.encode())]}}
        with patch.object(w,'request_model') as model:
            result=w.process(job)
            model.assert_not_called()
        self.assertNotIn(source,result['text'])
        restored=w.extract('output.pdf',base64.b64decode(result['artifact']['data']))
        self.assertIn('私はゲームが好きです。',restored)
        self.assertIn('第二段落。',restored)
        job['request']['format']='md'
        self.assertEqual(base64.b64decode(w.process(job)['artifact']['data']).decode(),source)
        job['request']['files'].append(upload('extra.txt',b'hello'))
        with self.assertRaises(ValueError):
            w.process(job)

    def test_document_roundtrips(self):
        text = '中文测试\nHello world\n第二段'
        for fmt in ['txt','md','docx','xlsx','pptx','pdf']:
            with self.subTest(fmt=fmt):
                result = w.artifact(text, fmt)
                extracted = w.extract(result['name'], base64.b64decode(result['data']))
                self.assertIn('Hello world', extracted)
                self.assertIn('中文测试', extracted)
        for fmt in ['csv','json','zip']:
            self.assertTrue(w.artifact(text, fmt)['data'])

    def test_archive_security(self):
        for name in ['../escape.txt','/etc/passwd','dir\\evil.txt','C:/evil.txt','nested.zip','run.exe']:
            stream = io.BytesIO()
            with zipfile.ZipFile(stream,'w') as archive:
                info = zipfile.ZipInfo('placeholder')
                info.filename = name  # Preserve malicious backslashes even on Windows.
                archive.writestr(info, b'not executable')
            with self.subTest(name=name), self.assertRaises(ValueError):
                w.prepare([upload('input.zip', stream.getvalue())])
        stream = io.BytesIO()
        with zipfile.ZipFile(stream,'w',zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('bomb.txt', b'0'*1000000)
        with self.assertRaises(ValueError):
            w.prepare([upload('input.zip',stream.getvalue())])

    def test_zip_text_and_image(self):
        from PIL import Image
        png = io.BytesIO()
        Image.new('RGB',(10,10),'blue').save(png,'PNG')
        stream = io.BytesIO()
        with zipfile.ZipFile(stream,'w') as archive:
            archive.writestr('hello.txt','你好'.encode())
            archive.writestr('cat.png', png.getvalue())
        text, images, names = w.prepare([upload('input.zip',stream.getvalue())])
        self.assertIn('你好', text)
        self.assertEqual(len(images),1)
        self.assertEqual(len(names),2)

    def test_formulas_are_not_executable(self):
        from openpyxl import load_workbook
        data = w.artifact('=HYPERLINK("https://example.com")','xlsx')
        book = load_workbook(io.BytesIO(base64.b64decode(data['data'])))
        self.assertEqual(book.active['B2'].data_type,'s')
        self.assertTrue(base64.b64decode(w.artifact('=1+1','csv')['data']).decode().find("'=1+1")>=0)

    def test_only_answer_returns_not_upload(self):
        job = {'request':{'prompt':'总结','model':'gpt-5.6-sol','files':[upload('source.txt',b'PRIVATE_SOURCE')],'format':'docx'},'key':'never-return-key','upstream':'http://unused'}
        with patch.object(w,'request_model',return_value={'choices':[{'message':{'content':'总结完成'}}]}) as call:
            result = w.process(job)
            self.assertNotIn('PRIVATE_SOURCE',json.dumps(result))
            self.assertNotIn('never-return-key',json.dumps(result))
            self.assertIn('PRIVATE_SOURCE',json.dumps(call.call_args.kwargs))
            self.assertEqual(result['text'],'总结完成')

    def test_image_config_and_edit(self):
        from PIL import Image
        stream=io.BytesIO();Image.new('RGB',(10,10)).save(stream,'PNG')
        job={'request':{'prompt':'蓝猫','mode':'image'},'key':'x','upstream':'http://unused','image_model':''}
        with patch.object(w,'request_model') as call, self.assertRaises(ValueError):
            w.process(job)
        call.assert_not_called()
        job['image_model']='configured-model'
        job['request']['files']=[upload('input.png',stream.getvalue())]
        with patch.object(w,'request_model',return_value={'data':[{'b64_json':base64.b64encode(stream.getvalue()).decode()}]}) as call:
            self.assertEqual(w.process(job)['artifact']['mime'],'image/png')
            self.assertEqual(call.call_args.args[1],'images/edits')
        with patch.object(w,'request_model',return_value={'data':[{'url':'http://127.0.0.1/private'}]}), self.assertRaises(ValueError):
            w.process(job)  # Never fetch provider-supplied URLs.

    def test_token_owner_and_expiry(self):
        with patch.object(s,'account_get',return_value={'id':2}), self.assertRaises(ValueError):
            s.authorize('session','1',4)

    def test_public_converter_forces_local_mode(self):
        server = s.ThreadingHTTPServer(('127.0.0.1',0),s.Handler)
        thread = threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            with patch.object(s,'CONVERTER_ORIGIN','https://ristoolweb.com'), patch.object(s,'authorize') as auth, patch.object(s.subprocess,'run') as run:
                run.return_value.stdout=b'{"text":"done"}'
                req=urllib.request.Request(f'http://127.0.0.1:{server.server_port}/convert-api/process',
                    data=json.dumps({'mode':'image','token_id':4,'format':'pdf','files':[]}).encode(),
                    headers={'Origin':'https://ristoolweb.com'})
                with urllib.request.urlopen(req) as response:
                    self.assertNotIn('user_id',json.load(response))
                auth.assert_not_called()
                job=json.loads(run.call_args.kwargs['input'])
                self.assertEqual(job['request']['mode'],'convert')
                self.assertNotIn('token_id',job['request'])
                self.assertIsNone(job['key'])
                req.headers['Origin']='https://evil.example'
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(req)
                self.assertEqual(error.exception.code,403)
                error.exception.close()
        finally:
            server.shutdown();server.server_close();thread.join()

    def test_http_auth_origin_and_worker_boundary(self):
        server = s.ThreadingHTTPServer(('127.0.0.1',0),s.Handler)
        thread = threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        def send(origin=s.ORIGIN, cookie='valid'):
            req=urllib.request.Request(f'http://127.0.0.1:{server.server_port}/files-api/process',
                data=json.dumps({'token_id':'4','prompt':'hello'}).encode(),
                headers={'Origin':origin,'Cookie':cookie,'X-History-User':'1'})
            try:
                response=urllib.request.urlopen(req)
            except urllib.error.HTTPError as error:
                response=error
            with response:
                return response.status,json.load(response)
        try:
            with patch.object(s,'authorize',return_value=(1,'SECRET')), patch.object(s.subprocess,'run') as run:
                self.assertEqual(send('https://evil.example')[0],403)
                run.assert_not_called()
                run.return_value.stdout=b'{"text":"done"}'
                code,result=send()
                self.assertEqual(code,200);self.assertEqual(result['user_id'],1)
                self.assertNotIn('SECRET',json.dumps(result))
                self.assertNotIn('SECRET',str(run.call_args.args))
            with patch.object(s,'authorize',side_effect=ValueError()), patch.object(s.subprocess,'run') as run:
                self.assertEqual(send(cookie='')[0],401)
                run.assert_not_called()
        finally:
            server.shutdown();server.server_close();thread.join()
        token={'id':4,'status':1,'expired_time':-1,'unlimited_quota':True,'key':'abc'}
        with patch.object(s,'account_get',side_effect=[{'id':1},token]):
            self.assertEqual(s.authorize('session','1',4),(1,'sk-abc'))
        token['expired_time']=1
        with patch.object(s,'account_get',side_effect=[{'id':1},token]), self.assertRaises(ValueError):
            s.authorize('session','1',4)

if __name__ == '__main__':
    unittest.main()
