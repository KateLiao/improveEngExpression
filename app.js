// 英语对话助手 - 双角色协作应用
class EnglishChatApp {
    constructor() {
        this.config = null;
        this.chatHistory = [];
        this.currentMessageId = 0;
        this.markdownParsers = new Map(); // 用于存储每个消息的markdown解析器
        this.init();
    }

    // 初始化应用
    async init() {
        await this.loadConfig();
        this.loadPrompts();
        this.loadChatHistory();
        this.setupEventListeners();
        this.displayChatHistory();
    }

    // 加载配置文件
    async loadConfig() {
        try {
            // 检查后端健康状态和可用的API提供商
            try {
                const healthResponse = await fetch('http://localhost:4399/api/health');
                if (healthResponse.ok) {
                    const healthData = await healthResponse.json();
                    // 后端服务连接成功
                    
                    // 获取可用的API提供商
                    const providersResponse = await fetch('http://localhost:4399/api/providers');
                    if (providersResponse.ok) {
                        const providers = await providersResponse.json();
                        
                        // 设置前端配置（仅用于界面显示）
                        this.config = {
                            currentApi: "tongyi",  // 默认使用通义千问
                            providers: providers
                        };
                        
                        // 检查是否有可用的API
                        const availableApis = Object.keys(providers).filter(key => providers[key].available);
                        if (availableApis.length === 0) {
                            this.showNotification('后端未配置任何API密钥！请在.env文件中配置API密钥后重启服务', 'error');
                        } else {
                            this.showNotification(`已连接到后端服务，可用API: ${availableApis.map(api => providers[api].name).join(', ')}`, 'success');
                        }
                        
                        // 设置当前API选择
                        const apiSelect = document.getElementById('apiSelect');
                        if (apiSelect) {
                            // 清空现有选项
                            apiSelect.innerHTML = '';
                            // 添加可用的API选项
                            Object.keys(providers).forEach(key => {
                                const option = document.createElement('option');
                                option.value = key;
                                option.textContent = providers[key].name;
                                option.disabled = !providers[key].available;
                                apiSelect.appendChild(option);
                            });
                            
                            // 设置默认选择
                            if (availableApis.length > 0) {
                                apiSelect.value = availableApis.includes('tongyi') ? 'tongyi' : availableApis[0];
                                this.config.currentApi = apiSelect.value;
                            }
                        }
                    }
                } else {
                    throw new Error('后端服务不可用');
                }
            } catch (backendError) {
                console.error('后端连接失败:', backendError);
                this.showNotification('无法连接到后端服务！请确保Flask服务已启动（http://localhost:4399）', 'error');
                
                // 使用默认配置以便前端界面正常显示
                this.config = {
                    currentApi: "tongyi",
                    providers: {
                        "tongyi": { name: "通义千问", available: false },
                        "deepseek": { name: "DeepSeek", available: false }
                    }
                };
            }
            
        } catch (error) {
            console.error('配置加载失败:', error);
            this.showNotification('配置加载失败，请检查网络连接', 'error');
        }
    }

