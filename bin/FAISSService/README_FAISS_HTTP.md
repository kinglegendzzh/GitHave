# Faiss HTTP服务使用说明

## 概述

本项目实现了一个基于Python的Faiss服务，通过REST API提供向量索引、添加和搜索功能，以替代原有的CGO实现。这种方式可以避免CGO的复杂性，同时保留Faiss的高性能特性，并且更容易调试。

## 依赖

### Python端

- Python 3.6+
- Flask
- NumPy
- Faiss

可以通过以下命令安装依赖：

```bash
pip install flask numpy faiss-cpu
# 或者使用GPU版本
# pip install flask numpy faiss-gpu
```

### Go端

无需额外依赖，使用标准库的HTTP客户端。

## 使用方法

### 1. 启动Python Faiss服务

```bash
cd /Users/apple/Public/openProject/FAISSService
python faiss_server.py
```

服务默认在`http://localhost:5533`上运行。

### 2. 在Go代码中使用

无需修改现有代码，`index.go`中的`NewFaissWrapper`函数会自动尝试连接到Faiss服务。如果连接成功，将使用HTTP API；如果连接失败，将回退到CGO实现；如果CGO实现也失败，将使用内存实现。

## API说明

### Python服务端API

- `POST /create_index`: 创建一个新的Faiss索引
- `POST /add_vector`: 添加一个向量到索引
- `POST /add_vectors_batch`: 批量添加向量到索引
- `POST /search_vectors`: 查找最接近查询向量的topK个向量
- `POST /save_index`: 将Faiss索引保存到文件
- `POST /load_index`: 从文件加载Faiss索引

### Go客户端API

- `NewFaissHTTPWrapper`: 创建一个新的Faiss HTTP客户端
- `AddVector`: 添加一个向量到索引
- `AddVectorsBatch`: 批量添加向量到索引
- `SearchVectors`: 查找最接近查询向量的topK个向量
- `SaveToFile`: 将Faiss索引保存到文件
- `LoadFromFile`: 从文件加载Faiss索引

## 调试

使用HTTP API的一个主要优势是可以更容易地调试。可以使用工具如curl、Postman等直接与API交互，也可以在Python服务端添加日志输出。

例如，使用curl测试搜索API：

```bash
curl -X POST http://localhost:5000/search_vectors \
  -H "Content-Type: application/json" \
  -d '{"index_id":"default","query":[0.1,0.2,0.3],"top_k":5}'
```

## 性能考虑

使用HTTP API会引入一些网络开销，但对于大多数用例来说，这种开销是可以接受的。如果需要更高的性能，可以考虑以下优化：

1. 使用批量操作（如`AddVectorsBatch`）而不是单个操作
2. 将Python服务部署在同一台机器上，减少网络延迟
3. 对于非常高的吞吐量需求，可以考虑使用gRPC而不是REST API

## 故障排除

1. 如果无法连接到Python服务，确保服务正在运行，并检查防火墙设置
2. 如果遇到"connection refused"错误，检查服务地址和端口是否正确
3. 如果遇到超时错误，可能需要增加HTTP客户端的超时设置