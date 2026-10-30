import importlib.util
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('history_server', Path(__file__).parents[1] / 'history/server.py')
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)

class HistoryTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        app.DB = str(Path(self.folder.name) / 'history.db')
        app.init_db()
        self.original = app.identity
        app.identity = lambda cookie: int(cookie)
        self.server = app.ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        app.identity = self.original
        self.folder.cleanup()

    def request(self, method='GET', path='', data=None, user='1', origin=None, expected=None):
        headers = {'Cookie': user, 'Origin': origin or app.ORIGIN, 'Content-Type':'application/json'}
        if expected:
            headers['X-History-User'] = expected
        request = urllib.request.Request(f'http://127.0.0.1:{self.server.server_port}/history-api/conversations'+path, method=method, headers=headers, data=json.dumps(data).encode() if data is not None else None)
        try:
            response = urllib.request.urlopen(request)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status, json.load(response)

    def sample(self):
        return {'title':'测试对话','model':'gpt-5.6-sol','messages':[{'role':'user','content':'你好'}]}

    def test_persist_restore_and_ownership(self):
        status, created = self.request('POST',data=self.sample())
        self.assertEqual(status,201)
        path='/'+created['id']
        self.assertEqual(self.request(path=path)[1]['messages'][0]['content'],'你好')
        self.assertEqual(len(self.request(user='2')[1]['items']),0)
        self.assertEqual(self.request(path=path,user='2')[0],404)
        self.assertEqual(self.request('PUT',path,{**self.sample(),'revision':1},user='2')[0],404)
        self.assertEqual(self.request('DELETE',path,{'revision':1},user='2')[0],404)

    def test_revision_conflict_and_delete(self):
        _,created=self.request('POST',data=self.sample())
        path='/'+created['id'];data={**self.sample(),'revision':1,'title':'更新'}
        self.assertEqual(self.request('PUT',path,data)[0],200)
        self.assertEqual(self.request('PUT',path,data)[0],409)
        self.assertEqual(self.request('DELETE',path,{'revision':1})[0],409)
        with patch.object(app,'remove_artifacts') as removed:
            self.assertEqual(self.request('DELETE',path,{'revision':2})[0],200)
            removed.assert_called_once_with(1,created['id'])
        self.assertEqual(self.request(path=path)[0],404)

    def test_auth_origin_and_changed_account(self):
        self.assertEqual(self.request(user='')[0],401)
        self.assertEqual(self.request('POST',data=self.sample(),origin='https://evil.example')[0],403)
        self.assertEqual(self.request('POST',data=self.sample(),user='2',expected='1')[0],401)
        self.assertEqual(self.request(user='2')[1]['items'],[])

    def test_validation_and_secret_not_persisted(self):
        data={**self.sample(),'key':'secret','messages':[{'role':'assistant','content':'text','key':'secret'}]}
        _,created=self.request('POST',data=data)
        loaded=self.request(path='/'+created['id'])[1]
        self.assertNotIn('secret',json.dumps(loaded))
        data['messages']=[{'role':'system','content':'not allowed'}]
        self.assertEqual(self.request('POST',data=data)[0],400)

    def test_additional_token_model_can_be_saved(self):
        data={**self.sample(),'model':'gpt-4','messages':[{'role':'assistant','content':'完成','model':'gpt-4'}]}
        status,created=self.request('POST',data=data)
        self.assertEqual(status,201)
        loaded=self.request(path='/'+created['id'])[1]
        self.assertEqual(loaded['model'],'gpt-4')
        self.assertEqual(loaded['messages'][0]['model'],'gpt-4')
        for invalid in ('', 'bad model', '../model', 'a'*101):
            self.assertEqual(self.request('POST',data={**data,'model':invalid})[0],400)

    def test_attachment_metadata_is_saved_without_bytes(self):
        data={**self.sample(),'messages':[
            {'role':'user','content':'分析','attachments':[{'name':'input.png','data':'PRIVATE_SOURCE'}]},
            {'role':'assistant','content':'完成','attachments':[{'id':'a'*32,'name':'result.pdf','expires':2000000000,'data':'PRIVATE_RESULT'}]},
        ]}
        _,created=self.request('POST',data=data)
        loaded=self.request(path='/'+created['id'])[1]
        self.assertEqual(loaded['messages'][1]['attachments'][0]['name'],'result.pdf')
        self.assertNotIn('PRIVATE_',json.dumps(loaded))

if __name__ == '__main__':
    unittest.main()
