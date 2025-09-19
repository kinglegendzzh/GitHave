import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Empty,
  Pagination,
  Tooltip,
  Popconfirm,
  Progress,
  Descriptions,
  Tabs,
  List,
  Badge,
  Divider,
  Switch,
  Drawer,
  Grid
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CloudUploadOutlined,
  FileZipOutlined,
  CodeOutlined,
  BranchesOutlined,
  HistoryOutlined,
  ReloadOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  GithubOutlined
} from '@ant-design/icons';
import { repositoryAPI } from '../services/api';
import RepositoryAnalysis from './RepositoryAnalysis';
import './RepositoryManager.css';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Dragger } = Upload;

const RepositoryManager = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [updateIndexModalVisible, setUpdateIndexModalVisible] = useState(false);
  const [indexListModalVisible, setIndexListModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [publishConfirmModalVisible, setPublishConfirmModalVisible] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState(null);
  const [publishRepositoryInfo, setPublishRepositoryInfo] = useState(null);
  const [repositoryIndexes, setRepositoryIndexes] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(new Set()); // 记录正在下载的项目
  const [showOptionalFields, setShowOptionalFields] = useState(false); // 控制可选字段显示
  const [previewDrawerVisible, setPreviewDrawerVisible] = useState(false); // 控制预览抽屉显示
  const [previewRepository, setPreviewRepository] = useState(null); // 当前预览的仓库
  const [form] = Form.useForm();
  const [updateForm] = Form.useForm();
  const [editForm] = Form.useForm();
  
  // 分页参数
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0
  });

  // 筛选参数
  const [filters, setFilters] = useState({
    category: '',
    language: '',
    status: 'active',
    sort: 'updated'
  });

  // 分类和语言选项
  const [categories, setCategories] = useState([]);
  const [languages] = useState([
    'JavaScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'TypeScript', 'C#', 'PHP', 'Ruby'
  ]);

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const response = await repositoryAPI.getRepositoryCategories();
      const data = response.data || response;
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // 获取用户仓库列表
  const fetchRepositories = async (page = 1, customFilters = {}) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.pageSize,
        sort: filters.sort,
        order: 'desc',
        status: filters.status,
        category: filters.category,
        language: filters.language,
        ...customFilters
      };
      
      // 过滤掉空值
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      
      const response = await repositoryAPI.getMyRepositories(params);
      const data = response.data || response;
      
      setRepositories(data.list || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: data.total || 0
      }));
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      message.error('获取仓库列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 上传仓库（支持 GitHub URL 或 文件上传）
  const handleUploadRepository = async (values) => {
    const importMethod = values.import_method || 'file';

    const formData = new FormData();

    if (importMethod === 'url') {
      const url = (values.url || '').trim();
      if (!url) {
        message.error('请输入有效的 GitHub 仓库 URL');
        return;
      }
      formData.append('url', url);
      if (values.name) formData.append('name', values.name);
      if (values.description) formData.append('description', values.description);
      if (values.language) formData.append('language', values.language);
      if (values.category) formData.append('category', values.category);
      formData.append('tags', values.tags ? (Array.isArray(values.tags) ? values.tags.join(',') : values.tags) : '');
      if (values.is_private !== undefined) formData.append('is_private', values.is_private);
      if (values.license) formData.append('license', values.license);
      if (values.homepage) formData.append('homepage', values.homepage);
    } else {
        // 文件上传模式
        if (!values.file || values.file.length === 0) {
          message.error('请选择要上传的文件');
          return;
        }

        if (!values.file[0]) {
          message.error('文件对象不存在，请重新选择文件');
          return;
        }

        // 获取文件对象
        let fileObj;
        if (values.file[0].originFileObj) {
          fileObj = values.file[0].originFileObj;
        } else if (values.file[0] instanceof File) {
          fileObj = values.file[0];
        } else {
          message.error('文件格式不正确');
          return;
        }

        formData.append('file', fileObj);
        formData.append('name', values.name);
        formData.append('description', values.description || '');
        formData.append('language', values.language || '');
        formData.append('category', values.category || '');
        formData.append('tags', values.tags ? (Array.isArray(values.tags) ? values.tags.join(',') : values.tags) : '');
        formData.append('is_private', values.is_private || false);
        formData.append('license', values.license || '');
        formData.append('homepage', values.homepage || '');
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      await repositoryAPI.uploadRepository(formData);
      message.success(importMethod === 'url' ? '仓库导入成功' : '仓库上传成功');
      setUploadModalVisible(false);
      form.resetFields();
      fetchRepositories(1);
    } catch (error) {
      message.error(error.error || (importMethod === 'url' ? '导入失败' : '上传失败'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 更新仓库索引
  const handleUpdateIndex = async (values) => {
    if (!values.file || values.file.length === 0) {
      message.error('请选择要上传的索引文件');
      return;
    }

    // 检查文件对象是否存在
    if (!values.file[0]) {
      message.error('文件对象不存在，请重新选择文件');
      return;
    }

    // 获取文件对象，处理不同的文件结构
    let fileObj;
    if (values.file[0].originFileObj) {
      fileObj = values.file[0].originFileObj;
    } else if (values.file[0] instanceof File) {
      fileObj = values.file[0];
    } else {
      message.error('文件格式不正确');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileObj);
    formData.append('repository_id', selectedRepository.id);
    formData.append('description', values.description || '');

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await repositoryAPI.updateRepositoryIndex(formData);
      message.success('索引更新成功');
      setUpdateIndexModalVisible(false);
      updateForm.resetFields();
      fetchRepositories(pagination.current);
    } catch (error) {
      message.error(error.error || '索引更新失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 查看仓库索引列表
  const handleViewIndexes = async (repository) => {
    setSelectedRepository(repository);
    try {
      const response = await repositoryAPI.getRepositoryIndexes(repository.id, 'active');
      const data = response.data || response;
      setRepositoryIndexes(data.index_files || []);
      setIndexListModalVisible(true);
    } catch (error) {
      message.error('获取索引列表失败');
    }
  };

  // 打开更新索引弹窗
  const handleOpenUpdateIndex = (repository) => {
    setSelectedRepository(repository);
    setUpdateIndexModalVisible(true);
  };

  // 打开编辑仓库弹窗
  const handleOpenEdit = (repository) => {
    setSelectedRepository(repository);
    // 设置编辑表单初始值，只包含可编辑的字段
    editForm.setFieldsValue({
      description: repository.description || '',
      language: repository.language || '',
      category: repository.category || '',
      tags: repository.tags ? repository.tags.join(',') : '',
      is_private: repository.is_private,
      license: repository.license || '',
      homepage: repository.homepage || ''
    });
    setEditModalVisible(true);
  };

  // 更新仓库信息
  const handleUpdateRepository = async (values) => {
    try {
      const response = await repositoryAPI.updateRepository(selectedRepository.id, values);
      message.success('仓库信息更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      fetchRepositories(pagination.current);
    } catch (error) {
      message.error(error.error || '更新失败');
    }
  };

  // 打开发布确认弹窗
  const handleOpenPublishConfirm = async (repository) => {
    try {
      // 获取仓库详情和索引信息
      const [detailResponse, indexResponse] = await Promise.all([
        repositoryAPI.getRepositoryDetail(repository.id, 'active'),
        repositoryAPI.getRepositoryIndexes(repository.id, 'active')
      ]);
      
      const repositoryDetail = detailResponse.data || detailResponse;
      const indexData = indexResponse.data || indexResponse;
      
      setPublishRepositoryInfo({
        ...repositoryDetail,
        id: repositoryDetail.id || repository.id, // 确保id存在
        indexFiles: indexData.index_files || [],
        latestIndex: indexData.latest_index
      });
      setPublishConfirmModalVisible(true);
    } catch (error) {
      message.error('获取仓库信息失败');
    }
  };

  // 确认发布仓库
  const handleConfirmPublish = async () => {
    try {
      console.log('Publishing repository with ID:', publishRepositoryInfo.id);
      const payload = { repository_id: publishRepositoryInfo.id };
      console.log('Publish payload:', payload);
      await repositoryAPI.publishRepository(payload);
      message.success(publishRepositoryInfo.status === 'publish' ? '发布记录已更新' : '你的索引包合并并发布到了公共分支');
      setPublishConfirmModalVisible(false);
      setPublishRepositoryInfo(null);
      fetchRepositories(pagination.current);
    } catch (error) {
      console.error('Publish error:', error);
      message.error(error.error || '发布失败');
    }
  };

  // 打开仓库预览
  const handleOpenPreview = (repository) => {
    setPreviewRepository(repository);
    setPreviewDrawerVisible(true);
  };

  // 关闭仓库预览
  const handleClosePreview = () => {
    setPreviewDrawerVisible(false);
    setPreviewRepository(null);
  };

  // 检查是否为GitHub仓库
  const isGitHubRepository = (repository) => {
    const url = repository?.url || repository?.homepage || '';
    const fullName = repository?.full_name || '';
    return (url.includes('github.com') || /.+\/.+/.test(fullName));
  };

  // 从仓库对象解析 GitHub owner/repo，优先 full_name，其次 url/homepage
  const getGithubInfo = (repo) => {
    if (!repo) return null;
    // 1) 优先 full_name: "owner/repo"
    if (repo.full_name && repo.full_name.includes('/')) {
      const [owner, repoName] = repo.full_name.split('/');
      if (owner && repoName) return { owner, repo: repoName.replace(/\.git$/, '') };
    }
    // 2) 从 url 解析
    const tryUrls = [repo.url, repo.homepage].filter(Boolean);
    for (const u of tryUrls) {
      const match = String(u).match(/github\.com\/([^/]+)\/([^/#?]+)/);
      if (match) {
        return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
      }
    }
    return null;
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  // 文件上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.tar.gz',
    beforeUpload: (file) => {
      // 验证文件类型
      const isValidType = file.name.toLowerCase().endsWith('.tar.gz');
      if (!isValidType) {
        message.error('只支持 .tar.gz 格式的文件');
        return false;
      }
      
      // 验证文件大小 (100MB)
      const isValidSize = file.size / 1024 / 1024 < 100;
      if (!isValidSize) {
        message.error('文件大小不能超过 100MB');
        return false;
      }
      
      return false; // 阻止自动上传
    },
    onChange: (info) => {
      // 文件状态变化时的处理
      if (info.file.status === 'error') {
        message.error(`${info.file.name} 文件上传失败`);
      }
    },
  };

  // 处理筛选变化
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchRepositories(1);
  };

  // 重置筛选
  const handleResetFilters = () => {
    const defaultFilters = {
      category: '',
      language: '',
      status: 'active',
      sort: 'updated'
    };
    setFilters(defaultFilters);
    fetchRepositories(1);
  };

  useEffect(() => {
    fetchCategories();
    fetchRepositories();
  }, []);

  // 当筛选条件变化时重新获取数据（但排除初始化）
  useEffect(() => {
    if (repositories.length > 0) {
      fetchRepositories(1);
    }
  }, [filters.category, filters.language, filters.status, filters.sort]);

  // 渲染仓库卡片
  const renderRepositoryCard = (repository) => (
    <Col xs={24} sm={12} md={8} lg={6} xl={6} key={repository.id} style={{ display: 'flex', justifyContent: 'center' }}>
      <Card
        hoverable
        style={{ borderRadius: '12px', width: 320, overflow: 'hidden' }}
        cover={
          <div style={{ 
            height: 120, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            color: '#666',
            fontSize: '32px',
            position: 'relative'
          }}>
            {repository.owner_avatar_url ? (
              <img 
                src={repository.owner_avatar_url} 
                alt={repository.owner_login || 'Owner'}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
            ) : null}
            <CodeOutlined style={{ display: repository.owner_avatar_url ? 'none' : 'block' }} />
            {/* 状态标识 */}
            <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
              {repository.status === 'publish' && <Tag color="green" size="small">已发布</Tag>}
              {repository.is_fork && <Tag color="blue" size="small">Fork</Tag>}
              {repository.is_archived && <Tag color="orange" size="small">已归档</Tag>}
              {repository.is_trending && <Tag color="red" size="small">热门</Tag>}
            </div>
          </div>
        }
        actions={[
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(repository)}
            />
          </Tooltip>,
          <Tooltip title="查看索引">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => handleViewIndexes(repository)}
            />
          </Tooltip>,
          <Tooltip title="更新索引">
            <Button 
              type="text" 
              icon={<UploadOutlined />}
              onClick={() => handleOpenUpdateIndex(repository)}
            />
          </Tooltip>,
          // 如果是GitHub仓库，显示预览按钮
          ...(isGitHubRepository(repository) ? [
            <Tooltip title="预览">
              <Button 
                type="text" 
                icon={<GithubOutlined />}
                onClick={() => handleOpenPreview(repository)}
              />
            </Tooltip>
          ] : [])
        ]}
      >
        <Card.Meta
          title={
            <Space wrap>
              <span style={{ fontWeight: 'bold' }}>{repository.name}</span>
              {repository.language && (
                <Tag color="blue">{repository.language}</Tag>
              )}
              {repository.is_private && (
                <Tag color="orange">私有</Tag>
              )}
              {repository.is_recommended && (
                <Tag color="gold">推荐</Tag>
              )}
            </Space>
          }
          description={
            <div>
              <Paragraph 
                ellipsis={{ rows: 2 }}
                style={{ marginBottom: '8px', fontSize: '12px' }}
              >
                {repository.description || '暂无描述'}
              </Paragraph>
              
              <Space wrap size={4} style={{ marginBottom: '8px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  ⭐ {repository.stars_count || 0}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  🍴 {repository.forks_count || 0}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  👀 {repository.watchers_count || 0}
                </Text>
                {repository.size > 0 && (
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    📦 {formatFileSize(repository.size)}
                  </Text>
                )}
                {repository.quality_score > 0 && (
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    🏆 {repository.quality_score.toFixed(1)}
                  </Text>
                )}
              </Space>
              
              {/* 显示标签和主题 */}
              {((repository.tags && repository.tags.length > 0) || (repository.topics && repository.topics.length > 0)) && (
                <div style={{ marginBottom: '8px' }}>
                  {repository.tags && repository.tags.slice(0, 2).map(tag => (
                    <Tag key={tag} size="small" color="processing">{tag}</Tag>
                  ))}
                  {repository.topics && repository.topics.slice(0, 1).map(topic => (
                    <Tag key={topic} size="small" color="cyan">{topic}</Tag>
                  ))}
                  {((repository.tags?.length || 0) + (repository.topics?.length || 0)) > 3 && (
                    <Tag size="small">+{((repository.tags?.length || 0) + (repository.topics?.length || 0)) - 3}</Tag>
                  )}
                </div>
              )}
              
              {/* 底部信息 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: '10px' }}>
                    更新于 {formatDate(repository.updated_at)}
                  </Text>
                  {repository.default_branch && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '10px' }}>
                        🌿 {repository.default_branch}
                      </Text>
                    </div>
                  )}
                </div>
                <div>
                  {repository.has_index && (
                    <Tag size="small" color="success">
                      已索引 ({repository.index_count || 0})
                    </Tag>
                  )}
                </div>
              </div>
              
              {/* 发布按钮 - 高亮显示 */}
              <div style={{ textAlign: 'center' }}>
                <Button
                  type={repository.status === 'publish' ? 'default' : 'primary'}
                  icon={<CloudUploadOutlined />}
                  onClick={() => handleOpenPublishConfirm(repository)}
                  style={{
                    width: '100%',
                    background: repository.status === 'publish' ? undefined : 'linear-gradient(135deg, #1890ff, #36cfc9)',
                    borderColor: repository.status === 'publish' ? undefined : '#1890ff',
                    fontWeight: 'bold',
                    boxShadow: repository.status === 'publish' ? undefined : '0 2px 8px rgba(24, 144, 255, 0.3)'
                  }}
                >
                  {repository.status === 'publish' ? '🚀 申请更新' : '✨ 公开发布'}
                </Button>
              </div>
            </div>
          }
        />
      </Card>
    </Col>
  );

  return (
    <div>
      <Card style={{ border: 'none', boxShadow: 'none' }}>
        {/* 头部操作区 */}
        <div style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setUploadModalVisible(true)}
                >
                  录入索引库
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={() => fetchRepositories(1)}
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 筛选区 */}
        <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={6} md={4}>
              <div style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>分类</div>
              <Select
                value={filters.category}
                onChange={(value) => handleFilterChange('category', value)}
                placeholder="选择分类"
                style={{ width: '100%' }}
                allowClear
              >
                {categories.map(category => (
                  <Option key={category.name} value={category.name}>
                    {category.display_name || category.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={6} md={4}>
              <div style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>语言</div>
              <Select
                value={filters.language}
                onChange={(value) => handleFilterChange('language', value)}
                placeholder="选择语言"
                style={{ width: '100%' }}
                allowClear
              >
                {languages.map(language => (
                  <Option key={language} value={language}>{language}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={6} md={4}>
              <div style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>排序</div>
              <Select
                value={filters.sort}
                onChange={(value) => handleFilterChange('sort', value)}
                style={{ width: '100%' }}
              >
                <Option value="updated">最近更新</Option>
                <Option value="created">创建时间</Option>
                <Option value="name">名称</Option>
                <Option value="size">大小</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: '4px', fontSize: '12px', color: 'transparent' }}>操作</div>
              <Space>
                <Button 
                  onClick={handleResetFilters}
                  size="small"
                >
                  重置筛选
                </Button>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  共 {pagination.total} 个仓库
                </Text>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 仓库列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            加载中...
          </div>
        ) : repositories.length === 0 ? (
          <Empty 
            description="暂无仓库"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              上传第一个仓库
            </Button>
          </Empty>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {repositories.map(renderRepositoryCard)}
            </Row>
            
            {pagination.total > pagination.pageSize && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Pagination
                  current={pagination.current}
                  total={pagination.total}
                  pageSize={pagination.pageSize}
                  onChange={(page, pageSize) => {
                    setPagination(prev => ({ ...prev, current: page, pageSize }));
                    fetchRepositories(page);
                  }}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total, range) => 
                    `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                  }
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* 上传仓库弹窗 */}
      <Modal
        title="上传仓库"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUploadRepository}
        >
          <Form.Item name="import_method" label="导入方式" initialValue="url">
            <Select style={{ width: 220 }}
              options={[
                { value: 'url', label: 'GitHub 自动导入' },
                { value: 'file', label: '自主上传' },
              ]}
            />
          </Form.Item>

          {/* URL 导入 */}
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.import_method !== cur.import_method}>
            {({ getFieldValue }) => {
              const method = getFieldValue('import_method');
              if (method === 'url') {
                return (
                  <>
                    <Form.Item
                      name="url"
                      label="GitHub 仓库URL"
                      rules={[{ required: true, message: '请输入 GitHub 仓库URL，例如：https://github.com/owner/repo' }]}
                    >
                      <Input placeholder="例如：https://github.com/owner/repo 或 https://github.com/owner/repo.git" />
                    </Form.Item>

                    {/* 展开/折叠按钮 */}
                    <div style={{ marginBottom: '16px' }}>
                      <Button 
                        type="link" 
                        onClick={() => setShowOptionalFields(!showOptionalFields)}
                        style={{ padding: 0, fontSize: '14px' }}
                      >
                        {showOptionalFields ? '收起可选字段' : '展开可选字段（自动识别）'}
                        {showOptionalFields ? ' ▲' : ' ▼'}
                      </Button>
                    </div>

                    {/* 可选字段区域 */}
                    {showOptionalFields && (
                      <>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item name="name" label="仓库名称（可选）">
                              <Input placeholder="不填则从 GitHub 自动识别" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="language" label="主要语言（可选）">
                              <Select placeholder="不填则从 GitHub 自动识别" allowClear>
                                {languages.map(language => (
                                  <Option key={language} value={language}>{language}</Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item name="description" label="仓库描述（可选）">
                          <TextArea placeholder="不填则从 GitHub 自动识别" rows={3} showCount maxLength={500} />
                        </Form.Item>

                        <Form.Item name="license" label="许可证（可选）">
                          <Select placeholder="不填则从 GitHub 自动识别" allowClear>
                            <Option value="MIT">MIT</Option>
                            <Option value="Apache-2.0">Apache 2.0</Option>
                            <Option value="GPL-3.0">GPL 3.0</Option>
                            <Option value="BSD-3-Clause">BSD 3-Clause</Option>
                            <Option value="Other">其他</Option>
                          </Select>
                        </Form.Item>
                      </>
                    )}

                    {/* 必填字段 */}
                    <Form.Item name="category" label="分类">
                      <Select placeholder="选择分类" allowClear>
                        {categories.map(category => (
                          <Option key={category.name} value={category.name}>
                            {category.display_name || category.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item name="tags" label="标签">
                      <Select mode="tags" placeholder="输入标签，按回车添加" style={{ width: '100%' }} />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>

          {/* 文件上传 */}
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.import_method !== cur.import_method}>
            {({ getFieldValue }) => {
              const method = getFieldValue('import_method');
              if (method !== 'url') {
                return (
                  <>
                    <Form.Item
                      name="file"
                      label="仓库索引包"
                      rules={[{ required: true, message: '请选择要上传的仓库索引包' }]}
                      getValueFromEvent={(e) => {
                        if (Array.isArray(e)) { return e; }
                        return e && e.fileList;
                      }}
                    >
                      <Dragger {...uploadProps}>
                        <p className="ant-upload-drag-icon">
                          <FileZipOutlined />
                        </p>
                        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                        <p className="ant-upload-hint">支持 .tar.gz 格式，最大 100MB</p>
                      </Dragger>
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="name"
                          label="仓库名称"
                          rules={[{ required: true, message: '请输入仓库名称' }]}
                        >
                          <Input placeholder="请输入仓库名称" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="language" label="主要语言">
                          <Select placeholder="选择主要编程语言">
                            <Option value="JavaScript">JavaScript</Option>
                            <Option value="Python">Python</Option>
                            <Option value="Java">Java</Option>
                            <Option value="Go">Go</Option>
                            <Option value="Rust">Rust</Option>
                            <Option value="C++">C++</Option>
                            <Option value="TypeScript">TypeScript</Option>
                            <Option value="Other">其他</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="description" label="仓库描述">
                      <TextArea placeholder="请输入仓库描述（可选）" rows={3} showCount maxLength={500} />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="category" label="分类">
                          <Select placeholder="选择分类">
                            <Option value="web">Web开发</Option>
                            <Option value="mobile">移动开发</Option>
                            <Option value="ai">人工智能</Option>
                            <Option value="data">数据科学</Option>
                            <Option value="game">游戏开发</Option>
                            <Option value="tool">开发工具</Option>
                            <Option value="other">其他</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="license" label="许可证">
                          <Select placeholder="选择许可证">
                            <Option value="MIT">MIT</Option>
                            <Option value="Apache-2.0">Apache 2.0</Option>
                            <Option value="GPL-3.0">GPL 3.0</Option>
                            <Option value="BSD-3-Clause">BSD 3-Clause</Option>
                            <Option value="Other">其他</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="tags" label="标签">
                      <Select mode="tags" placeholder="输入标签，按回车添加" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="homepage" label="主页URL">
                      <Input placeholder="请输入项目主页URL（可选）" />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>
          
          
          {uploading && (
            <Form.Item>
              <Progress percent={uploadProgress} status="active" />
            </Form.Item>
          )}
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={uploading}>
                {uploading ? '处理中...' : '提交'}
              </Button>
              <Button onClick={() => {
                setUploadModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 更新索引弹窗 */}
      <Modal
        title={`更新索引 - ${selectedRepository?.title || selectedRepository?.name}`}
        open={updateIndexModalVisible}
        onCancel={() => {
          setUpdateIndexModalVisible(false);
          updateForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={updateForm}
          layout="vertical"
          onFinish={handleUpdateIndex}
        >
          <Form.Item
            name="file"
            label="索引文件"
            rules={[{ required: true, message: '请选择要上传的索引文件' }]}
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e && e.fileList;
            }}
          >
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <FileZipOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽索引文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 .tar.gz 格式的索引压缩包，包含 .gitgo/info.json 文件
              </p>
            </Dragger>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="更新说明"
          >
            <TextArea 
              placeholder="请输入本次索引更新的说明（可选）" 
              rows={3}
              showCount
              maxLength={200}
            />
          </Form.Item>
          
          {uploading && (
            <Form.Item>
              <Progress percent={uploadProgress} status="active" />
            </Form.Item>
          )}
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={uploading}>
                {uploading ? '更新中...' : '更新索引'}
              </Button>
              <Button onClick={() => {
                setUpdateIndexModalVisible(false);
                updateForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 索引列表弹窗 */}
      <Modal
        title={`索引历史 - ${selectedRepository?.title || selectedRepository?.name}`}
        open={indexListModalVisible}
        onCancel={() => {
          setIndexListModalVisible(false);
          setRepositoryIndexes([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIndexListModalVisible(false);
            setRepositoryIndexes([]);
          }}>
            关闭
          </Button>
        ]}
        width={1200}
      >
        {repositoryIndexes.length === 0 ? (
          <Empty description="暂无索引记录" />
        ) : (
          <Tabs defaultActiveKey="files">
            <TabPane tab="索引文件" key="files">
              <List
                dataSource={repositoryIndexes}
                renderItem={(item, index) => (
                  <List.Item
                    key={item.id}
                    actions={[
                      <Button 
                        type="link" 
                        icon={<DownloadOutlined />}
                        loading={downloading.has(`index_${item.id}`)}
                        onClick={async () => {
                          if (item.remote_url && !downloading.has(`index_${item.id}`)) {
                            const downloadKey = `index_${item.id}`;
                            setDownloading(prev => new Set(prev).add(downloadKey));
                            
                            try {
                              // 使用axios代理请求下载文件
                              const response = await fetch(item.remote_url, {
                                method: 'GET',
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                                }
                              });
                              
                              if (response.ok) {
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = item.file_name;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                                message.success('下载开始');
                              } else {
                                message.error('下载失败');
                              }
                            } catch (error) {
                              console.error('Download error:', error);
                              message.error('下载失败');
                            } finally {
                              setDownloading(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(downloadKey);
                                return newSet;
                              });
                            }
                          }
                        }}
                        disabled={!item.remote_url || downloading.has(`index_${item.id}`)}
                      >
                        下载
                      </Button>,
                      <Button 
                        type="link" 
                        icon={<HistoryOutlined />}
                        onClick={() => {
                          // 展开历史记录
                          const updatedIndexes = [...repositoryIndexes];
                          updatedIndexes[index].showHistory = !updatedIndexes[index].showHistory;
                          setRepositoryIndexes(updatedIndexes);
                        }}
                      >
                        {item.showHistory ? '收起历史' : '查看历史'}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge 
                          count={index === 0 ? 'Latest' : null} 
                          style={{ backgroundColor: '#52c41a' }}
                        >
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <BranchesOutlined />
                          </div>
                        </Badge>
                      }
                      title={
                        <Space>
                          <span>{item.file_name}</span>
                          <Tag color={item.status === 'completed' ? 'success' : 'processing'}>
                            {item.status === 'completed' ? '已完成' : '处理中'}
                          </Tag>
                          {item.index_info?.latest?.type && (
                            <Tag color={item.index_info.latest.type === 'full' ? 'blue' : 'orange'}>
                              {item.index_info.latest.type === 'full' ? '完整索引' : 
                               item.index_info.latest.type === 'any' ? '部分索引' : '未知类型'}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ marginBottom: '8px' }}>
                            <Text type="secondary">{item.description || '无描述'}</Text>
                          </div>
                          <Space wrap style={{ marginBottom: '8px' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              📦 大小: {formatFileSize(item.file_size)}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              📅 上传: {formatDate(item.uploaded_at)}
                            </Text>
                            {item.index_info?.latest?.build_date && (
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                🔨 构建: {formatDate(item.index_info.latest.build_date)}
                              </Text>
                            )}
                          </Space>
                          {item.index_info && (
                            <div style={{ marginTop: '8px' }}>
                              <Descriptions size="small" column={3} bordered>
                                <Descriptions.Item label="🌿 分支">
                                  <Tag color="green">{item.index_info.latest?.branch_name || 'N/A'}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="📝 提交">
                                  <Text code>{item.index_info.latest?.commit_hash?.substring(0, 8) || 'N/A'}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="📂 索引路径">
                                  <Text type="secondary">{item.index_info.latest?.path || '根目录'}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="📄 索引文件">
                                  <Badge count={item.index_info.latest?.indexed_files || 0} color="blue" />
                                </Descriptions.Item>
                                <Descriptions.Item label="⚡ 函数数量">
                                  <Badge count={item.index_info.latest?.all_funcs || 0} color="purple" />
                                </Descriptions.Item>
                                <Descriptions.Item label="📅 提交时间">
                                  <Text type="secondary" style={{ fontSize: '11px' }}>
                                    {item.index_info.latest?.commit_date ? 
                                      formatDate(item.index_info.latest.commit_date) : 'N/A'}
                                  </Text>
                                </Descriptions.Item>
                              </Descriptions>
                            </div>
                          )}
                          
                          {/* 历史记录展开区域 */}
                          {item.showHistory && item.index_info?.history && (
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
                              <Title level={5} style={{ marginBottom: '12px' }}>
                                <HistoryOutlined /> 构建历史 ({item.index_info.history.length} 次)
                              </Title>
                              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {item.index_info.history.map((historyItem, historyIndex) => (
                                  <div key={historyIndex} style={{ 
                                    marginBottom: '8px', 
                                    padding: '8px', 
                                    backgroundColor: 'white', 
                                    borderRadius: '4px',
                                    border: '1px solid #f0f0f0'
                                  }}>
                                    <Row gutter={16}>
                                      <Col span={6}>
                                        <Text strong style={{ fontSize: '12px' }}>构建时间</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: '11px' }}>
                                          {formatDate(historyItem.build_date)}
                                        </Text>
                                      </Col>
                                      <Col span={6}>
                                        <Text strong style={{ fontSize: '12px' }}>索引类型</Text>
                                        <br />
                                        <Tag size="small" color={
                                          historyItem.type === 'full' ? 'blue' : 
                                          historyItem.type === 'any' ? 'orange' : 'default'
                                        }>
                                          {historyItem.type === 'full' ? '完整' : 
                                           historyItem.type === 'any' ? '部分' : 
                                           historyItem.type || '未知'}
                                        </Tag>
                                      </Col>
                                      <Col span={6}>
                                        <Text strong style={{ fontSize: '12px' }}>索引路径</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: '11px' }}>
                                          {historyItem.path || '根目录'}
                                        </Text>
                                      </Col>
                                      <Col span={6}>
                                        <Text strong style={{ fontSize: '12px' }}>统计</Text>
                                        <br />
                                        <Space size={4}>
                                          <Tag size="small" color="blue">
                                            {historyItem.indexed_files || 0} 文件
                                          </Tag>
                                          <Tag size="small" color="purple">
                                            {historyItem.all_funcs || 0} 函数
                                          </Tag>
                                        </Space>
                                      </Col>
                                    </Row>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </TabPane>
            
            <TabPane tab="统计概览" key="stats">
              {(() => {
                 // 优先使用latest字段，如果没有则从history中查找
                 let latestBuild = null;
                 
                 // 首先尝试从latest字段获取最新信息
                 if (repositoryIndexes.length > 0 && repositoryIndexes[0].index_info?.latest) {
                   latestBuild = repositoryIndexes[0].index_info.latest;
                 }
                 
                 // 获取所有历史记录并按build_date排序
                 const allHistory = repositoryIndexes.reduce((acc, item) => {
                   if (item.index_info?.history) {
                     acc.push(...item.index_info.history);
                   }
                   return acc;
                 }, []);
                 
                 // 按build_date倒序排序
                 const sortedHistory = allHistory.sort((a, b) => {
                   const dateA = new Date(a.build_date || 0);
                   const dateB = new Date(b.build_date || 0);
                   return dateB - dateA;
                 });
                 
                 // 如果没有latest信息，则使用history中最新的
                 if (!latestBuild && sortedHistory.length > 0) {
                   latestBuild = sortedHistory[0];
                 }
                
                return latestBuild ? (
                  <div>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Card size="small" title="最新索引信息">
                          <Descriptions column={1} size="small">
                            <Descriptions.Item label="分支">
                              <Tag color="green">{latestBuild.branch_name}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="提交哈希">
                              <Text code>{latestBuild.commit_hash}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="提交时间">
                              {formatDate(latestBuild.commit_date)}
                            </Descriptions.Item>
                            <Descriptions.Item label="构建时间">
                              {formatDate(latestBuild.build_date)}
                            </Descriptions.Item>
                            <Descriptions.Item label="索引路径">
                              <Text type="secondary">{latestBuild.path || '根目录'}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="索引类型">
                              <Tag color={latestBuild.type === 'full' ? 'blue' : 'orange'}>
                                {latestBuild.type === 'full' ? '完整索引' : 
                                 latestBuild.type === 'any' ? '部分索引' : '未知类型'}
                              </Tag>
                            </Descriptions.Item>
                          </Descriptions>
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card size="small" title="索引统计">
                          <Row gutter={16}>
                            <Col span={12}>
                              <div style={{ textAlign: 'center', padding: '16px' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                                  {latestBuild.indexed_files || 0}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>索引文件数</div>
                              </div>
                            </Col>
                            <Col span={12}>
                              <div style={{ textAlign: 'center', padding: '16px' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                                  {latestBuild.all_funcs || 0}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>函数总数</div>
                              </div>
                            </Col>
                          </Row>
                          <Divider style={{ margin: '12px 0' }} />
                          <div style={{ textAlign: 'center' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              历史构建次数: {sortedHistory.length} 次
                            </Text>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                    
                    {/* 构建历史时间轴 */}
                    <Card size="small" title="构建历史时间轴" style={{ marginTop: '16px' }}>
                      <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '16px 0' }}>
                        {sortedHistory.slice(0, 15).map((item, index) => (
                          <div key={index} style={{ 
                            position: 'relative',
                            paddingLeft: '40px',
                            paddingBottom: '24px',
                            borderLeft: index < sortedHistory.slice(0, 15).length - 1 ? '2px solid #e8e8e8' : 'none'
                          }}>
                            {/* 时间轴节点 */}
                            <div style={{
                              position: 'absolute',
                              left: '-6px',
                              top: '4px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: index === 0 ? '#52c41a' : 
                                              item.type === 'full' ? '#1890ff' : '#faad14',
                              border: '2px solid #fff',
                              boxShadow: '0 0 0 2px #f0f0f0'
                            }} />
                            
                            {/* 时间轴内容 */}
                            <div style={{
                              backgroundColor: index === 0 ? '#f6ffed' : '#fafafa',
                              border: `1px solid ${index === 0 ? '#b7eb8f' : '#e8e8e8'}`,
                              borderRadius: '8px',
                              padding: '12px 16px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                  <Text strong style={{ fontSize: '13px', color: index === 0 ? '#52c41a' : '#333' }}>
                                    {index === 0 && '🚀 '}{formatDate(item.build_date)}
                                  </Text>
                                  {index === 0 && (
                                    <Tag size="small" color="success" style={{ marginLeft: '8px' }}>最新</Tag>
                                  )}
                                </div>
                                <Tag size="small" color={
                                  item.type === 'full' ? 'blue' : 
                                  item.type === 'any' ? 'orange' : 'default'
                                }>
                                  {item.type === 'full' ? '完整' : 
                                   item.type === 'any' ? '部分' : 
                                   item.type || '未知'}
                                </Tag>
                              </div>
                              
                              <div style={{ marginBottom: '8px' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  📂 {item.path || '根目录'}
                                </Text>
                              </div>
                              
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '12px', color: '#666' }}>📄</span>
                                  <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#1890ff' }}>
                                    {item.indexed_files || 0}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: '11px' }}>文件</Text>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '12px', color: '#666' }}>⚡</span>
                                  <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#722ed1' }}>
                                    {item.all_funcs || 0}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: '11px' }}>函数</Text>
                                </div>
                                {item.commit_hash && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '12px', color: '#666' }}>🔗</span>
                                    <Text code style={{ fontSize: '11px' }}>
                                      {item.commit_hash.substring(0, 7)}
                                    </Text>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {sortedHistory.length > 15 && (
                          <div style={{ textAlign: 'center', padding: '16px', color: '#999' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              还有 {sortedHistory.length - 15} 条历史记录...
                            </Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                ) : (
                  <Empty description="暂无构建历史" />
                );
              })()
              }
            </TabPane>
          </Tabs>
        )}
      </Modal>

      {/* 发布确认弹窗 */}
      <Modal
        title="发布确认"
        open={publishConfirmModalVisible}
        onCancel={() => {
          setPublishConfirmModalVisible(false);
          setPublishRepositoryInfo(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setPublishConfirmModalVisible(false);
            setPublishRepositoryInfo(null);
          }}>
            取消
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmPublish}>
            确认发布
          </Button>
        ]}
        width={800}
      >
        {publishRepositoryInfo && (
          <div>
            <Card size="small" title="仓库信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="仓库名称">
                  <Text strong>{publishRepositoryInfo.name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="完整名称">
                  <Text code>{publishRepositoryInfo.full_name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>
                  <Text>{publishRepositoryInfo.description || '暂无描述'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="语言">
                  <Tag color="blue">{publishRepositoryInfo.language || 'N/A'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="分类">
                  <Tag color="green">{publishRepositoryInfo.category || 'N/A'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="星标数">
                  ⭐ {publishRepositoryInfo.stars_count || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Fork数">
                  🍴 {publishRepositoryInfo.forks_count || 0}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title="索引信息">
              {publishRepositoryInfo.indexFiles && publishRepositoryInfo.indexFiles.length > 0 ? (
                <div>
                  {publishRepositoryInfo.indexFiles[0].index_info?.latest ? (
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="分支">
                        <Tag color="green">{publishRepositoryInfo.indexFiles[0].index_info.latest.branch_name}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="提交哈希">
                        <Text code>{publishRepositoryInfo.indexFiles[0].index_info.latest.commit_hash?.substring(0, 8)}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="索引文件数">
                        <Badge count={publishRepositoryInfo.indexFiles[0].index_info.latest.indexed_files || 0} color="blue" />
                      </Descriptions.Item>
                      <Descriptions.Item label="函数数量">
                        <Badge count={publishRepositoryInfo.indexFiles[0].index_info.latest.all_funcs || 0} color="purple" />
                      </Descriptions.Item>
                      <Descriptions.Item label="索引类型">
                        <Tag color={publishRepositoryInfo.indexFiles[0].index_info.latest.type === 'full' ? 'blue' : 'orange'}>
                          {publishRepositoryInfo.indexFiles[0].index_info.latest.type === 'full' ? '完整索引' : '部分索引'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="构建时间">
                        <Text type="secondary">
                          {formatDate(publishRepositoryInfo.indexFiles[0].index_info.latest.build_date)}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="索引路径" span={2}>
                        <Text type="secondary">{publishRepositoryInfo.indexFiles[0].index_info.latest.path || '根目录'}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                  ) : (
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="索引信息不完整"
                    />
                  )}
                </div>
              ) : (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无索引文件，请先上传索引"
                />
              )}
            </Card>

            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '8px' }}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
                  🚀 发布您的代码索引，为开发者社区贡献力量！
                </Text>
              </div>
              <div style={{ marginBottom: '12px', lineHeight: '1.6' }}>
                <Text style={{ fontSize: '13px' }}>
                  发布后，所有人都可以看到并使用您的索引。您的索引将为其他开发者提供以下高级功能：
                </Text>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', lineHeight: '1.8' }}>
                  <li>🔍 <strong>深度搜索</strong> - 精确定位代码片段和函数</li>
                  <li>🔬 <strong>空间透镜</strong> - 代码结构可视化分析</li>
                  <li>📊 <strong>代码可视化</strong> - 直观展示代码关系图谱</li>
                  <li>🤖 <strong>AI智能解析</strong> - 自动理解代码逻辑和意图</li>
                  <li>📈 <strong>代码分析报告</strong> - 生成详细的质量评估</li>
                  <li>✅ <strong>AI提交审查</strong> - 智能代码审查辅助</li>
                  <li>🧠 <strong>脉络感知</strong> - 理解代码上下文关联</li>
                </ul>
              </div>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Text style={{ fontSize: '12px', color: '#666' }}>
                  了解更多功能详情，请访问 
                  <a 
                    href="https://zzh.app/githave" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#1890ff', fontWeight: 'bold' }}
                  >
                    zzh.app/githave
                  </a>
                </Text>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑仓库信息弹窗 */}
      <Modal
        title={`编辑仓库信息 - ${selectedRepository?.name}`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateRepository}
        >
          <Form.Item
            name="description"
            label="仓库描述"
          >
            <TextArea 
              placeholder="请输入仓库描述" 
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="language"
                label="主要语言"
              >
                <Select placeholder="选择主要编程语言" allowClear>
                  {languages.map(language => (
                    <Option key={language} value={language}>{language}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
              >
                <Select placeholder="选择分类" allowClear>
                  {categories.map(category => (
                    <Option key={category.name} value={category.name}>
                      {category.display_name || category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Input placeholder="输入标签，用逗号分隔" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="license"
                label="许可证"
              >
                <Select placeholder="选择许可证" allowClear>
                  <Option value="MIT">MIT</Option>
                  <Option value="Apache-2.0">Apache 2.0</Option>
                  <Option value="GPL-3.0">GPL 3.0</Option>
                  <Option value="BSD-3-Clause">BSD 3-Clause</Option>
                  <Option value="Other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="homepage"
            label="主页URL"
          >
            <Input placeholder="请输入项目主页URL" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存更改
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                editForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
         </Form>
       </Modal>

       {/* 仓库预览抽屉 */}
       <Drawer
         title={`GitHub 仓库预览 - ${previewRepository?.name || ''}`}
         placement="right"
         size="large"
         open={previewDrawerVisible}
         onClose={handleClosePreview}
         width={isMobile ? '100%' : '80%'}
         style={{ minWidth: isMobile ? 0 : '800px' }}
         bodyStyle={{ padding: isMobile ? 0 : 24, overflowX: 'auto' }}
         destroyOnClose
       >
         {previewRepository && (() => {
           const githubInfo = getGithubInfo(previewRepository);
           return githubInfo ? (
             <div style={{ minWidth: isMobile ? '100%' : 0, overflowX: 'auto' }}>
               <RepositoryAnalysis 
                 owner={githubInfo.owner}
                 repo={githubInfo.repo}
                 embedded={true}
               />
             </div>
           ) : (
             <div style={{ textAlign: 'center', padding: '40px' }}>
               <Text type="secondary">无法解析GitHub仓库信息</Text>
             </div>
           );
         })()}
       </Drawer>
     </div>
   );
 };

 export default RepositoryManager;
