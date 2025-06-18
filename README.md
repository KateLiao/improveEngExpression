# 🎯 英语对话助手 - 双Agent架构

一个本地运行的英语对话网页应用，具备双Agent架构，可以同时进行英语对话练习和语法纠正。

## 📋 功能特性

### 🤖 双Agent架构
- **Agent1 - 对话助手**：与用户进行自然的英语对话交流
- **Agent2 - 纠错助手**：专门对用户输入进行语法和拼写纠正

### 🔧 核心功能
- ✅ **Prompt配置管理**：可自定义两个Agent的Prompt，保存在LocalStorage
- ✅ **多API支持**：支持通义千问和DeepSeek API
- ✅ **实时对话**：同时调用两个Agent，左右分栏显示结果
- ✅ **历史记录**：自动保存所有对话历史到LocalStorage
- ✅ **现代化UI**：美观的响应式界面设计

## 🚀 快速开始

### 1. 配置API密钥

首次使用需要配置您的API密钥：

```bash
# 复制配置模板文件
cp config.template.json config.json

# 编辑config.json，将占位符替换为您的真实API密钥
```

编辑 `config.json` 文件：

```json
{
  "currentApi": "tongyi",
  "apis": {
    "tongyi": {
      "name": "通义千问",
      "endpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      "model": "qwen-plus",
      "apiKey": "sk-your-actual-tongyi-api-key"  // 替换为您的通义千问API Key
    },
    "deepseek": {
      "name": "DeepSeek",
      "endpoint": "https://api.deepseek.com/v1/chat/completions",
      "model": "deepseek-chat",
      "apiKey": "sk-your-actual-deepseek-api-key"  // 替换为您的DeepSeek API Key
    }
  }
}
```

### 2. 获取API密钥

#### 通义千问API Key
1. 访问 [阿里云控制台](https://dashscope.console.aliyun.com/)
2. 开通DashScope服务
3. 创建API Key

#### DeepSeek API Key
1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册并创建API Key

### 3. 启动应用

由于浏览器安全策略，需要通过HTTP服务器运行：

```bash
# 使用Python (推荐)
python -m http.server 8000

# 或使用Node.js
npx serve .

# 或使用PHP
php -S localhost:8000
```

然后在浏览器中访问：`http://localhost:8000`

## 📖 使用说明

### 基本操作

1. **配置Prompt**
   - 在页面上方的两个文本框中编辑Agent的Prompt
   - 点击"保存Prompt"按钮保存到本地存储

2. **选择API**
   - 使用下拉菜单切换"通义千问"或"DeepSeek"

3. **开始对话**
   - 在输入框中输入您的英文消息
   - 点击"发送"按钮或按Enter键发送
   - 左栏显示对话助手的回复，右栏显示纠错助手的分析

4. **管理历史**
   - 所有对话自动保存在页面下方的历史记录中
   - 点击"清空历史"可删除所有记录

### 默认Prompt

**Agent1 - 对话助手**：
```
你是一个友好的英语对话助手。请用英语与用户进行自然的对话交流。
- 根据用户的英语水平，给出合适的回应
- 保持对话的连贯性和趣味性
- 可以询问问题来延续对话
- 使用简洁但丰富的语言

请直接用英语回复用户的消息。
```

**Agent2 - 纠错助手**：
```
你是一个专业的英语语法纠错助手。你的任务是：
- 仔细检查用户输入的英语文本
- 指出其中的语法、拼写、用词错误
- 提供正确的版本
- 给出简洁的解释

格式要求：
1. 如果没有错误：回复"✅ 语法正确，表达很好！"
2. 如果有错误：
   - 原文：[用户的原文]
   - 修正：[正确的版本]
   - 说明：[简要说明错误类型和原因]

请只关注语法纠错，不要生成新的对话内容。
```

## 🎨 界面预览

- 🔧 **API配置区**：选择使用的AI服务
- 📝 **Prompt配置区**：自定义两个Agent的行为
- 💬 **消息输入区**：输入英文对话内容
- 🤖 **Agent回复区**：左右分栏显示两个助手的回复
- 📚 **历史记录区**：查看和管理对话历史

## 🔍 故障排除

### 常见问题

1. **API调用失败**
   - 检查API Key是否正确配置
   - 确认网络连接正常
   - 检查API配额是否充足

2. **配置文件加载失败**
   - 确保`config.json`文件存在
   - 检查JSON格式是否正确
   - 通过HTTP服务器而非直接打开HTML文件

3. **历史记录丢失**
   - 历史记录保存在浏览器LocalStorage中
   - 清理浏览器数据会导致记录丢失
   - 不同浏览器的记录是独立的

## 🛠️ 技术栈

- **前端**：原生HTML + CSS + JavaScript
- **存储**：LocalStorage（Prompt + 历史记录）
- **API集成**：支持通义千问和DeepSeek
- **架构**：双Agent并行调用

## 📄 许可证

本项目仅供学习和个人使用。请遵守相关API服务商的使用条款。

---

## 🔒 安全注意事项

- ⚠️ **API密钥安全**：`config.json` 文件包含您的私人API密钥，已被添加到 `.gitignore` 中，不会被提交到Git仓库
- 🔐 **密钥保护**：请妥善保管您的API密钥，避免在公共场所或代码仓库中泄露
- 🚫 **不要分享**：不要将包含真实API密钥的 `config.json` 文件分享给他人
- 📋 **使用模板**：分享项目时，请使用 `config.template.json` 作为配置模板

**注意**：本应用需要有效的API Key才能正常工作。请确保妥善保管您的API密钥，避免泄露。 