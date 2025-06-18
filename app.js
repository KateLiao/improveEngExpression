// 英语对话助手 - 双Agent架构应用
class EnglishChatApp {
    constructor() {
        this.config = null;
        this.chatHistory = [];
        this.currentMessageId = 0;
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
            // 首先尝试从config.json加载配置
            let configLoaded = false;
            
            try {
                const response = await fetch('./config.json');
                if (response.ok) {
                    this.config = await response.json();
                    configLoaded = true;
                }
            } catch (fetchError) {
                console.log('无法加载config.json，使用默认配置');
            }
            
            // 如果无法加载config.json，使用默认模板配置
            if (!configLoaded) {
                this.config = {
                    "currentApi": "tongyi",
                    "apis": {
                        "tongyi": {
                            "name": "通义千问",
                            "endpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                            "model": "qwen-plus",
                            "apiKey": "YOUR_TONGYI_API_KEY_HERE"
                        },
                        "deepseek": {
                            "name": "DeepSeek",
                            "endpoint": "https://api.deepseek.com/v1/chat/completions",
                            "model": "deepseek-chat",
                            "apiKey": "YOUR_DEEPSEEK_API_KEY_HERE"
                        }
                    }
                };
                
                // 提示用户配置API密钥
                this.showNotification('请先配置您的API密钥！复制config.template.json为config.json并填入真实的API密钥', 'warning');
            }
            
            // 设置当前API选择
            const apiSelect = document.getElementById('apiSelect');
            if (apiSelect) {
                apiSelect.value = this.config.currentApi;
            }
            
        } catch (error) {
            console.error('加载配置失败:', error);
            this.showNotification('配置加载失败，请刷新页面重试', 'error');
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
Task: When given a sentence written by a non-native English learner, correct and improve the sentence to make it sound as natural, fluent, and native-like as possible. Your goal is not only to fix grammar or spelling mistakes, but also to enhance word choice, phrasing, and tone to match how a native speaker would naturally express the idea.
If the original sentence is already clear, natural, and native-like, you may leave it unchanged.
Output Format: Return only the improved sentence without any explanations, comments, or analysis.
Important Rules:
1. Make the sentence sound fluent, natural, and idiomatic — like something a native speaker would actually say or write.
2. Correct grammar, spelling, phrasing, and awkward or unnatural expressions.
3. Do not add extra information or remove essential meaning from the original sentence.
4. If the original sentence is perfectly fine for a native speaker to understand and use naturally, leave it unchanged.
5. Output only the corrected (or original) sentence. No additional text.`;

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

        // 检查API密钥是否已配置
        const currentApi = this.config.currentApi;
        const apiConfig = this.config.apis[currentApi];
        if (!apiConfig || apiConfig.apiKey === 'YOUR_TONGYI_API_KEY_HERE' || apiConfig.apiKey === 'YOUR_DEEPSEEK_API_KEY_HERE') {
            this.showNotification('请先配置您的API密钥！复制config.template.json为config.json并填入真实的API密钥', 'error');
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

        // 添加用户消息到界面
        this.addUserMessage(userInput);

        // 添加Agent响应容器
        const agentContainer = this.addAgentResponseContainer(messageId);

        try {
            // 获取当前Prompt
            const agent1Prompt = document.getElementById('agent1Prompt').value;
            const agent2Prompt = document.getElementById('agent2Prompt').value;

            // 并行调用两个Agent（流式输出）
            await Promise.all([
                this.streamAgentResponse(agent1Prompt, userInput, messageId, 'agent1'),
                this.streamAgentResponse(agent2Prompt, userInput, messageId, 'agent2')
            ]);

            // 保存到历史记录
            const historyItem = {
                timestamp: new Date().toLocaleString('zh-CN'),
                userInput: userInput,
                agent1Response: document.getElementById(`agent1-${messageId}`).textContent,
                agent2Response: document.getElementById(`agent2-${messageId}`).textContent
            };

            this.chatHistory.push(historyItem);
            this.saveChatHistory();

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

    // 添加Agent响应容器
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
                <div class="agent-label">✏️ 纠错助手</div>
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

    // 流式调用Agent响应
    async streamAgentResponse(prompt, userInput, messageId, agentType) {
        const currentApi = this.config.currentApi;
        const apiConfig = this.config.apis[currentApi];

        if (!apiConfig) {
            throw new Error(`未找到${currentApi}的API配置`);
        }

        const responseElement = document.getElementById(`${agentType}-${messageId}`);
        const typingIndicator = responseElement.parentElement.querySelector('.typing-indicator');
        
        try {
            let requestBody;
            let headers;

            if (currentApi === 'tongyi') {
                // 通义千问使用OpenAI兼容格式（流式）
                requestBody = {
                    model: apiConfig.model,
                    messages: [
                        {
                            role: "system",
                            content: prompt
                        },
                        {
                            role: "user",
                            content: userInput
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true,
                    stream_options: {
                        include_usage: true
                    }
                };
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiConfig.apiKey}`
                };
            } else if (currentApi === 'deepseek') {
                // DeepSeek API格式（OpenAI兼容）
                requestBody = {
                    model: apiConfig.model,
                    messages: [
                        {
                            role: "system",
                            content: prompt
                        },
                        {
                            role: "user",
                            content: userInput
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true
                };
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiConfig.apiKey}`
                };
            }

            const response = await fetch(apiConfig.endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`${currentApi} API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
            }

            // 隐藏打字指示器，显示响应内容
            typingIndicator.style.display = 'none';
            responseElement.style.display = 'block';

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
                                responseElement.textContent += content;
                                this.scrollToBottom();
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }

            // 如果没有收到流式数据，尝试非流式调用
            if (!responseElement.textContent.trim()) {
                const fallbackContent = await this.callAgentFallback(prompt, userInput, agentType);
                responseElement.textContent = fallbackContent;
            }

        } catch (error) {
            console.error(`${agentType} 流式调用失败:`, error);
            
            // 隐藏打字指示器
            typingIndicator.style.display = 'none';
            responseElement.style.display = 'block';
            
            // 尝试非流式调用作为备用方案
            try {
                const fallbackContent = await this.callAgentFallback(prompt, userInput, agentType);
                responseElement.textContent = fallbackContent;
            } catch (fallbackError) {
                responseElement.textContent = `❌ ${agentType === 'agent1' ? '对话助手' : '纠错助手'}响应失败`;
            }
        }
    }

    // 非流式调用备用方案
    async callAgentFallback(prompt, userInput, agentType) {
        const currentApi = this.config.currentApi;
        const apiConfig = this.config.apis[currentApi];

        let requestBody;
        let headers;

        // 统一使用OpenAI兼容格式
        requestBody = {
            model: apiConfig.model,
            messages: [
                {
                    role: "system",
                    content: prompt
                },
                {
                    role: "user",
                    content: userInput
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
        };

        const response = await fetch(apiConfig.endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${currentApi} API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
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
    displayChatHistory() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages || this.chatHistory.length === 0) return;

        // 清除欢迎消息
        const welcomeMessage = chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // 显示历史消息
        this.chatHistory.forEach((item, index) => {
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
                            <div class="response-content">${this.escapeHtml(item.agent1Response)}</div>
                        </div>
                    </div>
                    <div class="agent-message agent2-message">
                        <div class="agent-label">✏️ 纠错助手</div>
                        <div class="message-bubble">
                            <div class="response-content">${this.escapeHtml(item.agent2Response)}</div>
                        </div>
                    </div>
                </div>
            `;
            
            chatMessages.appendChild(messageGroup);
        });

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
                            ✏️ 纠错助手将分析您的语法<br>
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('英语对话助手已启动！');
}); 