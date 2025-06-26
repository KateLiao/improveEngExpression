/**
 * 语音服务配置
 * 基于腾讯云官方SDK + STS临时密钥的混合架构
 */

class SpeechConfig {
    constructor() {
        this.serverUrl = window.location.origin;
        this.currentCredentials = null;
        this.sessionId = null;
        this.credentialsExpireTime = 0;
        
        // ASR参数配置
        this.asrParams = {
            // 🎯 语音识别引擎模型 (最重要参数)
            // '16k_zh' - 16k中文通用模型 (推荐)
            // '16k_en' - 16k英文通用模型
            // '8k_zh' - 8k中文通用模型
            // '16k_zh_dialect' - 16k中文方言模型
            engine_model_type: '16k_zh-PY',
            
            // 🎵 音频格式
            // 1 - PCM (推荐，质量最好)
            // 4 - Speex, 6 - Silk, 8 - MP3, 10 - Opus
            voice_format: 1,
            
            // 🔊 语音活动检测 (VAD)
            // 1 - 开启 (推荐，自动检测语音开始/结束)
            // 0 - 关闭
            needvad: 1,
            
            // 🚫 脏词过滤
            // 1 - 开启, 0 - 关闭
            filter_dirty: 1,
            
            // 💬 语气词过滤 (嗯、啊等)
            // 0 - 不过滤, 1 - 过滤部分, 2 - 严格过滤
            filter_modal: 2,
            
            // ✏️ 标点符号
            // 0 - 不过滤 (保留标点), 1 - 过滤标点
            filter_punc: 0,
            
            // 🔢 数字转换模式
            // 0 - 直接输出数字, 1 - 根据场景智能转换
            convert_num_mode: 1,
            
            // ⏱️ 词级别时间戳
            // 0 - 不返回, 1 - 返回词级别时间戳, 2 - 返回详细信息
            word_info: 2
        };
        

    }
    
    /**
     * 获取STS临时密钥
     */
    async getTempCredentials() {
        try {

            
            const response = await fetch(`${this.serverUrl}/api/speech/sts-credentials`);
            const data = await response.json();
            
            if (data.success) {
                this.currentCredentials = data.credentials;
                this.sessionId = data.session_id;
                this.credentialsExpireTime = data.credentials.expiredTime * 1000; // 转换为毫秒
                

                
                return this.currentCredentials;
            } else {
                throw new Error(data.error || '临时密钥获取失败');
            }
        } catch (error) {
            console.error('❌ STS临时密钥获取失败:', error);
            throw error;
        }
    }
    
    /**
     * 刷新STS临时密钥
     */
    async refreshCredentials() {
        try {

            
            const response = await fetch(`${this.serverUrl}/api/speech/sts-refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.sessionId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentCredentials = data.credentials;
                this.credentialsExpireTime = data.credentials.expiredTime * 1000;
                

                return this.currentCredentials;
            } else {
                throw new Error(data.error || '临时密钥刷新失败');
            }
        } catch (error) {
            console.error('❌ STS临时密钥刷新失败:', error);
            // 刷新失败时重新获取
            return await this.getTempCredentials();
        }
    }
    
    /**
     * 检查临时密钥是否需要刷新
     */
    needsRefresh() {
        if (!this.currentCredentials) return true;
        
        const now = Date.now();
        const timeLeft = this.credentialsExpireTime - now;
        
        // 提前5分钟刷新
        return timeLeft < 5 * 60 * 1000;
    }
    
    /**
     * 获取有效的临时密钥
     */
    async getValidCredentials() {
        if (this.needsRefresh()) {
            if (this.currentCredentials) {
                return await this.refreshCredentials();
            } else {
                return await this.getTempCredentials();
            }
        }
        
        return this.currentCredentials;
    }
    
    /**
     * 获取完整的ASR参数配置
     */
    async getASRConfig() {
        const credentials = await this.getValidCredentials();
        
        return {
            // 临时密钥认证
            secretid: credentials.tmpSecretId,
            secretkey: credentials.tmpSecretKey,
            token: credentials.sessionToken,
            appid: credentials.appId,
            
            // ASR参数
            ...this.asrParams,
            
            // 签名回调函数
            signCallback: this.createSignCallback(credentials.tmpSecretKey)
        };
    }
    
    /**
     * 创建签名回调函数
     */
    createSignCallback(secretKey) {
        return function(signStr) {

            
            // 使用CryptoJS进行HMAC-SHA1签名
            if (typeof CryptoJS === 'undefined') {
                console.error('❌ CryptoJS未加载');
                throw new Error('CryptoJS库未加载');
            }
            
            const hash = CryptoJS.HmacSHA1(signStr, secretKey);
            const bytes = speechConfig.uint8ArrayToString(speechConfig.toUint8Array(hash));
            const signature = window.btoa(bytes);
            

            return signature;
        };
    }
    
    /**
     * 工具函数：WordArray转Uint8Array
     */
    toUint8Array(wordArray) {
        const words = wordArray.words;
        const sigBytes = wordArray.sigBytes;
        const u8 = new Uint8Array(sigBytes);
        
        for (let i = 0; i < sigBytes; i++) {
            u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        
        return u8;
    }
    
    /**
     * 工具函数：Uint8Array转String
     */
    uint8ArrayToString(fileData) {
        let dataString = '';
        for (let i = 0; i < fileData.length; i++) {
            dataString += String.fromCharCode(fileData[i]);
        }
        return dataString;
    }
}

// 全局配置实例
const speechConfig = new SpeechConfig();

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = speechConfig;
} else {
    window.speechConfig = speechConfig;
} 