    // 加载本地存储的Prompt
    loadPrompts() {
        const defaultAgent1Prompt = `你是一个友好的英语对话助手。请用英语与用户进行自然的对话交流。
- 根据用户的英语水平，给出合适的回应
- 保持对话的连贯性和趣味性
- 可以询问问题来延续对话
- 使用简洁但丰富的语言

请直接用英语回复用户的消息。`;

        const defaultAgent2Prompt = `Role: You are a professional English expression refinement assistant.
Task: When given a sentence written by a non-native English learner, correct and improve the sentence to make it sound as natural, fluent, and native-like as possible. Your goal is not only to fix grammar or spelling mistakes, but also to enhance word choice, phrasing, and tone to match how a native speaker would naturally express the idea. You must not answer any questions posed by the user, only modify the sentence as required.
If the original sentence is already clear, natural, and native-like, you may leave it unchanged.
Output Format: Return only the improved sentence without any explanations, comments, or analysis.
Important Rules:
1. Make the sentence sound fluent, natural, and idiomatic — like something a native speaker would actually say or write.
2. Correct grammar, spelling, phrasing, and awkward or unnatural expressions.
3. Do not add extra information or remove essential meaning from the original sentence.
4. If the original sentence is perfectly fine for a native speaker to understand and use naturally, leave it unchanged.
5. Output only the corrected (or original) sentence. No additional text.
6. Don't answer any questions posed by the user, only modify the sentence as required.`;

        const agent1Prompt = localStorage.getItem('agent1Prompt') || defaultAgent1Prompt;
        const agent2Prompt = localStorage.getItem('agent2Prompt') || defaultAgent2Prompt;

        const agent1Element = document.getElementById('agent1Prompt');
        const agent2Element = document.getElementById('agent2Prompt');
        
        if (agent1Element && agent2Element) {
            agent1Element.value = agent1Prompt;
            agent2Element.value = agent2Prompt;
        }
    }

    // 保存Prompt到本地存储
    savePrompts() {
        const agent1Prompt = document.getElementById('agent1Prompt').value;
        const agent2Prompt = document.getElementById('agent2Prompt').value;

        localStorage.setItem('agent1Prompt', agent1Prompt);
        localStorage.setItem('agent2Prompt', agent2Prompt);

        this.showNotification('Prompt已保存到本地存储！', 'success');
    }

    // 加载聊天历史
    loadChatHistory() {
        const savedHistory = localStorage.getItem('chatHistory');
        this.chatHistory = savedHistory ? JSON.parse(savedHistory) : [];
    }

    // 保存聊天历史
    saveChatHistory() {
        localStorage.setItem('chatHistory', JSON.stringify(this.chatHistory));
    }

    // 设置事件监听器
    setupEventListeners() {
        // API选择改变时更新配置
        const apiSelect = document.getElementById('apiSelect');
        if (apiSelect) {
            apiSelect.addEventListener('change', (e) => {
                if (this.config) {
                    this.config.currentApi = e.target.value;
                }
            });
        }
    }

    // Tab切换功能
    switchTab(tabName) {
        // 更新Tab按钮状态
        document.querySelectorAll('.sidebar-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');

        // 更新Tab面板显示
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        if (tabName === 'config') {
            document.getElementById('configTab').classList.add('active');
        } else if (tabName === 'chat') {
            document.getElementById('chatTab').classList.add('active');
        }
    }

