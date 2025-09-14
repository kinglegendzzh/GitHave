import os
import json
import numpy as np
import faiss
import atexit
import signal
import sys
import time
import threading
import psutil
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

# ========= 日志配置（安全可写 + 滚动）=========
from pathlib import Path
import tempfile
import logging
import logging.handlers

APP_DIR = Path(__file__).resolve().parent
# 可通过环境变量覆盖默认目录：GITHAVE_DATA_DIR / FAISS_LOG_DIR
DATA_DIR = Path(os.getenv("GITHAVE_DATA_DIR", APP_DIR / "data"))
LOG_DIR  = Path(os.getenv("FAISS_LOG_DIR", DATA_DIR / "logs"))
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOG_FILE = LOG_DIR / "faiss_server.log"

handlers = [logging.StreamHandler()]

try:
    # 10MB/卷，保留5卷；按需调整
    handlers.append(
        logging.handlers.RotatingFileHandler(
            LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
        )
    )
except OSError:
    # 若 LOG_DIR 仍不可写，回退到系统临时目录
    fallback = Path(tempfile.gettempdir()) / "faiss_server.log"
    handlers.append(logging.FileHandler(fallback, encoding="utf-8"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=handlers,
)
logger = logging.getLogger("faiss_server")
# ============================================


app = Flask(__name__)
CORS(app, resources={r"/health": {"origins": "*"}})

# 存储索引的全局变量
indices = {}

# 配置参数
CONFIG = {
    'AUTO_SAVE_INTERVAL': 30 * 60,  # 自动保存间隔（秒）
    'MEMORY_CHECK_INTERVAL': 60,  # 内存检查间隔（秒）
    'MAX_MEMORY_PERCENT': 80,  # 最大内存使用百分比
    'VECTOR_COUNT_THRESHOLD': 10000,  # 向量数量阈值，超过此值触发保存
    'DEFAULT_SAVE_DIR': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saved_indices'),  # 默认保存目录
    'ENABLE_AUTO_CLEANUP': True,  # 是否启用自动清理
}

# 确保保存目录存在
os.makedirs(CONFIG['DEFAULT_SAVE_DIR'], exist_ok=True)

# 统计信息
STATS = {
    'add_vector_count': 0,  # 添加向量的总数
    'last_cleanup_time': time.time(),  # 上次清理时间
    'last_save_time': time.time(),  # 上次保存时间
    'operation_count': 0,  # 操作计数
}

# 线程锁，用于保护关键操作
index_lock = threading.RLock()


def get_or_create_index(index_id, dimension=None, use_inner_product=True):
    """
    获取或自动创建指定 index_id 的索引。
    1. 先查内存
    2. 再尝试从磁盘加载（saved_indices目录下）
    3. 若都没有，则新建
    返回: (index_data, is_new)
    """
    with index_lock:
        # 1. 先查内存
        if index_id in indices:
            logger.info(f"从内存获取索引 {index_id}")
            return indices[index_id], False

        # 2. 查磁盘
        import glob
        save_dir = CONFIG['DEFAULT_SAVE_DIR']
        # 如果index_id是绝对路径，只取文件名部分来查找
        safe_index_id = os.path.basename(index_id) if os.path.isabs(index_id) else index_id
        pattern = os.path.join(save_dir, f"{safe_index_id}*.index")
        files = glob.glob(pattern)
        if files:
            # 取最新的一个
            files.sort(key=os.path.getmtime, reverse=True)
            index_path = files[0]
            meta_path = index_path + '.meta'
            try:
                index = faiss.read_index(index_path)
                if os.path.exists(meta_path):
                    with open(meta_path, 'r') as f:
                        metadata = json.load(f)
                        dim = metadata.get('dimension', dimension or 768)
                        metric_type = metadata.get('metric_type', 1 if use_inner_product else 0)
                        id_map = {int(k): v for k, v in metadata.get('id_map', {}).items()}
                else:
                    dim = index.d
                    metric_type = 1 if use_inner_product else 0
                    id_map = {}
                indices[index_id] = {
                    'index': index,
                    'dimension': dim,
                    'metric_type': metric_type,
                    'scores': {},
                    'id_map': id_map
                }
                logger.info(f"自动从磁盘加载索引 {index_id} 成功: {index_path}")
                return indices[index_id], False
            except Exception as e:
                logger.error(f"自动加载索引 {index_id} 失败: {e}")
                # 继续尝试新建

        # 3. 新建
        dim = dimension or 768
        metric_type = 1 if use_inner_product else 0
        try:
            if metric_type == 1:
                index = faiss.IndexFlatIP(dim)
            else:
                index = faiss.IndexFlatL2(dim)
            indices[index_id] = {
                'index': index,
                'dimension': dim,
                'metric_type': metric_type,
                'scores': {},
                'id_map': {}
            }
            logger.info(f"自动新建索引 {index_id}, dimension={dim}, metric_type={metric_type}")
            return indices[index_id], True
        except Exception as e:
            logger.error(f"自动新建索引 {index_id} 失败: {e}")
            raise

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
    """添加一个向量到索引，如果func_id已存在则先删除旧向量"""
    global STATS
    
    data = request.json
    index_id = data.get('index_id', 'default')
    func_id = data.get('func_id')
    vector = data.get('vector')
    
    # 自动确保index存在（自动加载/新建）
    dimension = data.get('dimension', 768)
    use_inner_product = data.get('use_inner_product', True)
    try:
        index_data, _ = get_or_create_index(index_id, dimension=dimension, use_inner_product=use_inner_product)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Failed to get/create index: {e}'}), 500

    if func_id is None or vector is None:
        return jsonify({'status': 'error', 'message': 'Missing func_id or vector'}), 400
    
    try:
        # 使用线程锁保护索引操作
        with index_lock:
            index_data = indices[index_id]
            index = index_data['index']
            dimension = index_data['dimension']
            
            # 检查是否已存在相同的func_id，如果存在则删除
            existing_internal_ids = []
            for internal_id, existing_func_id in list(index_data['id_map'].items()):
                if existing_func_id == func_id:
                    existing_internal_ids.append(internal_id)
            
            # 如果找到了已存在的func_id，删除对应的向量
            if existing_internal_ids:
                # 从id_map中删除
                for internal_id in existing_internal_ids:
                    del index_data['id_map'][internal_id]
                
                # 记录删除操作，实际向量会在重建索引时被移除
                logger.info(f"Removed existing vector(s) for func_id {func_id} from index {index_id}")
            
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
            
            # 更新统计信息
            STATS['add_vector_count'] += 1
            STATS['operation_count'] += 1
            
            # 检查是否需要触发自动保存或清理
            if STATS['add_vector_count'] >= CONFIG['VECTOR_COUNT_THRESHOLD']:
                # 在后台线程中执行，避免阻塞当前请求
                threading.Thread(target=auto_save_indices, daemon=True).start()
                logger.info(f"触发自动保存：已添加 {STATS['add_vector_count']} 个向量，超过阈值 {CONFIG['VECTOR_COUNT_THRESHOLD']}")
                STATS['add_vector_count'] = 0  # 重置计数器
            
            # 每100次操作检查一次内存使用情况
            if STATS['operation_count'] % 100 == 0:
                memory_usage = get_memory_usage()
                logger.info(f"当前内存使用: {memory_usage['percent']:.2f}% (进程), {memory_usage['system_percent']:.2f}% (系统)")
                
                # 如果内存使用过高，触发清理
                if memory_usage['percent'] > CONFIG['MAX_MEMORY_PERCENT'] or memory_usage['system_percent'] > CONFIG['MAX_MEMORY_PERCENT']:
                    # 在后台线程中执行，避免阻塞当前请求
                    threading.Thread(target=check_and_cleanup_memory, daemon=True).start()
        
        return jsonify({
            'status': 'success', 
            'message': f'Added vector for func_id {func_id}' + 
                      (f' (replaced {len(existing_internal_ids)} existing vectors)' if existing_internal_ids else ''),
            'internal_id': internal_id
        })
    except Exception as e:
        logger.error(f"添加向量时出错: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/add_vectors_batch', methods=['POST'])
def add_vectors_batch():
    """批量添加向量到索引，如果func_id已存在则先删除旧向量"""
    global STATS
    
    data = request.json
    index_id = data.get('index_id', 'default')
    func_ids = data.get('func_ids', [])
    vectors = data.get('vectors', [])
    
    # 自动确保index存在（自动加载/新建）
    dimension = data.get('dimension', 768)
    use_inner_product = data.get('use_inner_product', True)
    try:
        index_data, _ = get_or_create_index(index_id, dimension=dimension, use_inner_product=use_inner_product)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Failed to get/create index: {e}'}), 500

    if not func_ids or not vectors:
        return jsonify({'status': 'error', 'message': 'Missing func_ids or vectors'}), 400
    
    try:
        # 使用线程锁保护索引操作
        with index_lock:
            index_data = indices[index_id]
            index = index_data['index']
            dimension = index_data['dimension']
            
            # 检查是否有已存在的func_id，如果有则记录需要删除的internal_id
            removed_count = 0
            for func_id in func_ids:
                existing_internal_ids = []
                for internal_id, existing_func_id in list(index_data['id_map'].items()):
                    if existing_func_id == func_id:
                        existing_internal_ids.append(internal_id)
                        del index_data['id_map'][internal_id]
                        removed_count += 1
                
                if existing_internal_ids:
                    logger.info(f"Removed existing vector(s) for func_id {func_id} from index {index_id}")
            
            # 将向量列表转换为numpy数组
            vectors_np = np.array(vectors, dtype=np.float32)
            
            # 确保向量维度正确
            if vectors_np.shape[1] != dimension:
                # 创建正确维度的数组
                resized_vectors = np.zeros((len(func_ids), dimension), dtype=np.float32)
                # 复制数据，确保不超出边界
                min_dim = min(vectors_np.shape[1], dimension)
                resized_vectors[:, :min_dim] = vectors_np[:, :min_dim]
                vectors_np = resized_vectors
            
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
            
            # 更新统计信息
            STATS['add_vector_count'] += len(func_ids)
            STATS['operation_count'] += 1
            
            # 检查是否需要触发自动保存或清理
            if STATS['add_vector_count'] >= CONFIG['VECTOR_COUNT_THRESHOLD']:
                # 在后台线程中执行，避免阻塞当前请求
                threading.Thread(target=auto_save_indices, daemon=True).start()
                logger.info(f"触发自动保存：已添加 {STATS['add_vector_count']} 个向量，超过阈值 {CONFIG['VECTOR_COUNT_THRESHOLD']}")
                STATS['add_vector_count'] = 0  # 重置计数器
            
            # 每10次批量操作检查一次内存使用情况
            if STATS['operation_count'] % 10 == 0:
                memory_usage = get_memory_usage()
                logger.info(f"当前内存使用: {memory_usage['percent']:.2f}% (进程), {memory_usage['system_percent']:.2f}% (系统)")
                
                # 如果内存使用过高，触发清理
                if memory_usage['percent'] > CONFIG['MAX_MEMORY_PERCENT'] or memory_usage['system_percent'] > CONFIG['MAX_MEMORY_PERCENT']:
                    # 在后台线程中执行，避免阻塞当前请求
                    threading.Thread(target=check_and_cleanup_memory, daemon=True).start()
        
        return jsonify({
            'status': 'success', 
            'message': f'Added {len(func_ids)} vectors' + 
                      (f' (replaced {removed_count} existing vectors)' if removed_count else ''),
            'start_internal_id': start_id
        })
    except Exception as e:
        logger.error(f"批量添加向量时出错: {str(e)}")
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

def get_memory_usage():
    """获取当前进程的内存使用情况"""
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    return {
        'rss': memory_info.rss,  # 物理内存使用
        'vms': memory_info.vms,  # 虚拟内存使用
        'percent': process.memory_percent(),  # 内存使用百分比
        'system_percent': psutil.virtual_memory().percent  # 系统内存使用百分比
    }

def auto_save_indices():
    """自动保存所有索引到磁盘"""
    with index_lock:
        logger.info("开始自动保存索引...")
        for index_id, index_data in list(indices.items()):
            try:
                # 生成保存路径
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                # 如果index_id是绝对路径，只取文件名部分
                safe_index_id = os.path.basename(index_id) if os.path.isabs(index_id) else index_id
                save_path = os.path.join(CONFIG['DEFAULT_SAVE_DIR'], f"{safe_index_id}_{timestamp}.index")
                
                # 保存索引
                faiss.write_index(index_data['index'], save_path)
                
                # 保存元数据
                metadata_path = save_path + '.meta'
                with open(metadata_path, 'w') as f:
                    json.dump({
                        'dimension': index_data['dimension'],
                        'metric_type': index_data['metric_type'],
                        'id_map': {str(k): v for k, v in index_data['id_map'].items()}
                    }, f)
                
                logger.info(f"自动保存索引 {index_id} 到 {save_path} 成功")
                
                # 清理该index_id之前时间戳的所有文件
                try:
                    import glob
                    # 查找所有该index_id的文件
                    pattern = os.path.join(CONFIG['DEFAULT_SAVE_DIR'], f"{safe_index_id}_*.index")
                    existing_files = glob.glob(pattern)
                    
                    # 按修改时间排序，保留最新的文件
                    existing_files.sort(key=os.path.getmtime, reverse=True)
                    
                    # 删除除了刚保存的文件之外的所有旧文件
                    files_to_delete = [f for f in existing_files if f != save_path]
                    
                    for old_file in files_to_delete:
                        # 删除索引文件
                        if os.path.exists(old_file):
                            os.remove(old_file)
                            logger.info(f"删除旧索引文件: {old_file}")
                        
                        # 删除对应的元数据文件
                        old_meta_file = old_file + '.meta'
                        if os.path.exists(old_meta_file):
                            os.remove(old_meta_file)
                            logger.info(f"删除旧元数据文件: {old_meta_file}")
                    
                    if files_to_delete:
                        logger.info(f"清理完成，删除了 {len(files_to_delete)} 个旧版本的索引文件")
                        
                except Exception as cleanup_error:
                    logger.error(f"清理旧文件时出错: {cleanup_error}")
                    
            except Exception as e:
                logger.error(f"自动保存索引 {index_id} 时出错: {e}")
        
        STATS['last_save_time'] = time.time()

def check_and_cleanup_memory():
    """检查内存使用情况，必要时进行清理"""
    if not CONFIG['ENABLE_AUTO_CLEANUP']:
        return
    
    memory_usage = get_memory_usage()
    logger.info(f"内存使用情况: {memory_usage['percent']:.2f}% (进程), {memory_usage['system_percent']:.2f}% (系统)")
    
    # 如果内存使用超过阈值，执行清理
    if memory_usage['percent'] > CONFIG['MAX_MEMORY_PERCENT'] or memory_usage['system_percent'] > CONFIG['MAX_MEMORY_PERCENT']:
        logger.warning(f"内存使用超过阈值 {CONFIG['MAX_MEMORY_PERCENT']}%，执行自动清理")
        
        with index_lock:
            # 先保存所有索引
            auto_save_indices()
            
            # 然后清理内存
            for index_id in list(indices.keys()):
                try:
                    # 记录索引大小
                    index_size = indices[index_id]['index'].ntotal
                    logger.info(f"清理索引 {index_id}，包含 {index_size} 个向量")
                    
                    # 删除索引
                    del indices[index_id]
                except Exception as e:
                    logger.error(f"清理索引 {index_id} 时出错: {e}")
            
            # 强制垃圾回收
            import gc
            gc.collect()
            
            # 更新清理时间
            STATS['last_cleanup_time'] = time.time()
            STATS['add_vector_count'] = 0
            
            logger.info("内存清理完成")

def cleanup_resources():
    """清理所有资源，防止资源泄漏"""
    global indices
    
    # 停止调度器
    if hasattr(app, 'scheduler') and app.scheduler:
        logger.info("停止调度器...")
        app.scheduler.shutdown()
    
    # 清理所有已保存的索引（save_indices路径）
    try:
        if os.path.exists(CONFIG['DEFAULT_SAVE_DIR']):
            logger.info(f"清理保存目录: {CONFIG['DEFAULT_SAVE_DIR']}")
            for filename in os.listdir(CONFIG['DEFAULT_SAVE_DIR']):
                if filename.endswith('.index') or filename.endswith('.meta'):
                    file_path = os.path.join(CONFIG['DEFAULT_SAVE_DIR'], filename)
                    os.remove(file_path)
                    logger.info(f"删除文件: {file_path}")
            logger.info("已清理所有保存的索引文件")
    except Exception as e:
        logger.error(f"退出时清理索引出错: {e}")
    
    # 清理所有索引
    for index_id in list(indices.keys()):
        try:
            del indices[index_id]
        except Exception as e:
            logger.error(f"清理索引 {index_id} 时出错: {e}")

    # 确保indices被清空
    indices = {}
    logger.info("所有FAISS资源已清理")

# 注册退出时的清理函数
atexit.register(cleanup_resources)

# 注册信号处理器
def signal_handler(sig, frame):
    print(f"接收到信号 {sig}，正在清理资源...")
    cleanup_resources()
    sys.exit(0)

# 注册常见的终止信号
signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
signal.signal(signal.SIGTERM, signal_handler)  # 终止信号

# 初始化定时任务调度器
def init_scheduler():
    """初始化定时任务调度器"""
    scheduler = BackgroundScheduler()
    
    # 添加定时保存任务
    scheduler.add_job(
        auto_save_indices, 
        'interval', 
        seconds=CONFIG['AUTO_SAVE_INTERVAL'],
        id='auto_save_job',
        replace_existing=True
    )
    
    # 添加内存检查任务
    scheduler.add_job(
        check_and_cleanup_memory, 
        'interval', 
        seconds=CONFIG['MEMORY_CHECK_INTERVAL'],
        id='memory_check_job',
        replace_existing=True
    )
    
    # 启动调度器
    scheduler.start()
    logger.info("定时任务调度器已启动")
    
    # 将调度器保存到app对象中，以便在退出时关闭
    app.scheduler = scheduler

# 添加一个新的API端点来查看统计信息
@app.route('/stats', methods=['GET'])
def get_stats():
    """获取服务统计信息"""
    memory_usage = get_memory_usage()
    
    # 收集每个索引的信息
    indices_info = {}
    for index_id, index_data in indices.items():
        indices_info[index_id] = {
            'vector_count': index_data['index'].ntotal,
            'dimension': index_data['dimension'],
            'metric_type': 'inner_product' if index_data['metric_type'] == 1 else 'L2'
        }
    
    return jsonify({
        'status': 'success',
        'stats': {
            'memory_usage': {
                'percent': f"{memory_usage['percent']:.2f}%",
                'system_percent': f"{memory_usage['system_percent']:.2f}%",
                'rss_mb': f"{memory_usage['rss'] / (1024 * 1024):.2f} MB"
            },
            'operation_stats': {
                'add_vector_count': STATS['add_vector_count'],
                'operation_count': STATS['operation_count'],
                'last_cleanup_time': datetime.fromtimestamp(STATS['last_cleanup_time']).strftime('%Y-%m-%d %H:%M:%S'),
                'last_save_time': datetime.fromtimestamp(STATS['last_save_time']).strftime('%Y-%m-%d %H:%M:%S')
            },
            'indices': indices_info,
            'config': CONFIG
        }
    })

@app.route('/quit', methods=['GET'])
def quit_server():
    """优雅地关闭FAISS服务器"""
    try:
        logger.info("收到关闭服务器请求，开始清理资源...")
        
        # 执行资源清理
        cleanup_resources()
        
        # 返回成功响应
        response = jsonify({
            'status': 'success',
            'message': 'FAISS服务器已成功关闭，所有资源已清理'
        })
        
        # 在后台线程中延迟关闭服务器，确保响应能够发送
        def shutdown_server():
            import time
            time.sleep(1)  # 等待1秒确保响应发送完成
            logger.info("正在关闭FAISS服务器...")
            os._exit(0)  # 强制退出程序
        
        threading.Thread(target=shutdown_server, daemon=True).start()
        
        return response
        
    except Exception as e:
        logger.error(f"关闭服务器时出错: {e}")
        return jsonify({
            'status': 'error',
            'message': f'关闭服务器时出错: {str(e)}'
        }), 500

if __name__ == '__main__':
    # 初始化定时任务调度器
    init_scheduler()
    
    # 在生产环境中关闭debug模式
    logger.info("启动FAISS服务器在端口5533...")
    app.run(host='0.0.0.0', port=5533, debug=False, threaded=True)