# 🎓 英语对话练习助手 - 双角色语音交互版

## 📋 项目简介

这是一个基于双角色协作架构的英语对话练习应用，集成了腾讯云语音识别服务，让用户可以通过语音与AI助手进行自然的英语对话练习。

## 🌟 核心功能

### 🤖 双角色协作系统
- **对话伙伴**：与用户进行自然的英语对话交流
- **表达顾问**：改进用户的英语表达，提供更地道的表达方式
- **流式响应**：支持实时流式对话，体验更自然
- **多模型支持**：支持通义千问、DeepSeek等多种LLM

### 🎙️ 语音交互功能
- **实时语音识别**：基于腾讯云ASR，支持中文普通话和英语识别
- **安全架构**：采用STS临时密钥机制，确保API密钥安全
- **无缝集成**：语音输入直接集成在对话界面中
- **智能处理**：自动过滤语气词和脏词，提供高精度识别

## 🏗️ 技术架构

### 后端服务 (Python Flask)
```
├── server.py              # 主服务器，LLM代理和路由
├── speech_service.py      # STS临时密钥服务
├── websocket_handler.py   # 语音API处理
├── audio_processor.py     # 音频数据处理
└── requirements.txt       # Python依赖包
```

### 前端模块 (JavaScript)
```
├── index.html            # 主界面
├── app.js               # 核心应用逻辑
├── js/speech-config.js  # 语音配置管理
├── js/speech-client.js  # 语音识别客户端
├── js/cryptojs.js      # 加密库
└── js/tencent-speech-sdk.js  # 腾讯云SDK加载器
```

### 第三方SDK
```
└── vendor/tencent-speech-sdk/  # 腾讯云官方语音SDK
```

## 🚀 快速开始

### 1. 环境配置

```bash
# 安装Python依赖
pip install -r requirements.txt

# 复制环境变量模板
cp env.template .env
```

### 2. 配置API密钥

编辑 `.env` 文件，配置以下密钥：

```bash
# LLM API配置
TONGYI_API_KEY=your_tongyi_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# 腾讯云语音服务配置
TENCENT_ASR_APP_ID=your_app_id
TENCENT_ASR_SECRET_ID=your_secret_id
TENCENT_ASR_SECRET_KEY=your_secret_key
TENCENT_ASR_REGION=ap-beijing
```

### 3. 启动服务

```bash
# 启动Flask服务器
python server.py

# 访问应用
# 浏览器打开: http://localhost:4399
```

## 🎯 使用方法

### 对话练习
1. 打开应用，进入"对话窗口"页面
2. 选择想要使用的AI模型（通义千问/DeepSeek）
3. 输入英文消息或点击麦克风按钮进行语音输入
4. 获得双重反馈：
   - 对话伙伴：英语对话回复
   - 表达顾问：表达改进建议

### 语音输入
1. 点击输入框旁的麦克风按钮
2. 授权浏览器麦克风权限
3. 开始说话，支持连续多句话输入
4. 实时显示识别结果：
   - 已确认的句子会累积保存
   - 正在识别的内容实时更新
   - 支持自动端点检测
5. 再次点击麦克风按钮停止录音
6. 识别结果自动填入输入框并发送给AI助手
7. 发送后自动清除累积的语音识别结果

## 🔧 API接口

### LLM代理接口
- `POST /api/llm` - 代理LLM API调用
- `GET /api/health` - 健康检查
- `GET /api/providers` - 获取可用的API提供商

### 语音服务接口
- `GET /api/speech/sts-credentials` - 获取STS临时密钥
- `POST /api/speech/sts-refresh` - 刷新临时密钥
- `GET /api/speech/sts-status` - 查询会话状态
- `POST /api/speech/sts-cleanup` - 清理过期会话
- `POST /api/speech/audio/process` - 音频数据处理

## 🔐 安全特性

- **密钥安全**：使用STS临时密钥机制，前端不暴露永久密钥
- **权限控制**：最小权限原则，仅授权必要的ASR操作
- **自动过期**：临时密钥1小时自动过期
- **签名验证**：HMAC-SHA1签名确保请求合法性

## 📊 性能优化

- **并行加载**：JavaScript模块并行加载
- **状态缓存**：临时密钥自动缓存和刷新
- **错误重试**：自动重连和错误恢复
- **内存管理**：历史记录数量限制
- **日志优化**：清理调试日志，仅保留关键错误信息

## 🛠️ 开发相关

### 项目结构
```
improveEngExpression/
├── 📁 后端服务
│   ├── server.py              # Flask主服务
│   ├── speech_service.py      # 语音服务
│   ├── websocket_handler.py   # WebSocket处理
│   └── audio_processor.py     # 音频处理
├── 📁 前端界面
│   ├── index.html            # 主页面
│   ├── app.js               # 应用逻辑
│   └── js/                   # JavaScript模块
├── 📁 第三方库
│   └── vendor/               # 腾讯云SDK
├── 📁 配置文件
│   ├── .env                 # 环境变量
│   └── requirements.txt     # Python依赖
└── 📁 文档
    ├── README.md            # 项目说明
    ├── VOICE_INTEGRATION_SUMMARY.md  # 语音功能总结
    └── STAGE2_COMPLETION_SUMMARY.md  # 阶段完成总结
```

### 语音配置参数
```javascript
// ASR引擎配置
engine_model_type: '16k_zh-PY'  // 16k中英粤模型
voice_format: 1                 // PCM格式
needvad: 1                     // 开启语音活动检测
filter_dirty: 1                // 过滤脏词
filter_modal: 2                // 严格过滤语气词
filter_punc: 0                 // 保留标点符号
convert_num_mode: 1            // 智能数字转换
word_info: 2                   // 返回详细词级信息
```

## 🔍 故障排除

### 常见问题
1. **语音识别失败**
   - 检查腾讯云API密钥配置
   - 确认网络连接正常
   - 验证麦克风权限

2. **LLM回复异常**
   - 检查API密钥是否正确
   - 确认模型服务可用性
   - 查看服务器错误日志

3. **界面功能异常**
   - 清除浏览器缓存
   - 检查JavaScript控制台错误
   - 确认服务器正常运行

### 调试方法
```bash
# 查看服务器日志
python server.py

# 验证健康状态
curl http://localhost:4399/api/health

# 测试语音服务
curl http://localhost:4399/api/speech/sts-credentials
```

## 📈 未来规划

- 🔄 **多语言支持**：扩展英文、日文等其他语言识别
- 🎵 **语音合成**：添加TTS功能，AI回复语音播放
- 📱 **移动端优化**：改进移动设备上的交互体验

## 📝 更新日志

### v2.1.0 - 语音交互增强版 (当前版本)
- ✅ 集成腾讯云语音识别服务
- ✅ 实现STS临时密钥安全架构
- ✅ 语音输入无缝集成到对话界面
- ✅ **多句话累积识别**：支持连续语音输入和自动文本累积
- ✅ **智能端点检测**：基于腾讯云VAD技术的语音开始/结束检测
- ✅ **状态智能管理**：开始录音时清空，识别过程中累积，发送后清理
- ✅ **实时文本显示**：已确认文本 + 正在识别文本的实时更新
- ✅ 优化代码质量，清理测试代码
- ✅ 完善文档和错误处理
- ✅ 修改服务端口从5000改为4399，避免系统端口冲突

### v1.0.0 - 基础版
- ✅ 双角色协作系统
- ✅ 流式响应支持
- ✅ 多LLM模型支持
- ✅ 本地聊天历史

---

**开始你的英语语音练习之旅吧！** 🎓🎙️✨ 
