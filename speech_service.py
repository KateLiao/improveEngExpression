import os
import json
import uuid
import time
from dotenv import load_dotenv
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.sts.v20180813 import sts_client, models

load_dotenv()

class TencentSTSService:
    """腾讯云STS临时密钥服务"""
    
    def __init__(self):
        self.secret_id = os.getenv("TENCENT_ASR_SECRET_ID")
        self.secret_key = os.getenv("TENCENT_ASR_SECRET_KEY")
        self.region = os.getenv("TENCENT_ASR_REGION", "ap-beijing")
        self.app_id = os.getenv("TENCENT_ASR_APP_ID")
        
        if not all([self.secret_id, self.secret_key, self.app_id]):
            raise ValueError("缺少必要的腾讯云配置信息")
        
        # 初始化STS客户端
        self.credential = credential.Credential(self.secret_id, self.secret_key)
        self.http_profile = HttpProfile()
        self.http_profile.endpoint = "sts.tencentcloudapi.com"
        
        self.client_profile = ClientProfile()
        self.client_profile.httpProfile = self.http_profile
        
        self.client = sts_client.StsClient(self.credential, self.region, self.client_profile)
    
    def generate_temporary_credentials(self, duration_seconds=3600):
        """
        生成临时密钥用于前端直接调用腾讯云ASR服务
        
        Args:
            duration_seconds: 临时密钥有效期（秒），默认1小时
            
        Returns:
            dict: 包含临时密钥信息的字典
        """
        try:
            # 构建权限策略 - 仅允许ASR相关操作
            policy = {
                "version": "2.0",
                "statement": [
                    {
                        "effect": "allow",
                        "action": [
                            "asr:SentenceRecognition",
                            "asr:CreateRecTask", 
                            "asr:DescribeTaskStatus",
                            "asr:*"
                        ],
                        "resource": "*"
                    }
                ]
            }
            
            # 创建临时密钥请求
            req = models.GetFederationTokenRequest()
            req.Name = "ASRTemporaryAccess"
            req.Policy = json.dumps(policy)
            req.DurationSeconds = duration_seconds
            
            # 调用接口获取临时密钥
            resp = self.client.GetFederationToken(req)
            
            return {
                "success": True,
                "credentials": {
                    "tmpSecretId": resp.Credentials.TmpSecretId,
                    "tmpSecretKey": resp.Credentials.TmpSecretKey,
                    "sessionToken": resp.Credentials.Token,
                    "expiredTime": resp.ExpiredTime,
                    "appId": self.app_id,
                    "region": self.region
                },
                "requestId": resp.RequestId
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "临时密钥生成失败"
            }
    
    def validate_credentials(self):
        """验证当前配置的永久密钥是否有效"""
        try:
            # 尝试生成一个短期临时密钥来验证
            result = self.generate_temporary_credentials(duration_seconds=300)
            return result["success"]
        except Exception:
            return False

class STSSessionManager:
    """STS会话管理器"""
    
    def __init__(self):
        self.sessions = {}
        self.sts_service = TencentSTSService()
    
    def create_session(self, session_id=None):
        """创建新的STS会话"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # 生成临时密钥
        credentials = self.sts_service.generate_temporary_credentials()
        
        if credentials["success"]:
            self.sessions[session_id] = {
                "credentials": credentials["credentials"],
                "created_at": time.time(),
                "expires_at": credentials["credentials"]["expiredTime"]
            }
            
            return {
                "success": True,
                "session_id": session_id,
                "credentials": credentials["credentials"]
            }
        else:
            return credentials
    
    def get_session(self, session_id):
        """获取会话信息"""
        session = self.sessions.get(session_id)
        if not session:
            return {"success": False, "error": "会话不存在"}
        
        # 检查是否过期
        if time.time() > session["expires_at"]:
            self.remove_session(session_id)
            return {"success": False, "error": "会话已过期"}
        
        return {"success": True, "session": session}
    
    def refresh_session(self, session_id):
        """刷新会话的临时密钥"""
        if session_id not in self.sessions:
            return {"success": False, "error": "会话不存在"}
        
        # 生成新的临时密钥
        credentials = self.sts_service.generate_temporary_credentials()
        
        if credentials["success"]:
            self.sessions[session_id] = {
                "credentials": credentials["credentials"],
                "created_at": time.time(),
                "expires_at": credentials["credentials"]["expiredTime"]
            }
            return {"success": True, "credentials": credentials["credentials"]}
        else:
            return credentials
    
    def remove_session(self, session_id):
        """移除会话"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return {"success": True}
        return {"success": False, "error": "会话不存在"}
    
    def cleanup_expired_sessions(self):
        """清理过期的会话"""
        current_time = time.time()
        expired_sessions = [
            session_id for session_id, session in self.sessions.items()
            if current_time > session["expires_at"]
        ]
        
        for session_id in expired_sessions:
            del self.sessions[session_id]
        
        return len(expired_sessions)

# 全局STS会话管理器实例
sts_session_manager = STSSessionManager()
