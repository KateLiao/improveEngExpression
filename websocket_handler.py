import os
import json
import uuid
import time
from flask import request, jsonify
from flask_socketio import emit
from speech_service import sts_session_manager

class STSAPIHandler:
    """STS临时密钥API处理器"""
    
    def __init__(self):
        self.session_manager = sts_session_manager
    
    def register_routes(self, app):
        """注册STS相关的HTTP路由"""
        
        @app.route('/api/speech/sts-credentials', methods=['GET'])
        def get_sts_credentials():
            """获取STS临时密钥"""
            try:
                # 创建新的STS会话
                result = self.session_manager.create_session()
                
                if result["success"]:
                    return jsonify({
                        "success": True,
                        "session_id": result["session_id"],
                        "credentials": result["credentials"],
                        "message": "临时密钥获取成功"
                    })
                else:
                    return jsonify({
                        "success": False,
                        "error": result.get("error", "未知错误"),
                        "message": "临时密钥获取失败"
                    }), 500
                    
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "message": "服务器内部错误"
                }), 500
        
        @app.route('/api/speech/sts-refresh', methods=['POST'])
        def refresh_sts_credentials():
            """刷新STS临时密钥"""
            try:
                data = request.get_json()
                session_id = data.get('session_id')
                
                if not session_id:
                    return jsonify({
                        "success": False,
                        "error": "缺少session_id参数"
                    }), 400
                
                result = self.session_manager.refresh_session(session_id)
                
                if result["success"]:
                    return jsonify({
                        "success": True,
                        "credentials": result["credentials"],
                        "message": "临时密钥刷新成功"
                    })
                else:
                    return jsonify({
                        "success": False,
                        "error": result.get("error", "刷新失败"),
                        "message": "临时密钥刷新失败"
                    }), 400
                    
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "message": "服务器内部错误"
                }), 500
        
        @app.route('/api/speech/sts-status', methods=['GET'])
        def get_sts_status():
            """获取STS会话状态"""
            try:
                session_id = request.args.get('session_id')
                
                if not session_id:
                    return jsonify({
                        "success": False,
                        "error": "缺少session_id参数"
                    }), 400
                
                result = self.session_manager.get_session(session_id)
                
                if result["success"]:
                    session = result["session"]
                    return jsonify({
                        "success": True,
                        "session_id": session_id,
                        "created_at": session["created_at"],
                        "expires_at": session["expires_at"],
                        "is_valid": time.time() < session["expires_at"],
                        "message": "会话状态获取成功"
                    })
                else:
                    return jsonify({
                        "success": False,
                        "error": result.get("error", "会话不存在"),
                        "message": "会话状态获取失败"
                    }), 404
                    
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "message": "服务器内部错误"
                }), 500
        
        @app.route('/api/speech/sts-cleanup', methods=['POST'])
        def cleanup_expired_sessions():
            """清理过期的STS会话"""
            try:
                cleaned_count = self.session_manager.cleanup_expired_sessions()
                return jsonify({
                    "success": True,
                    "cleaned_sessions": cleaned_count,
                    "message": f"已清理 {cleaned_count} 个过期会话"
                })
                
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "message": "清理操作失败"
                }), 500
        


class STSSocketIOHandler:
    """STS相关的SocketIO事件处理器"""
    
    def __init__(self, socketio):
        self.socketio = socketio
        self.session_manager = sts_session_manager
        self.register_events()
    
    def register_events(self):
        """注册SocketIO事件"""
        
        @self.socketio.on('sts_get_credentials')
        def handle_get_credentials(data):
            """通过SocketIO获取临时密钥"""
            try:
                result = self.session_manager.create_session()
                
                if result["success"]:
                    emit('sts_credentials_ready', {
                        "success": True,
                        "session_id": result["session_id"],
                        "credentials": result["credentials"]
                    })
                else:
                    emit('sts_error', {
                        "success": False,
                        "error": result.get("error", "临时密钥获取失败")
                    })
                    
            except Exception as e:
                emit('sts_error', {
                    "success": False,
                    "error": str(e)
                })
        
        @self.socketio.on('sts_refresh_credentials')
        def handle_refresh_credentials(data):
            """通过SocketIO刷新临时密钥"""
            try:
                session_id = data.get('session_id')
                
                if not session_id:
                    emit('sts_error', {
                        "success": False,
                        "error": "缺少session_id参数"
                    })
                    return
                
                result = self.session_manager.refresh_session(session_id)
                
                if result["success"]:
                    emit('sts_credentials_refreshed', {
                        "success": True,
                        "credentials": result["credentials"]
                    })
                else:
                    emit('sts_error', {
                        "success": False,
                        "error": result.get("error", "刷新失败")
                    })
                    
            except Exception as e:
                emit('sts_error', {
                    "success": False,
                    "error": str(e)
                })

# 全局处理器实例
sts_api_handler = STSAPIHandler()

def create_sts_socketio_handler(socketio):
    """创建STS SocketIO处理器"""
    return STSSocketIOHandler(socketio) 