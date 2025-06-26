/**
 * 语音识别客户端
 * 基于腾讯云官方SDK的封装
 */

class SpeechClient {
    constructor() {
        this.recognizer = null;
        this.isRecording = false;
        this.isConnected = false;
        this.currentSessionId = null;
        
        // 回调函数
        this.onResult = null;
        this.onError = null;
        this.onStart = null;
        this.onStop = null;
        this.onStatusChange = null;
        

    }
    
    /**
     * 初始化语音识别器
     */
    async init() {
        try {
    
            
            // 获取ASR配置（包含临时密钥）
            const config = await speechConfig.getASRConfig();
            
            // 使用官方编译版本的WebAudioSpeechRecognizer
            this.recognizer = new WebAudioSpeechRecognizer(config);
            
            // 绑定事件监听器
            this.bindEvents();
            
            return true;
            
        } catch (error) {
            console.error('❌ 语音识别器初始化失败:', error);
            this.triggerError('初始化失败: ' + error.message);
            return false;
        }
    }
    
    /**
     * 绑定事件监听器
     */
    bindEvents() {
        if (!this.recognizer) return;
        
        // 连接建立
        this.recognizer.OnRecognitionStart = (res) => {
            this.isConnected = true;
            this.currentSessionId = res.voice_id;
            this.triggerStatusChange('connected');
            this.triggerStart();
        };
        
        // 一句话开始
        this.recognizer.OnSentenceBegin = (res) => {
            // 句子开始事件
        };
        
        // 识别结果变化
        this.recognizer.OnRecognitionResultChange = (res) => {
            this.triggerResult(res, false);
        };
        
        // 一句话结束
        this.recognizer.OnSentenceEnd = (res) => {
            this.triggerResult(res, true);
        };
        
        // 识别完成
        this.recognizer.OnRecognitionComplete = (res) => {
            this.triggerResult(res, true);
        };
        
        // 识别错误
        this.recognizer.OnError = (error) => {
            console.error('❌ 识别错误:', error);
            this.isConnected = false;
            this.isRecording = false;
            this.triggerError('识别错误: ' + (error.message || error.msg || JSON.stringify(error)));
            this.triggerStatusChange('error');
        };
        
        // 录音停止
        this.recognizer.OnRecorderStop = (res) => {
            this.isRecording = false;
            this.triggerStop();
            this.triggerStatusChange('stopped');
        };
    }
    
    /**
     * 开始录音识别
     */
    async startRecording() {
        try {
            if (this.isRecording) {
                return false;
            }
            
            // 初始化识别器
            await this.init();
            
            // 开始识别
            this.recognizer.start();
            this.isRecording = true;
            
            this.triggerStatusChange('recording');
            
            return true;
            
        } catch (error) {
            console.error('❌ 开始录音失败:', error);
            this.triggerError('开始录音失败: ' + error.message);
            return false;
        }
    }
    
    /**
     * 停止录音识别
     */
    stopRecording() {
        try {
            if (!this.isRecording) {
                return false;
            }
            
            if (this.recognizer) {
                this.recognizer.stop();
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ 停止录音失败:', error);
            this.triggerError('停止录音失败: ' + error.message);
            return false;
        }
    }
    
    /**
     * 销毁识别器
     */
    destroy() {
        try {
            if (this.isRecording) {
                this.stopRecording();
            }
            
            if (this.recognizer) {
                this.recognizer.destroyStream();
                this.recognizer = null;
            }
            
            this.isConnected = false;
            this.isRecording = false;
            this.currentSessionId = null;
            
            this.triggerStatusChange('destroyed');
            
        } catch (error) {
            console.error('❌ 销毁识别器失败:', error);
        }
    }
    
    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            isRecording: this.isRecording,
            isConnected: this.isConnected,
            sessionId: this.currentSessionId,
            hasRecognizer: !!this.recognizer
        };
    }
    
    /**
     * 触发识别结果回调
     */
    triggerResult(result, isFinal = false) {
        if (this.onResult && result && result.result) {
            this.onResult({
                text: result.result.voice_text_str || '',
                isFinal: isFinal,
                confidence: result.result.word_confidence || 0,
                sessionId: this.currentSessionId
            });
        }
    }
    
    /**
     * 触发错误回调
     */
    triggerError(message) {
        if (this.onError) {
            this.onError(message);
        }
        console.error('🚨 SpeechClient Error:', message);
    }
    
    /**
     * 触发开始回调
     */
    triggerStart() {
        if (this.onStart) {
            this.onStart();
        }
    }
    
    /**
     * 触发停止回调
     */
    triggerStop() {
        if (this.onStop) {
            this.onStop();
        }
    }
    
    /**
     * 触发状态变化回调
     */
    triggerStatusChange(status) {
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
    }
}

// 导出到全局
window.SpeechClient = SpeechClient; 