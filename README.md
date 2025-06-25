# 🎯 英语对话小老师

一个本地运行的LLM英语对话网页应用，支持**语音交互**和**文本对话**，可以同时进行英语口语练习和语法纠正。

## 📋 功能特性

### 🤖 双Agent架构
- **Agent1 - 对话助手**：与用户进行自然的英语对话交流
- **Agent2 - 纠错助手**：专门对用户输入进行语法和拼写纠正

### 🎤 语音交互功能 (第二阶段已完成)
- ✅ **后端语音服务**：完整的腾讯云实时语音识别集成
- ✅ **WebSocket代理**：高性能的音频数据传输服务
- ✅ **音频处理**：支持多种音频格式转换和质量检查
- ✅ **会话管理**：语音连接的创建、状态监控和管理
- 🔴 **前端录音**：浏览器录音功能（开发中）
- 🔴 **语音输出**：文本转语音播放（规划中）

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
# 复制环境变量模板文件
cp env.template .env

# 编辑.env文件，将占位符替换为您的真实API密钥
```

编辑 `.env` 文件：

```bash
# LLM API 密钥配置
# 通义千问 API 密钥
TONGYI_API_KEY=sk-your-actual-tongyi-api-key

# DeepSeek API 密钥  
DEEPSEEK_API_KEY=sk-your-actual-deepseek-api-key

# 语音功能配置 (可选 - 启用语音交互功能)
# 腾讯云语音识别服务配置
TENCENT_ASR_APP_ID=your-app-id
TENCENT_ASR_SECRET_ID=your-secret-id
TENCENT_ASR_SECRET_KEY=your-secret-key
TENCENT_ASR_REGION=ap-beijing
TENCENT_ASR_ENGINE_TYPE=16k_zh
```

### 2. 获取API密钥

#### 通义千问API Key
1. 访问 [阿里云控制台](https://dashscope.console.aliyun.com/)
2. 开通DashScope服务
3. 创建API Key

#### DeepSeek API Key
1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册并创建API Key

#### 腾讯云语音识别 (可选)
1. 访问 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 开通语音识别服务
3. 在访问管理中创建SecretID和SecretKey
4. 获取AppID（在账号信息中查看）

**注意**：语音功能为可选功能，不配置也能正常使用文本对话功能。

### 3. 启动应用

#### 方法一：使用启动脚本（推荐）

```bash
# 运行后端启动脚本（自动安装依赖、检查配置、启动服务）
python start-backend.py
```

#### 方法二：手动启动

```bash
# 1. 安装Python依赖
pip install -r requirements.txt

# 2. 启动Flask后端服务
python server.py
```

后端服务启动后，使用HTTP服务器运行前端：

```bash
# 新开一个终端窗口，启动前端服务
# 使用Python (推荐)
python -m http.server 8000

# 或使用Node.js
npx serve .

# 或使用PHP
php -S localhost:8000
```

然后在浏览器中访问：`http://localhost:8000`

### 4. 验证语音功能（可选）

如果配置了腾讯云语音识别，可以验证语音功能：

1. **检查服务器启动日志**：
   ```
   🎤 语音功能状态:
     TENCENT_ASR_APP_ID: ✅ 已配置
     TENCENT_ASR_SECRET_ID: ✅ 已配置
     TENCENT_ASR_SECRET_KEY: ✅ 已配置
     🎉 语音功能已就绪！
   ```

2. **测试语音API**：
   在浏览器开发者工具Console中运行：
   ```javascript
   // 测试语音配置
   fetch('/api/speech/test').then(r => r.json()).then(data => console.log(data));
   
   // 测试语音连接
   fetch('/api/speech/connect', {
       method: 'POST',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({client_id: 'test'})
   }).then(r => r.json()).then(data => console.log(data));
   ```

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
Role: You are a professional English expression refinement assistant.
Task: When given a sentence written by a non-native English learner, correct and improve the sentence to make it sound as natural, fluent, and native-like as possible. Your goal is not only to fix grammar or spelling mistakes, but also to enhance word choice, phrasing, and tone to match how a native speaker would naturally express the idea.
If the original sentence is already clear, natural, and native-like, you may leave it unchanged.
Output Format: Return only the improved sentence without any explanations, comments, or analysis.
Important Rules:
1. Make the sentence sound fluent, natural, and idiomatic — like something a native speaker would actually say or write.
2. Correct grammar, spelling, phrasing, and awkward or unnatural expressions.
3. Do not add extra information or remove essential meaning from the original sentence.
4. If the original sentence is perfectly fine for a native speaker to understand and use naturally, leave it unchanged.
5. Output only the corrected (or original) sentence. No additional text.
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

### 核心技术
- **前端**：原生HTML + CSS + JavaScript + Web Audio API
- **后端**：Flask + Python + WebSocket + SocketIO
- **存储**：LocalStorage（Prompt + 历史记录）
- **API集成**：通义千问 + DeepSeek + 腾讯云语音识别

### 语音功能技术栈
- **语音识别**：腾讯云实时语音识别 WebSocket API
- **音频处理**：Python pydub + numpy + librosa
- **数据传输**：Flask-SocketIO + WebSocket代理
- **音频格式**：PCM/WAV 16kHz 单声道

### 架构设计
- **双Agent并行调用**：对话助手 + 纠错助手
- **后端API代理**：统一的LLM服务接口
- **语音服务代理**：WebSocket音频数据转发
- **会话管理**：语音连接状态和生命周期管理

## 📄 许可证

本项目仅供学习和个人使用。请遵守相关API服务商的使用条款。

---

## 🔒 安全注意事项

- ⚠️ **API密钥安全**：`.env` 文件包含您的私人API密钥，已被添加到 `.gitignore` 中，不会被提交到Git仓库
- 🔐 **密钥保护**：请妥善保管您的API密钥，避免在公共场所或代码仓库中泄露
- 🚫 **不要分享**：不要将包含真实API密钥的 `.env` 文件分享给他人
- 📋 **使用模板**：分享项目时，请使用 `env.template` 作为配置模板
- 🛡️ **后端安全**：API密钥现在安全存储在后端服务器中，前端无法直接访问

**注意**：本应用需要有效的API Key才能正常工作。请确保妥善保管您的API密钥，避免泄露。 