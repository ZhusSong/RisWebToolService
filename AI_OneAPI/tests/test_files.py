import base64
import importlib.util
import io
import json
from pathlib import Path
import unittest
import threading
import subprocess
import urllib.request
import urllib.error
from unittest.mock import patch
import zipfile
import tempfile
import sys
sys.path.insert(0, str(Path(__file__).parents[1] / 'files'))
import artifact_store as store

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

    def test_other_text_model_is_forwarded_to_one_api(self):
        job={'request':{'prompt':'你好','model':'gpt-4','mode':'document'},'key':'token','upstream':'http://one-api:3000'}
        with patch.object(w,'request_model',return_value={'choices':[{'message':{'content':'完成'}}]}) as call:
            result=w.process(job)
        self.assertEqual(result['model'],'gpt-4')
        self.assertEqual(call.call_args.kwargs['json']['model'],'gpt-4')

    def test_image_config_and_edit(self):
        from PIL import Image
        stream=io.BytesIO();Image.new('RGB',(10,10)).save(stream,'PNG')
        job={'request':{'prompt':'蓝猫','mode':'image'},'key':'x','upstream':'http://unused','image_model':''}
        with patch.object(w,'request_model') as call, self.assertRaises(ValueError):
            w.process(job)
        call.assert_not_called()
        job.update(image_model='configured-model', image_edit_base_url='https://edit.example', image_edit_api_key='provider-secret')
        job['request']['files']=[upload('input.png',stream.getvalue())]
        with patch.object(w,'request_model',return_value={'data':[{'b64_json':base64.b64encode(stream.getvalue()).decode()}]}) as call:
            self.assertEqual(w.process(job)['artifact']['mime'],'image/png')
            self.assertEqual(call.call_args.args[1],'images/edits')
            self.assertEqual(call.call_args.args[0]['upstream'],'https://edit.example')
            self.assertEqual(call.call_args.args[0]['key'],'provider-secret')
            job['request']['prompt']='生成一张木质破旧十字架的像素图片，像素大小为128*128像素，命名为Test01'
            generated=w.process(job)['artifact']
            self.assertEqual(generated['name'],'Test01.png')
            with Image.open(io.BytesIO(base64.b64decode(generated['data']))) as image:
                self.assertEqual(image.size,(128,128))
        with patch.object(w,'request_model',return_value={'data':[{'url':'http://127.0.0.1/private'}]}), self.assertRaises(ValueError):
            w.process(job)  # Never fetch provider-supplied URLs.

    def test_image_edit_keeps_alpha_and_requests_transparent_png(self):
        from PIL import Image
        stream=io.BytesIO()
        Image.new('RGBA',(16,16),(255,0,0,0)).save(stream,'PNG')
        job={'request':{'prompt':'将图片背景变为透明','mode':'image','files':[upload('input.png',stream.getvalue())]},
             'key':'x','upstream':'http://unused','image_model':'gpt-image-2.5-flare',
             'image_edit_base_url':'https://edit.example','image_edit_api_key':'provider-secret'}
        with patch.object(w,'request_model',return_value={'data':[{'b64_json':base64.b64encode(stream.getvalue()).decode()}]}) as call:
            result=w.process(job)
        self.assertEqual(call.call_args.args[1],'images/edits')
        self.assertEqual(call.call_args.kwargs['data']['background'],'transparent')
        self.assertEqual(call.call_args.kwargs['data']['output_format'],'png')
        with Image.open(io.BytesIO(call.call_args.kwargs['files']['image'][1])) as sent:
            self.assertEqual(sent.mode,'RGBA')
        with Image.open(io.BytesIO(base64.b64decode(result['artifact']['data']))) as saved:
            self.assertEqual(saved.mode,'RGBA')
            self.assertEqual(saved.getpixel((0,0))[3],0)

    def test_image_edit_requires_separate_provider_configuration(self):
        from PIL import Image
        stream=io.BytesIO();Image.new('RGB',(4,4)).save(stream,'PNG')
        job={'request':{'prompt':'修改图片背景','mode':'image','files':[upload('input.png',stream.getvalue())]},
             'key':'one-api-token','upstream':'http://one-api:3000','image_model':'configured-model'}
        with patch.object(w,'request_model') as call, self.assertRaisesRegex(ValueError,'尚未配置图片编辑渠道'):
            w.process(job)
        call.assert_not_called()

    def test_worker_exit_reports_safe_code(self):
        server=s.ThreadingHTTPServer(('127.0.0.1',0),s.Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            with patch.object(s,'authorize',return_value=(1,'SECRET')),patch.object(s,'verify_conversation'),patch.object(s.subprocess,'run',side_effect=subprocess.CalledProcessError(-9,'worker')):
                req=urllib.request.Request(f'http://127.0.0.1:{server.server_port}/files-api/process',
                    data=json.dumps({'conversation':'00000000-0000-0000-0000-000000000001','token_id':'4','prompt':'edit'}).encode(),
                    headers={'Origin':s.ORIGIN,'Cookie':'session','X-History-User':'1'})
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(req)
                with error.exception as response:
                    body=json.load(response)
                self.assertEqual(response.status,503)
                self.assertIn('-9',body['error'])
                self.assertNotIn('SECRET',json.dumps(body))
        finally:
            server.shutdown();server.server_close();thread.join()

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
                data=json.dumps({'token_id':'4','prompt':'hello','conversation':'00000000-0000-0000-0000-000000000001'}).encode(),
                headers={'Origin':origin,'Cookie':cookie,'X-History-User':'1'})
            try:
                response=urllib.request.urlopen(req)
            except urllib.error.HTTPError as error:
                response=error
            with response:
                return response.status,json.load(response)
        try:
            with patch.object(s,'authorize',return_value=(1,'SECRET')), patch.object(s,'verify_conversation'), patch.object(s.subprocess,'run') as run:
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

    def test_download_requires_owner_conversation_and_unexpired_file(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(store,'ROOT',Path(folder)):
            item=store.save(1,'00000000-0000-0000-0000-000000000001',{'name':'报告.pdf','mime':'application/pdf','data':base64.b64encode(b'example').decode()})
            server=s.ThreadingHTTPServer(('127.0.0.1',0),s.Handler)
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            url=f'http://127.0.0.1:{server.server_port}/files-api/artifacts/{item["id"]}?conversation=00000000-0000-0000-0000-000000000001'
            try:
                with patch.object(s,'account_get',return_value={'id':1}),patch.object(s,'verify_conversation'):
                    with urllib.request.urlopen(urllib.request.Request(url,headers={'Cookie':'session'})) as response:
                        self.assertEqual(response.read(),b'example')
                        self.assertIn('attachment;',response.headers['Content-Disposition'])
                with patch.object(s,'account_get',return_value={'id':2}),patch.object(s,'verify_conversation'):
                    with self.assertRaises(urllib.error.HTTPError) as error:
                        urllib.request.urlopen(urllib.request.Request(url,headers={'Cookie':'session'}))
                    self.assertEqual(error.exception.code,404);error.exception.close()
                with patch.object(store.time,'time',return_value=item['expires']):
                    with patch.object(s,'account_get',return_value={'id':1}),patch.object(s,'verify_conversation'):
                        with self.assertRaises(urllib.error.HTTPError) as error:
                            urllib.request.urlopen(urllib.request.Request(url,headers={'Cookie':'session'}))
                        self.assertEqual(error.exception.code,404);error.exception.close()
            finally:
                server.shutdown();server.server_close();thread.join()

    def test_processed_artifact_returns_metadata_instead_of_bytes(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(store,'ROOT',Path(folder)):
            server=s.ThreadingHTTPServer(('127.0.0.1',0),s.Handler)
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            try:
                artifact={'name':'result.txt','mime':'text/plain','data':base64.b64encode(b'PRIVATE_RESULT').decode()}
                with patch.object(s,'authorize',return_value=(1,'SECRET')),patch.object(s,'verify_conversation'),patch.object(s.subprocess,'run') as run:
                    run.return_value.stdout=json.dumps({'text':'完成','artifact':artifact}).encode()
                    req=urllib.request.Request(f'http://127.0.0.1:{server.server_port}/files-api/process',
                        data=json.dumps({'conversation':'00000000-0000-0000-0000-000000000001','token_id':'4','prompt':'输出'}).encode(),
                        headers={'Origin':s.ORIGIN,'Cookie':'session','X-History-User':'1'})
                    with urllib.request.urlopen(req) as response:
                        result=json.load(response)
                self.assertEqual(result['artifact']['name'],'result.txt')
                self.assertNotIn('data',result['artifact'])
                self.assertEqual((Path(folder)/result['artifact']['id']).read_bytes(),b'PRIVATE_RESULT')
            finally:
                server.shutdown();server.server_close();thread.join()

if __name__ == '__main__':
    unittest.main()
