import os
import json
import tempfile
import unittest
from unittest.mock import patch, MagicMock
import numpy as np
import faiss
from faiss_server import app, indices

class TestSaveIndex(unittest.TestCase):
    def setUp(self):
        # 创建测试客户端
        self.app = app.test_client()
        self.app.testing = True
        
        # 清空全局索引字典
        indices.clear()
        
        # 创建临时目录用于保存索引文件
        self.temp_dir = tempfile.mkdtemp()
        
        # 创建测试索引
        self.index_id = 'test_index'
        self.dimension = 10
        response = self.app.post('/create_index', 
                               json={'index_id': self.index_id, 'dimension': self.dimension})
        self.assertEqual(response.status_code, 200)
        
        # 添加测试向量
        self.test_vectors = np.random.random((5, self.dimension)).astype('float32')
        self.test_func_ids = ['func1', 'func2', 'func3', 'func4', 'func5']
        
        response = self.app.post('/add_vectors_batch', 
                               json={
                                   'index_id': self.index_id,
                                   'func_ids': self.test_func_ids,
                                   'vectors': self.test_vectors.tolist()
                               })
        self.assertEqual(response.status_code, 200)
    
    def tearDown(self):
        # 清理临时文件和目录
        for root, dirs, files in os.walk(self.temp_dir, topdown=False):
            for file in files:
                os.remove(os.path.join(root, file))
            for dir in dirs:
                os.rmdir(os.path.join(root, dir))
        os.rmdir(self.temp_dir)
        
        # 清空全局索引字典
        indices.clear()
    
    def test_save_index_success(self):
        """测试成功保存索引"""
        save_path = os.path.join(self.temp_dir, 'test_index.faiss')
        
        response = self.app.post('/save_index',
                               json={
                                   'index_id': self.index_id,
                                   'local_path': save_path
                               })
        
        # 验证响应
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['save_path'], save_path)
        
        # 验证文件是否存在
        self.assertTrue(os.path.exists(save_path))
        self.assertTrue(os.path.exists(save_path + '.meta'))
        
        # 验证元数据文件内容
        with open(save_path + '.meta', 'r') as f:
            metadata = json.load(f)
            self.assertEqual(metadata['dimension'], self.dimension)
            self.assertEqual(metadata['metric_type'], 1)  # 默认使用内积
            
            # 验证ID映射
            id_map = {int(k): v for k, v in metadata['id_map'].items()}
            self.assertEqual(len(id_map), len(self.test_func_ids))
            for i, func_id in enumerate(self.test_func_ids):
                self.assertEqual(id_map[i], func_id)
    
    def test_save_index_nonexistent_index(self):
        """测试保存不存在的索引"""
        save_path = os.path.join(self.temp_dir, 'nonexistent_index.faiss')
        
        response = self.app.post('/save_index',
                               json={
                                   'index_id': 'nonexistent_index',
                                   'local_path': save_path
                               })
        
        # 验证响应
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'error')
        self.assertIn('not found', data['message'])
        
        # 验证文件不存在
        self.assertFalse(os.path.exists(save_path))
        self.assertFalse(os.path.exists(save_path + '.meta'))
    
    def test_save_index_missing_path(self):
        """测试缺少路径参数"""
        response = self.app.post('/save_index',
                               json={
                                   'index_id': self.index_id
                                   # 没有提供path或local_path
                               })
        
        # 验证响应
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'error')
        self.assertIn('Missing path', data['message'])
    
    def test_save_index_with_path_creation(self):
        """测试保存到需要创建目录的路径"""
        nested_dir = os.path.join(self.temp_dir, 'nested', 'dir')
        save_path = os.path.join(nested_dir, 'test_index.faiss')
        
        response = self.app.post('/save_index',
                               json={
                                   'index_id': self.index_id,
                                   'local_path': save_path
                               })
        
        # 验证响应
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        
        # 验证目录和文件是否被创建
        self.assertTrue(os.path.exists(nested_dir))
        self.assertTrue(os.path.exists(save_path))
        self.assertTrue(os.path.exists(save_path + '.meta'))
    
    @patch('faiss.write_index')
    def test_save_index_faiss_error(self, mock_write_index):
        """测试保存索引时发生错误"""
        # 模拟faiss.write_index抛出异常
        mock_write_index.side_effect = RuntimeError("Simulated faiss error")
        
        save_path = os.path.join(self.temp_dir, 'error_index.faiss')
        
        response = self.app.post('/save_index',
                               json={
                                   'index_id': self.index_id,
                                   'local_path': save_path
                               })
        
        # 验证响应
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'error')
        self.assertIn('Simulated faiss error', data['message'])
    
    def test_save_and_load_index(self):
        """测试保存索引后能否正确加载"""
        save_path = os.path.join(self.temp_dir, 'save_load_test.faiss')
        
        # 保存索引
        save_response = self.app.post('/save_index',
                                    json={
                                        'index_id': self.index_id,
                                        'local_path': save_path
                                    })
        self.assertEqual(save_response.status_code, 200)
        
        # 删除当前索引
        delete_response = self.app.post('/delete_index',
                                      json={
                                          'index_id': self.index_id
                                      })
        self.assertEqual(delete_response.status_code, 200)
        
        # 加载索引
        load_response = self.app.post('/load_index',
                                    json={
                                        'index_id': 'loaded_index',
                                        'local_path': save_path
                                    })
        self.assertEqual(load_response.status_code, 200)
        load_data = json.loads(load_response.data)
        self.assertEqual(load_data['status'], 'success')
        self.assertEqual(load_data['dimension'], self.dimension)
        self.assertEqual(load_data['ntotal'], len(self.test_func_ids))
        
        # 验证加载的索引能否正确搜索
        test_query = np.random.random(self.dimension).astype('float32')
        search_response = self.app.post('/search_vectors',
                                      json={
                                          'index_id': 'loaded_index',
                                          'query': test_query.tolist(),
                                          'top_k': 5
                                      })
        self.assertEqual(search_response.status_code, 200)
        search_data = json.loads(search_response.data)
        self.assertEqual(search_data['status'], 'success')
        self.assertEqual(len(search_data['results']), 5)

if __name__ == '__main__':
    unittest.main()