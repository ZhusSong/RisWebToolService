import base64
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('artifact_store', Path(__file__).parents[1] / 'files/artifact_store.py')
store = importlib.util.module_from_spec(spec)
spec.loader.exec_module(store)


class ArtifactStoreTests(unittest.TestCase):
    def test_owner_conversation_expiry_and_cleanup(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(store, 'ROOT', Path(folder)):
            with patch.object(store.time, 'time', return_value=1000):
                item = store.save(1, 'conversation-a', {'name': '结果.pdf', 'mime': 'application/pdf', 'data': base64.b64encode(b'pdf').decode()})
            self.assertEqual(item['expires'], 1000 + 86400)
            self.assertIsNotNone(store.lookup(item['id'], 1, 'conversation-a', 1001))
            self.assertIsNone(store.lookup(item['id'], 2, 'conversation-a', 1001))
            self.assertIsNone(store.lookup(item['id'], 1, 'conversation-b', 1001))
            self.assertIsNone(store.lookup(item['id'], 1, 'conversation-a', item['expires']))
            self.assertEqual(store.cleanup(item['expires']), 1)
            self.assertFalse((Path(folder) / item['id']).exists())

    def test_conversation_deletion_and_filename_validation(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(store, 'ROOT', Path(folder)):
            artifact = {'name': 'result.txt', 'mime': 'text/plain', 'data': base64.b64encode(b'hello').decode()}
            item = store.save(1, 'conversation-a', artifact)
            other = store.save(1, 'conversation-b', artifact)
            store.delete_conversation(1, 'conversation-a')
            self.assertIsNone(store.lookup(item['id'], 1, 'conversation-a'))
            self.assertIsNotNone(store.lookup(other['id'], 1, 'conversation-b'))
            with self.assertRaises(ValueError):
                store.save(1, 'conversation-a', {**artifact, 'name': '../private.txt'})


if __name__ == '__main__':
    unittest.main()
