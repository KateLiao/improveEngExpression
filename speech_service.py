import os
import json
import uuid
import time
import hmac
import hashlib
import base64
from urllib.parse import urlencode, quote
from dotenv import load_dotenv

load_dotenv()

class TencentASRService:
    def __init__(self):
        self.app_id = os.getenv("TENCENT_ASR_APP_ID")
        self.secret_id = os.getenv("TENCENT_ASR_SECRET_ID")
        self.secret_key = os.getenv("TENCENT_ASR_SECRET_KEY")
        self.region = os.getenv("TENCENT_ASR_REGION", "ap-beijing")
        self.engine_type = os.getenv("TENCENT_ASR_ENGINE_TYPE", "16k_zh")
        
        self.websocket = None
        self.voice_id = None
        self.is_connected = False
        
        self.on_recognition_result = None
        self.on_error = None
        self.on_connected = None
        self.on_disconnected = None
    
    def generate_signature(self, params):
        host = "asr.cloud.tencent.com"
        uri = f"/asr/v2/{self.app_id}"
        sorted_params = sorted(params.items())
        query_string = urlencode(sorted_params)
        sign_str = f"{host}{uri}?{query_string}"
        signature = hmac.new(
            self.secret_key.encode("utf-8"),
            sign_str.encode("utf-8"),
            hashlib.sha1
        ).digest()
        return base64.b64encode(signature).decode("utf-8")
    
    def create_websocket_url(self, voice_id=None):
        if not voice_id:
            voice_id = str(uuid.uuid4())
        self.voice_id = voice_id
        
        timestamp = int(time.time())
        params = {
            "secretid": self.secret_id,
            "timestamp": str(timestamp),
            "expired": str(timestamp + 3600),
            "nonce": str(timestamp),
            "voice_id": voice_id,
            "voice_format": "1",
            "engine_model_type": self.engine_type,
        }
        
        signature = self.generate_signature(params)
        params["signature"] = quote(signature)
        query_string = urlencode(params)
        return f"wss://asr.cloud.tencent.com/asr/v2/{self.app_id}?{query_string}"
    
    def set_recognition_callback(self, callback):
        self.on_recognition_result = callback
    
    def set_error_callback(self, callback):
        self.on_error = callback
    
    def set_connected_callback(self, callback):
        self.on_connected = callback
    
    def set_disconnected_callback(self, callback):
        self.on_disconnected = callback

class ASRSessionManager:
    def __init__(self):
        self.sessions = {}
    
    def create_session(self, voice_id=None):
        if not voice_id:
            voice_id = str(uuid.uuid4())
        session = TencentASRService()
        self.sessions[voice_id] = session
        return session
    
    def get_session(self, voice_id):
        return self.sessions.get(voice_id)
    
    def remove_session(self, voice_id):
        if voice_id in self.sessions:
            del self.sessions[voice_id]

asr_session_manager = ASRSessionManager()
