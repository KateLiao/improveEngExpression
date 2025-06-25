import io
import numpy as np
from typing import Optional, Tuple, List, Dict
import base64

class AudioProcessor:
    TARGET_SAMPLE_RATE = 16000
    TARGET_CHANNELS = 1
    TARGET_SAMPLE_WIDTH = 2
    CHUNK_SIZE = 1280
    
    def __init__(self):
        self.sample_rate = self.TARGET_SAMPLE_RATE
        self.channels = self.TARGET_CHANNELS
        self.sample_width = self.TARGET_SAMPLE_WIDTH
    
    def convert_to_pcm(self, audio_data: bytes, source_format: str = 'wav'):
        try:
            if source_format.lower() == 'pcm':
                return audio_data
            # 简化版本，直接返回
            return audio_data
        except Exception as e:
            print(f"音频格式转换失败: {e}")
            return None
    
    def chunk_audio_data(self, audio_data: bytes, chunk_size: int = None):
        if chunk_size is None:
            chunk_size = self.CHUNK_SIZE
        
        chunks = []
        for i in range(0, len(audio_data), chunk_size):
            chunk = audio_data[i:i + chunk_size]
            chunks.append(chunk)
        return chunks
    
    def validate_audio_quality(self, audio_data: bytes):
        try:
            if len(audio_data) < 1000:
                return False, "音频数据太短"
            
            if len(audio_data) % 2 != 0:
                return False, "音频数据长度不是2的倍数"
            
            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            
            if np.max(np.abs(audio_array)) < 100:
                return False, "音频音量太小或为静音"
            
            return True, "音频质量良好"
            
        except Exception as e:
            return False, f"音频质量检查失败: {e}"
    
    def base64_to_audio(self, base64_data: str):
        try:
            return base64.b64decode(base64_data)
        except Exception as e:
            print(f"Base64解码失败: {e}")
            return None
    
    def audio_to_base64(self, audio_data: bytes):
        try:
            return base64.b64encode(audio_data).decode('utf-8')
        except Exception as e:
            print(f"Base64编码失败: {e}")
            return ""
    
    def detect_audio_format(self, audio_data: bytes):
        try:
            if audio_data.startswith(b'RIFF') and b'WAVE' in audio_data[:12]:
                return 'wav'
            elif audio_data.startswith(b'ID3') or audio_data.startswith(b'\xff\xfb'):
                return 'mp3'
            else:
                return 'pcm'
        except Exception as e:
            print(f"音频格式检测失败: {e}")
            return None
    
    def extract_audio_info(self, audio_data: bytes, format: str = 'wav'):
        try:
            info = {}
            info['sample_width'] = 2
            info['channels'] = 1
            info['sample_rate'] = self.TARGET_SAMPLE_RATE
            info['frames'] = len(audio_data) // (info['sample_width'] * info['channels'])
            info['duration'] = info['frames'] / info['sample_rate']
            return info
        except Exception as e:
            print(f"提取音频信息失败: {e}")
            return None
    
    def normalize_audio(self, audio_data: bytes):
        try:
            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            max_amplitude = np.max(np.abs(audio_array))
            
            if max_amplitude == 0:
                return audio_data
            
            target_amplitude = 32767 * 0.8
            scale_factor = target_amplitude / max_amplitude
            
            if scale_factor > 1.0:
                normalized = (audio_array * scale_factor).astype(np.int16)
                return normalized.tobytes()
            else:
                return audio_data
        except Exception as e:
            print(f"音频标准化失败: {e}")
            return audio_data

audio_processor = AudioProcessor()
