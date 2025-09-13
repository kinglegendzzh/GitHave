<template>
  <div class="markdown-example">
    <h2>Markdown样式使用示例</h2>
    
    <!-- 方法1: 使用MarkdownViewer组件 -->
    <div class="example-section">
      <h3>方法1: 使用MarkdownViewer组件</h3>
      <MarkdownViewer :content="markdownContent" />
    </div>

    <!-- 方法2: 直接在当前组件中使用样式 -->
    <div class="example-section">
      <h3>方法2: 直接使用markdown-content类</h3>
      <div class="markdown-content" v-html="markdownContent"></div>
    </div>

    <!-- 方法3: 在scoped样式中使用:deep() -->
    <div class="example-section">
      <h3>方法3: 使用:deep()穿透样式</h3>
      <div class="custom-markdown" v-html="markdownContent"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MarkdownViewer from '../components/MarkdownViewer.vue'

// 示例markdown内容
const markdownContent = ref(`
  <h1>这是一级标题</h1>
  <h2>这是二级标题</h2>
  <h3>这是三级标题</h3>
  
  <p>这是一个段落，包含一些<a href="#">链接文本</a>。</p>
  
  <blockquote>
    这是一个引用块，用来展示重要信息。
  </blockquote>
  
  <pre><code>这是代码块
const example = 'Hello World';
console.log(example);</code></pre>
  
  <p>这是包含<code>内联代码</code>的段落。</p>
  
  <ul>
    <li>列表项目1</li>
    <li>列表项目2</li>
    <li>列表项目3</li>
  </ul>
  
  <table>
    <thead>
      <tr>
        <th>列1</th>
        <th>列2</th>
        <th>列3</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>数据1</td>
        <td>数据2</td>
        <td>数据3</td>
      </tr>
    </tbody>
  </table>
`)
</script>

<style scoped>
/* 方法2: 直接引入markdown样式 */
@import '../styles/markdown.css';

/* 方法3: 使用:deep()穿透样式，应用到.custom-markdown */
.custom-markdown :deep(.markdown-content),
.custom-markdown {
  color: #2c3e50;
  font-size: 14px;
  line-height: 1.6;
}

.custom-markdown :deep(h1),
.custom-markdown :deep(h2),
.custom-markdown :deep(h3),
.custom-markdown :deep(h4),
.custom-markdown :deep(h5),
.custom-markdown :deep(h6) {
  color: #2c3e50 !important;
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  text-shadow: none !important;
}

.custom-markdown :deep(h1) {
  font-size: 1.6em !important;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 8px;
}

.custom-markdown :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 8px;
}

.custom-markdown :deep(h3) {
  font-size: 1.25em;
}

.custom-markdown :deep(h4) {
  font-size: 1.1em;
}

.custom-markdown :deep(a) {
  color: #667eea;
  text-decoration: none;
}

.custom-markdown :deep(p) {
  margin-bottom: 16px;
}

.custom-markdown :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 16px 0;
  display: block;
}

.custom-markdown :deep(pre) {
  background: #f6f8fa;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 16px 0;
}

.custom-markdown :deep(code) {
  background: #f6f8fa;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.custom-markdown :deep(blockquote) {
  border-left: 4px solid #dfe2e5;
  padding-left: 16px;
  margin: 16px 0;
  color: #6a737d;
}

.custom-markdown :deep(ul),
.custom-markdown :deep(ol) {
  padding-left: 24px;
  margin-bottom: 16px;
}

.custom-markdown :deep(li) {
  margin-bottom: 8px;
}

.custom-markdown :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
}

.custom-markdown :deep(th),
.custom-markdown :deep(td) {
  border: 1px solid #dfe2e5;
  padding: 8px 12px;
  text-align: left;
}

.custom-markdown :deep(th) {
  background: #f6f8fa;
  font-weight: 600;
}

/* 页面布局样式 */
.markdown-example {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.example-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: #fafbfc;
}

.example-section h3 {
  margin-top: 0;
  color: #24292e;
  border-bottom: 1px solid #e1e5e9;
  padding-bottom: 8px;
}
</style>