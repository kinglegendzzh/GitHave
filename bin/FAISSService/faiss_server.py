import os
import json
import numpy as np
import faiss
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/health": {"origins": "*"}})

# 存储索引的全局变量
indices = {}

@app.route('/create_index', methods=['POST'])
def create_index():
    """创建一个新的Faiss索引"""
    data = request.json
    index_id = data.get('index_id', 'default')
    dimension = data.get('dimension', 768)
    use_inner_product = data.get('use_inner_product', True)

    if index_id in indices:
        return jsonify({'status': 'error', 'message': f'Index {index_id} already exists'}), 400

    try:
        if use_inner_product:
            index = faiss.IndexFlatIP(dimension)  # 使用内积
        else:
            index = faiss.IndexFlatL2(dimension)  # 使用L2距离

        indices[index_id] = {
            'index': index,
            'dimension': dimension,
            'metric_type': 1 if use_inner_product else 0,
            'scores': {},  # 存储最近一次搜索的分数
            'id_map': {}   # 映射内部ID到外部ID
        }

        return jsonify({
            'status': 'success',
            'message': f'Created index {index_id} with dimension {dimension}',
            'dimension': dimension,
            'metric_type': 1 if use_inner_product else 0
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/add_vector', methods=['POST'])
def add_vector():
    """添加一个向量到索引"""
    data = request.json
    index_id = data.get('index_id', 'default')
    func_id = data.get('func_id')
    vector = data.get('vector')

    if index_id not in indices:
        return jsonify({'status': 'error', 'message': f'Index {index_id} not found'}), 404

    if func_id is None or vector is None:
        return jsonify({'status': 'error', 'message': 'Missing func_id or vector'}), 400

    try:
        index_data = indices[index_id]
        index = index_data['index']
        dimension = index_data['dimension']

        # 确保向量维度正确
        vector_np = np.array(vector, dtype=np.float32)
        if len(vector_np) != dimension:
            # 调整向量大小
            resized = np.zeros(dimension, dtype=np.float32)
            resized[:min(len(vector_np), dimension)] = vector_np[:min(len(vector_np), dimension)]
            vector_np = resized

        # 对于内积相似度，需要归一化向量
        if index_data['metric_type'] == 1:  # 内积度量
            norm = np.linalg.norm(vector_np)
            if norm > 0:
                vector_np = vector_np / norm

        # 获取当前索引中的向量数量作为内部ID
        internal_id = index.ntotal
        index_data['id_map'][internal_id] = func_id

        # 添加向量到索引
        index.add(vector_np.reshape(1, -1))

        return jsonify({
            'status': 'success',
            'message': f'Added vector for func_id {func_id}',
            'internal_id': internal_id
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/add_vectors_batch', methods=['POST'])
def add_vectors_batch():
    """批量添加向量到索引"""
    data = request.json
    index_id = data.get('index_id', 'default')
    func_ids = data.get('func_ids', [])
    vectors = data.get('vectors', [])

    if index_id not in indices:
        return jsonify({'status': 'error', 'message': f'Index {index_id} not found'}), 404

    if not func_ids or not vectors:
        return jsonify({'status': 'error', 'message': 'Missing func_ids or vectors'}), 400

    try:
        index_data = indices[index_id]
        index = index_data['index']
        dimension = index_data['dimension']

        # 将向量列表转换为numpy数组
        vectors_np = np.array(vectors, dtype=np.float32).reshape(len(func_ids), dimension)

        # 对于内积相似度，需要归一化向量
        if index_data['metric_type'] == 1:  # 内积度量
            # 计算每个向量的范数
            norms = np.linalg.norm(vectors_np, axis=1, keepdims=True)
            # 避免除以零
            norms[norms == 0] = 1.0
            # 归一化向量
            vectors_np = vectors_np / norms

        # 获取当前索引中的向量数量作为起始内部ID
        start_id = index.ntotal

        # 添加向量到索引
        index.add(vectors_np)

        # 更新ID映射
        for i, func_id in enumerate(func_ids):
            index_data['id_map'][start_id + i] = func_id

        return jsonify({
            'status': 'success',
            'message': f'Added {len(func_ids)} vectors',
            'start_internal_id': start_id
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/search_vectors', methods=['POST'])
def search_vectors():
    """查找最接近查询向量的topK个向量"""
    data = request.json
    index_id = data.get('index_id', 'default')
    query = data.get('query')
    top_k = data.get('top_k', 10)

    if index_id not in indices:
        return jsonify({'status': 'error', 'message': f'Index {index_id} not found'}), 404

    if query is None:
        return jsonify({'status': 'error', 'message': 'Missing query vector'}), 400

    try:
        index_data = indices[index_id]
        index = index_data['index']
        dimension = index_data['dimension']

        # 确保向量维度正确
        query_np = np.array(query, dtype=np.float32)
        if len(query_np) != dimension:
            # 调整向量大小
            resized = np.zeros(dimension, dtype=np.float32)
            resized[:min(len(query_np), dimension)] = query_np[:min(len(query_np), dimension)]
            query_np = resized

        # 对于内积相似度，需要归一化向量
        if index_data['metric_type'] == 1:  # 内积度量
            norm = np.linalg.norm(query_np)
            if norm > 0:
                query_np = query_np / norm

        # 确保有向量可搜索
        if index.ntotal == 0:
            return jsonify({'status': 'success', 'results': [], 'scores': {}})

        # 限制topK不超过索引中的向量总数
        if index.ntotal < top_k:
            top_k = index.ntotal

        # 执行搜索
        distances, indices_result = index.search(query_np.reshape(1, -1), top_k)

        # 转换内部ID到外部ID
        results = []
        scores = {}

        for i in range(top_k):
            internal_id = indices_result[0][i]
            func_id = index_data['id_map'].get(int(internal_id), int(internal_id))
            results.append(func_id)
            scores[func_id] = float(distances[0][i])

        # 存储分数以供后续检索
        index_data['scores'] = scores

        return jsonify({
            'status': 'success',
            'results': results,
            'scores': scores
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/save_index', methods=['POST'])
def save_index():
    """将Faiss索引保存到文件"""
    data = request.json
    index_id = data.get('index_id', 'default')
    path = data.get('path')
    local_path = data.get('local_path')  # 新增参数，支持指定本地存储路径
    print(f"Saving index {index_id} to {path} or {local_path}")

    if index_id not in indices:
        return jsonify({'status': 'error', 'message': f'Index {index_id} not found'}), 404

    if not path and not local_path:
        return jsonify({'status': 'error', 'message': 'Missing path or local_path'}), 400

    try:
        index_data = indices[index_id]
        index = index_data['index']

        # 如果提供了local_path，优先使用它
        save_path = local_path if local_path else path

        # 确保目录存在
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        # 保存索引
        faiss.write_index(index, save_path)

        # 保存ID映射和其他元数据
        metadata_path = save_path + '.meta'
        with open(metadata_path, 'w') as f:
            json.dump({
                'dimension': index_data['dimension'],
                'metric_type': index_data['metric_type'],
                'id_map': {str(k): v for k, v in index_data['id_map'].items()}
            }, f)

        # 保存成功后，从内存中删除该索引，释放内存
        # del indices[index_id]
        return jsonify({
            'status': 'success',
            'message': f'Saved index to {save_path} and cleared from memory',
            'metadata_path': metadata_path,
            'save_path': save_path
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/load_index', methods=['POST'])
def load_index():
    """从文件加载Faiss索引"""
    data = request.json
    index_id = data.get('index_id', 'default')
    path = data.get('path')
    local_path = data.get('local_path')  # 新增参数，支持指定本地存储路径

    if not path and not local_path:
        return jsonify({'status': 'error', 'message': 'Missing path or local_path'}), 400

    try:
        # 如果提供了local_path，优先使用它
        load_path = local_path if local_path else path

        # 加载索引
        index = faiss.read_index(load_path)

        # 加载元数据
        metadata_path = load_path + '.meta'
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                dimension = metadata.get('dimension', 768)
                metric_type = metadata.get('metric_type', 1)
                id_map = {int(k): v for k, v in metadata.get('id_map', {}).items()}
        else:
            # 如果没有元数据，使用默认值
            dimension = index.d
            metric_type = 1  # 默认使用内积
            id_map = {}

        indices[index_id] = {
            'index': index,
            'dimension': dimension,
            'metric_type': metric_type,
            'scores': {},
            'id_map': id_map
        }

        return jsonify({
            'status': 'success',
            'message': f'Loaded index from {load_path}',
            'dimension': dimension,
            'metric_type': metric_type,
            'ntotal': index.ntotal,
            'load_path': load_path
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/delete_index', methods=['POST'])
def delete_index():
    """删除指定的Faiss索引"""
    data = request.json
    index_id = data.get('index_id', 'default')

    if index_id not in indices:
        return jsonify({'status': 'success', 'message': f'Index {index_id} not found or already deleted'})

    try:
        # 删除索引
        del indices[index_id]

        return jsonify({
            'status': 'success',
            'message': f'Deleted index {index_id}'
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """服务健康检查接口"""
    return jsonify({
        'status': 'healthy',
        'index_count': len(indices),
        'message': 'FAISS service is running'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5533, debug=True)