    // 处理聊天输入键盘事件
    handleChatKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendChatMessage();
        }
    }

    // 发送聊天消息
    async sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const userInput = chatInput.value.trim();
        
        if (!userInput) {
            this.showNotification('请输入您的英文消息', 'warning');
            return;
        }

        if (!this.config) {
            this.showNotification('配置加载失败，请刷新页面重试', 'error');
            return;
        }

        // 检查后端是否可用
        if (!this.config || !this.config.providers) {
            this.showNotification('后端服务未连接，请刷新页面重试', 'error');
            return;
        }

        const currentApi = this.config.currentApi;
        const provider = this.config.providers[currentApi];
        if (!provider || !provider.available) {
            this.showNotification(`${provider ? provider.name : currentApi} API未配置，请在后端.env文件中配置API密钥`, 'error');
            return;
        }

        // 生成消息ID
        const messageId = ++this.currentMessageId;
        
        // 禁用发送按钮
        const sendBtn = document.getElementById('chatSendBtn');
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="loading-spinner"></span>';

        // 清空输入框
        chatInput.value = '';
        
        // 清除语音识别的累加结果
        currentVoiceText = '';
        accumulatedVoiceText = '';

        // 添加用户消息到界面
        this.addUserMessage(userInput);

        // 添加AI助手响应容器
        const agentContainer = this.addAgentResponseContainer(messageId);

        try {
            // 获取当前Prompt
            const agent1Prompt = document.getElementById('agent1Prompt').value;
            const agent2Prompt = document.getElementById('agent2Prompt').value;

            // 并行调用两个AI助手角色（流式输出）
            await Promise.all([
                this.streamAgentResponse(agent1Prompt, userInput, messageId, 'agent1'),
                this.streamAgentResponse(agent2Prompt, userInput, messageId, 'agent2')
            ]);

            // 保存到历史记录
            const agent1Element = document.getElementById(`agent1-${messageId}`);
            const agent2Element = document.getElementById(`agent2-${messageId}`);
            
            const historyItem = {
                timestamp: new Date().toLocaleString('zh-CN'),
                userInput: userInput,
                agent1Response: agent1Element ? agent1Element.textContent.trim() : '',
                agent2Response: agent2Element ? agent2Element.textContent.trim() : ''
            };

            // 只有当至少有一个AI助手有有效回复时才保存
            if (historyItem.agent1Response || historyItem.agent2Response) {
                this.chatHistory.push(historyItem);
                this.saveChatHistory();
            }

        } catch (error) {
            console.error('发送消息时出错:', error);
            this.showNotification('发送消息失败: ' + error.message, 'error');
        } finally {
            // 恢复发送按钮
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span class="send-icon">🚀</span>';
        }
    }

    // 添加用户消息到聊天界面
    addUserMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';
        
        messageGroup.innerHTML = `
            <div class="timestamp">${new Date().toLocaleString('zh-CN')}</div>
            <div class="user-message">
                <div class="message-bubble">${this.escapeHtml(message)}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageGroup);
        this.scrollToBottom();
    }

    // 添加AI助手响应容器
    addAgentResponseContainer(messageId) {
        const chatMessages = document.getElementById('chatMessages');
        const responseContainer = document.createElement('div');
        responseContainer.className = 'agent-responses';
        
        responseContainer.innerHTML = `
            <div class="agent-message agent1-message">
                <div class="agent-label">💭 对话助手</div>
                <div class="message-bubble">
                    <div class="typing-indicator">
                        <span>正在思考</span>
                        <div class="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <div id="agent1-${messageId}" class="response-content" style="display: none;"></div>
                </div>
            </div>
            <div class="agent-message agent2-message">
                <div class="agent-label">✏️ 优化表达</div>
                <div class="message-bubble">
                    <div class="typing-indicator">
                        <span>正在分析</span>
                        <div class="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <div id="agent2-${messageId}" class="response-content" style="display: none;"></div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(responseContainer);
        this.scrollToBottom();
        return responseContainer;
    }

    // 流式调用AI助手响应
    async streamAgentResponse(prompt, userInput, messageId, agentType) {
        const currentApi = this.config.currentApi;

        const responseElement = document.getElementById(`${agentType}-${messageId}`);
        const typingIndicator = responseElement.parentElement.querySelector('.typing-indicator');
        
        try {
            // 构建对话历史消息数组
            const messages = this.buildMessagesWithHistory(prompt, userInput, agentType);
            
            // 检查messages是否有效
            if (!messages || messages.length === 0) {
                throw new Error(`${agentType} - 消息数组构建失败`);
            }
            
            // 构建发送到后端的请求数据
            const requestBody = {
                provider: currentApi,  // 告诉后端使用哪个API提供商
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000,
                stream: true
            };
            


            // 调用本地Flask后端API
            const response = await fetch('http://localhost:4399/api/llm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
            }

            // 隐藏打字指示器，显示响应内容
            typingIndicator.style.display = 'none';
            responseElement.style.display = 'block';

            // 等待streaming-markdown库加载
            await this.waitForStreamingMarkdown();

            // 创建markdown解析器
            const parserId = `${agentType}-${messageId}`;
            const renderer = window.smd.default_renderer(responseElement);
            const parser = window.smd.parser(renderer);
            this.markdownParsers.set(parserId, parser);

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留不完整的行

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') break;

                        try {
                            const parsed = JSON.parse(data);
                            let content = '';

                            // 通义千问和DeepSeek都使用OpenAI兼容格式
                            if (parsed.choices && parsed.choices.length > 0) {
                                content = parsed.choices[0]?.delta?.content || '';
                            }

                            if (content) {
                                // 使用streaming-markdown进行流式渲染
                                window.smd.parser_write(parser, content);
                                this.scrollToBottom();
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }

            // 结束流式解析
            window.smd.parser_end(parser);
            // 清理解析器
            this.markdownParsers.delete(parserId);

            // 如果没有收到流式数据，尝试非流式调用
            if (!responseElement.textContent.trim()) {
                console.warn(`${agentType} - 流式响应为空，尝试非流式调用`);
                const fallbackContent = await this.callAgentFallback(prompt, userInput, agentType);
                await this.renderMarkdownContent(responseElement, fallbackContent, agentType, messageId);
            }

        } catch (error) {
            console.error(`${agentType} 流式调用失败:`, error);
            
            // 隐藏打字指示器
            typingIndicator.style.display = 'none';
            responseElement.style.display = 'block';
            
            // 尝试非流式调用作为备用方案
            try {
                const fallbackContent = await this.callAgentFallback(prompt, userInput, agentType);
                await this.renderMarkdownContent(responseElement, fallbackContent, agentType, messageId);
            } catch (fallbackError) {
                responseElement.textContent = `❌ ${agentType === 'agent1' ? '对话助手' : '优化表达'}响应失败`;
            }
        }
    }

    // 构建包含历史对话的消息数组
    buildMessagesWithHistory(systemPrompt, currentUserInput, agentType) {
        const messages = [];
        
        // 1. 添加系统提示词
        messages.push({
            role: "system",
            content: systemPrompt
        });
        
        // 2. 如果是第一轮对话，直接添加用户输入，无需处理历史
        if (!this.chatHistory || this.chatHistory.length === 0) {
            messages.push({
                role: "user",
                content: currentUserInput
            });
            
            return messages;
        }
        
        // 3. 添加历史对话（最多保留最近的5轮对话，减少token使用）
        const maxHistoryRounds = 5;
        const recentHistory = this.chatHistory.slice(-maxHistoryRounds);
        
        let addedHistoryCount = 0;
        recentHistory.forEach(historyItem => {
            // 检查历史项是否有效
            if (!historyItem || !historyItem.userInput) {
                return; // 跳过无效的历史项
            }
            
            // 添加历史用户消息
            messages.push({
                role: "user",
                content: historyItem.userInput
            });
            
            // 添加对应的AI助手历史回复（必须有有效回复才添加）
            let assistantResponse = '';
            if (agentType === 'agent1' && historyItem.agent1Response && historyItem.agent1Response.trim()) {
                assistantResponse = historyItem.agent1Response.trim();
            } else if (agentType === 'agent2' && historyItem.agent2Response && historyItem.agent2Response.trim()) {
                assistantResponse = historyItem.agent2Response.trim();
            }
            
            if (assistantResponse) {
                messages.push({
                    role: "assistant",
                    content: assistantResponse
                });
                addedHistoryCount++;
            }
        });
        
        // 4. 添加当前用户输入
        messages.push({
            role: "user",
            content: currentUserInput
        });
        

        return messages;
    }

    // 等待streaming-markdown库加载
    async waitForStreamingMarkdown() {
        let retries = 0;
        const maxRetries = 50; // 最多等待5秒
        
        while (!window.smd && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.smd) {
            throw new Error('Streaming-markdown库加载失败');
        }
    }

    // 渲染markdown内容的辅助函数
    async renderMarkdownContent(element, content, agentType, messageId) {
        await this.waitForStreamingMarkdown();
        
        // 清空元素内容
        element.innerHTML = '';
        
        // 创建markdown解析器
        const parserId = `${agentType}-${messageId}`;
        const renderer = window.smd.default_renderer(element);
        const parser = window.smd.parser(renderer);
        
        // 一次性写入所有内容
        window.smd.parser_write(parser, content);
        window.smd.parser_end(parser);
    }

    // 非流式调用备用方案
    async callAgentFallback(prompt, userInput, agentType) {
        const currentApi = this.config.currentApi;


        // 构建对话历史消息数组
        const messages = this.buildMessagesWithHistory(prompt, userInput, agentType);

        // 构建发送到后端的请求数据（非流式）
        const requestBody = {
            provider: currentApi,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: false  // 非流式请求
        };
        


        // 调用本地Flask后端API
        const response = await fetch('http://localhost:4399/api/llm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        // 统一使用OpenAI兼容格式的响应解析
        let content = '';
        if (data.choices && data.choices.length > 0) {
            content = data.choices[0]?.message?.content || '未获取到有效响应';
        } else {
            content = '未获取到有效响应';
        }
        return content;
    }

    // 显示聊天历史
    async displayChatHistory() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages || this.chatHistory.length === 0) return;

        // 清除欢迎消息
        const welcomeMessage = chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // 等待streaming-markdown库加载
        await this.waitForStreamingMarkdown();

        // 显示历史消息
        for (let index = 0; index < this.chatHistory.length; index++) {
            const item = this.chatHistory[index];
            const messageId = `history-${index}`;
            
            // 添加用户消息
            const messageGroup = document.createElement('div');
            messageGroup.className = 'message-group';
            
            messageGroup.innerHTML = `
                <div class="timestamp">${item.timestamp}</div>
                <div class="user-message">
                    <div class="message-bubble">${this.escapeHtml(item.userInput)}</div>
                </div>
                <div class="agent-responses">
                    <div class="agent-message agent1-message">
                        <div class="agent-label">💭 对话助手</div>
                        <div class="message-bubble">
                            <div class="response-content" id="agent1-history-${index}"></div>
                        </div>
                    </div>
                    <div class="agent-message agent2-message">
                        <div class="agent-label">✏️ 优化表达</div>
                        <div class="message-bubble">
                            <div class="response-content" id="agent2-history-${index}"></div>
                        </div>
                    </div>
                </div>
            `;
            
            chatMessages.appendChild(messageGroup);

            // 使用markdown渲染历史消息
            const agent1Element = document.getElementById(`agent1-history-${index}`);
            const agent2Element = document.getElementById(`agent2-history-${index}`);
            
            if (agent1Element && item.agent1Response) {
                await this.renderMarkdownContent(agent1Element, item.agent1Response, 'agent1', `history-${index}`);
            }
            
            if (agent2Element && item.agent2Response) {
                await this.renderMarkdownContent(agent2Element, item.agent2Response, 'agent2', `history-${index}`);
            }
        }

        this.scrollToBottom();
    }

    // 清空聊天历史
    clearChatHistory() {
        if (confirm('确定要清空所有对话记录吗？此操作不可撤销。')) {
            this.chatHistory = [];
            localStorage.removeItem('chatHistory');
            
            // 清空聊天界面
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="system-message">
                        <div class="message-content">
                            🎯 欢迎使用英语对话助手！<br>
                            💭 对话助手将与您进行英语交流<br>
                            ✏️ 纠错助手将为您提供优化表达<br>
                            开始输入您的英文消息吧！
                        </div>
                    </div>
                </div>
            `;
            
            this.showNotification('对话记录已清空', 'success');
        }
    }

    // 滚动到底部
    scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 100);
        }
    }

    // 转义HTML字符
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示通知消息
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        }, 3000);
    }
}

// 创建全局应用实例
const app = new EnglishChatApp();

// 全局函数，供HTML调用
function switchTab(tabName) {
    app.switchTab(tabName);
}

function savePrompts() {
    app.savePrompts();
}

function sendChatMessage() {
    app.sendChatMessage();
}

function handleChatKeyPress(event) {
    app.handleChatKeyPress(event);
}

function clearChatHistory() {
    app.clearChatHistory();
}

// ================ 语音功能相关 ================

// 语音状态管理
let isVoiceRecording = false;
let voiceStartTime = null;
let voiceTimer = null;
let currentVoiceText = '';
let accumulatedVoiceText = ''; // 累积的语音识别文本

// 初始化语音功能
function initVoiceFeature() {
    console.log('🎙️ 初始化语音功能...');
    
    // 创建语音客户端实例
    window.speechClient = new SpeechClient();
    
    // 设置语音客户端事件监听器
    speechClient.onResult = handleVoiceResult;
    speechClient.onError = handleVoiceError;
    speechClient.onStart = handleVoiceStart;
    speechClient.onStop = handleVoiceStop;
    speechClient.onStatusChange = handleVoiceStatusChange;
    
    console.log('✅ 语音功能初始化完成');
}

// 切换语音输入状态
async function toggleVoiceInput() {
    const voiceBtn = document.getElementById('voiceInputBtn');
    const voiceIcon = document.getElementById('voiceInputIcon');
    
    if (!isVoiceRecording) {
        console.log('🎙️ 开始语音输入...');
        
        try {
            // 请求麦克风权限
            await requestMicrophonePermission();
            
            // 开始录音
            await startVoiceRecording();
            
        } catch (error) {
            console.error('❌ 语音输入失败:', error);
            app.showNotification('语音输入失败: ' + error.message, 'error');
            resetVoiceInputUI();
        }
    } else {
        console.log('🛑 停止语音输入...');
        await stopVoiceRecording();
    }
}

// 请求麦克风权限
async function requestMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 立即停止流，我们只是为了获取权限
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ 麦克风权限已获取');
        return true;
    } catch (error) {
        console.error('❌ 麦克风权限被拒绝:', error);
        throw new Error('需要麦克风权限才能使用语音输入功能');
    }
}

// 开始语音录音
async function startVoiceRecording() {
    const voiceBtn = document.getElementById('voiceInputBtn');
    const voiceIcon = document.getElementById('voiceInputIcon');
    const statusBar = document.getElementById('voiceStatusBar');
    const realtimeResult = document.getElementById('voiceRealtimeResult');
    
    // 更新UI状态
    voiceBtn.classList.add('recording');
    voiceIcon.textContent = '⏳';
    statusBar.style.display = 'block';
    realtimeResult.style.display = 'block';
    
    // 重置状态
    currentVoiceText = '';
    accumulatedVoiceText = ''; // 重置累积文本
    voiceStartTime = Date.now();
    updateVoiceTimer();
    
    // 清空实时识别结果显示
    const realtimeTextElement = document.getElementById('realtimeResultText');
    if (realtimeTextElement) {
        realtimeTextElement.textContent = '';
    }
    
    try {
        const success = await speechClient.startRecording();
        if (success) {
            isVoiceRecording = true;
            voiceIcon.textContent = '🛑';
            updateVoiceStatusText('正在录音...');
            
            // 开始计时器
            voiceTimer = setInterval(updateVoiceTimer, 1000);
            
            console.log('✅ 语音录音已开始');
        } else {
            throw new Error('语音识别服务启动失败');
        }
    } catch (error) {
        resetVoiceInputUI();
        throw error;
    }
}

// 停止语音录音
async function stopVoiceRecording() {
    if (!isVoiceRecording) return;
    
    console.log('🛑 停止语音录音...');
    
    // 停止录音
    speechClient.stopRecording();
    
    // 清理计时器
    if (voiceTimer) {
        clearInterval(voiceTimer);
        voiceTimer = null;
    }
    
    // 更新状态
    isVoiceRecording = false;
    updateVoiceStatusText('处理中...');
    
    // 如果有识别结果，自动填入输入框并发送
    if (currentVoiceText.trim()) {
        const chatInput = document.getElementById('chatInput');
        chatInput.value = currentVoiceText.trim();
        
        // 重置语音UI
        resetVoiceInputUI();
        
        // 自动发送消息
        setTimeout(() => {
            app.sendChatMessage();
        }, 500);
    } else {
        resetVoiceInputUI();
        app.showNotification('未识别到语音内容', 'warning');
    }
}

// 重置语音输入UI
function resetVoiceInputUI() {
    const voiceBtn = document.getElementById('voiceInputBtn');
    const voiceIcon = document.getElementById('voiceInputIcon');
    const statusBar = document.getElementById('voiceStatusBar');
    const realtimeResult = document.getElementById('voiceRealtimeResult');
    
    // 重置按钮状态
    voiceBtn.classList.remove('recording');
    voiceIcon.textContent = '🎙️';
    
    // 隐藏语音UI元素
    statusBar.style.display = 'none';
    realtimeResult.style.display = 'none';
    
    // 清理计时器
    if (voiceTimer) {
        clearInterval(voiceTimer);
        voiceTimer = null;
    }
    
    // 重置状态变量
    isVoiceRecording = false;
    currentVoiceText = '';
    accumulatedVoiceText = ''; // 重置累积文本
}

// 隐藏语音UI（简化版，避免递归）
function hideVoiceUI() {
    const statusBar = document.getElementById('voiceStatusBar');
    const realtimeResult = document.getElementById('voiceRealtimeResult');
    
    if (statusBar) statusBar.style.display = 'none';
    if (realtimeResult) realtimeResult.style.display = 'none';
}

// 更新语音计时器
function updateVoiceTimer() {
    if (!voiceStartTime) return;
    
    const elapsed = Math.floor((Date.now() - voiceStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timeElement = document.getElementById('voiceStatusTime');
    if (timeElement) {
        timeElement.textContent = timeText;
    }
}

// 更新语音状态文本
function updateVoiceStatusText(text) {
    const statusTextElement = document.getElementById('voiceStatusText');
    if (statusTextElement) {
        statusTextElement.textContent = text;
    }
}



// 处理语音识别结果
function handleVoiceResult(result) {
    console.log('📝 收到语音识别结果:', result);
    
    if (result.text) {
        if (result.isFinal) {
            // 最终结果：累加到已确认文本中
            console.log('✅ 句子结束，累加文本:', result.text);
            accumulatedVoiceText += result.text;
            
            // 更新完整文本
            currentVoiceText = accumulatedVoiceText;
            
            // 更新状态文本
            updateVoiceStatusText('识别完成');
        } else {
            // 临时结果：显示累积文本 + 当前正在识别的文本
            currentVoiceText = accumulatedVoiceText + result.text;
        }
        
        // 更新实时显示
        const realtimeTextElement = document.getElementById('realtimeResultText');
        if (realtimeTextElement) {
            realtimeTextElement.textContent = currentVoiceText;
        }
    }
}

// 处理语音错误
function handleVoiceError(error) {
    console.error('❌ 语音识别错误:', error);
    
    // 重置UI状态
    resetVoiceInputUI();
    
    app.showNotification('语音识别错误: ' + error.message, 'error');
}

// 处理录音开始
function handleVoiceStart(event) {
    console.log('🎙️ 录音已开始:', event);
    updateVoiceStatusText('录音中...');
}

// 处理录音停止
function handleVoiceStop(event) {
    console.log('🛑 录音已停止:', event);
    updateVoiceStatusText('处理中...');
}

// 处理状态变化
function handleVoiceStatusChange(event) {
    console.log('🔄 语音状态变化:', event);
    
    const statusMap = {
        'connected': '已连接',
        'recording': '录音中...',
        'stopped': '已停止',
        'disconnected': '连接断开',
        'error': '发生错误',
        'destroyed': '会话结束'
    };
    
    const statusText = statusMap[event.status] || event.status;
    updateVoiceStatusText(statusText);
}



// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 应用已启动
    initVoiceFeature();
}); 