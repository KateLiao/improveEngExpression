#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebSocket代理服务
为前端提供WebSocket接口，代理与腾讯云ASR的连接
"""

import json
import uuid
import asyncio
import websockets
from typing import Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, disconnect
import threading
import queue
import time

try:
    from speech_service import TencentASRService, asr_session_manager
    from audio_processor import audio_processor
    SPEECH_MODULES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ 语音模块导入失败: {e}")
    SPEECH_MODULES_AVAILABLE = False

class WebSocketHandler:
    """WebSocket处理器"""
    
    def __init__(self, app: Flask, socketio: SocketIO):
        self.app = app
        self.socketio = socketio
        self.client_sessions = {}  # client_id -> voice_id
        self.audio_queues = {}     # voice_id -> queue
        self.setup_routes()
        self.setup_socketio_events()
    
    def setup_routes(self):
        """设置Flask HTTP路由"""
        
        @self.app.route('/api/speech/connect', methods=['POST'])
        def create_speech_connection():
            """建立语音识别连接"""
            try:
                if not SPEECH_MODULES_AVAILABLE:
                    return jsonify({
                        'success': False,
                        'error': '语音模块不可用'
                    }), 503
                
                data = request.get_json() or {}
                client_id = data.get('client_id') or str(uuid.uuid4())
                voice_id = str(uuid.uuid4())
                
                # 创建ASR会话
                asr_session = asr_session_manager.create_session(voice_id)
                
                # 记录客户端会话
                self.client_sessions[client_id] = voice_id
                
                # 设置回调函数
                self._setup_asr_callbacks(asr_session, client_id)
                
                return jsonify({
                    'success': True,
                    'client_id': client_id,
                    'voice_id': voice_id,
                    'message': '语音连接已创建'
                })
                
            except Exception as e:
                self.app.logger.error(f"创建语音连接失败: {e}")
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/speech/disconnect', methods=['POST'])
        def close_speech_connection():
            """断开语音识别连接"""
            try:
                data = request.get_json() or {}
                client_id = data.get('client_id')
                
                if not client_id or client_id not in self.client_sessions:
                    return jsonify({
                        'success': False,
                        'error': '无效的客户端ID'
                    }), 400
                
                voice_id = self.client_sessions[client_id]
                
                # 断开ASR会话
                if SPEECH_MODULES_AVAILABLE:
                    asr_session = asr_session_manager.get_session(voice_id)
                    if asr_session:
                        # 异步断开连接
                        threading.Thread(
                            target=self._async_disconnect,
                            args=(asr_session,)
                        ).start()
                
                # 清理客户端会话
                del self.client_sessions[client_id]
                if voice_id in self.audio_queues:
                    del self.audio_queues[voice_id]
                
                return jsonify({
                    'success': True,
                    'message': '语音连接已断开'
                })
                
            except Exception as e:
                self.app.logger.error(f"断开语音连接失败: {e}")
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/speech/status', methods=['GET'])
        def get_speech_status():
            """获取语音识别状态"""
            try:
                client_id = request.args.get('client_id')
                
                if not client_id:
                    return jsonify({
                        'success': False,
                        'error': '缺少客户端ID'
                    }), 400
                
                if client_id not in self.client_sessions:
                    return jsonify({
                        'success': True,
                        'connected': False,
                        'message': '未连接'
                    })
                
                voice_id = self.client_sessions[client_id]
                
                if SPEECH_MODULES_AVAILABLE:
                    asr_session = asr_session_manager.get_session(voice_id)
                    
                    if asr_session:
                        return jsonify({
                            'success': True,
                            'connected': asr_session.is_connected,
                            'voice_id': voice_id,
                            'message': '已连接' if asr_session.is_connected else '连接断开'
                        })
                
                return jsonify({
                    'success': True,
                    'connected': False,
                    'message': '会话不存在'
                })
                
            except Exception as e:
                self.app.logger.error(f"获取语音状态失败: {e}")
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
    
    def setup_socketio_events(self):
        """设置SocketIO事件处理"""
        
        @self.socketio.on('speech_connect')
        def handle_speech_connect(data):
            """处理语音连接请求"""
            try:
                if not SPEECH_MODULES_AVAILABLE:
                    emit('speech_error', {
                        'error': '语音模块不可用',
                        'message': '语音功能未启用'
                    })
                    return
                
                client_id = data.get('client_id') or str(uuid.uuid4())
                
                if client_id in self.client_sessions:
                    # 已存在连接，返回现有信息
                    voice_id = self.client_sessions[client_id]
                    emit('speech_connected', {
                        'success': True,
                        'client_id': client_id,
                        'voice_id': voice_id,
                        'message': '使用现有连接'
                    })
                    return
                
                # 创建新连接
                voice_id = str(uuid.uuid4())
                asr_session = asr_session_manager.create_session(voice_id)
                
                # 记录客户端会话
                self.client_sessions[client_id] = voice_id
                
                # 设置回调函数
                self._setup_asr_callbacks(asr_session, client_id)
                
                # 异步建立ASR连接
                threading.Thread(
                    target=self._async_connect,
                    args=(asr_session, client_id, voice_id)
                ).start()
                
            except Exception as e:
                self.app.logger.error(f"SocketIO语音连接失败: {e}")
                emit('speech_error', {
                    'error': str(e),
                    'message': '语音连接失败'
                })
        
        @self.socketio.on('speech_audio_data')
        def handle_audio_data(data):
            """处理音频数据"""
            try:
                client_id = data.get('client_id')
                audio_data = data.get('audio_data')  # Base64编码的音频数据
                
                if not client_id or client_id not in self.client_sessions:
                    emit('speech_error', {
                        'error': '无效的客户端ID',
                        'message': '请先建立语音连接'
                    })
                    return
                
                if not audio_data:
                    emit('speech_error', {
                        'error': '音频数据为空',
                        'message': '请提供有效的音频数据'
                    })
                    return
                
                voice_id = self.client_sessions[client_id]
                
                # 将音频数据添加到队列
                if voice_id not in self.audio_queues:
                    self.audio_queues[voice_id] = queue.Queue()
                
                # 解码Base64音频数据
                if SPEECH_MODULES_AVAILABLE:
                    try:
                        audio_bytes = audio_processor.base64_to_audio(audio_data)
                        if audio_bytes:
                            self.audio_queues[voice_id].put(audio_bytes)
                        else:
                            emit('speech_error', {
                                'error': '音频数据解码失败',
                                'message': '音频格式错误'
                            })
                    except Exception as e:
                        emit('speech_error', {
                            'error': f'音频数据处理失败: {e}',
                            'message': '音频处理错误'
                        })
                
            except Exception as e:
                self.app.logger.error(f"处理音频数据失败: {e}")
                emit('speech_error', {
                    'error': str(e),
                    'message': '音频数据处理失败'
                })
        
        @self.socketio.on('speech_end_stream')
        def handle_end_stream(data):
            """处理音频流结束"""
            try:
                client_id = data.get('client_id')
                
                if not client_id or client_id not in self.client_sessions:
                    emit('speech_error', {
                        'error': '无效的客户端ID'
                    })
                    return
                
                voice_id = self.client_sessions[client_id]
                
                if SPEECH_MODULES_AVAILABLE:
                    asr_session = asr_session_manager.get_session(voice_id)
                    
                    if asr_session:
                        # 异步结束音频流
                        threading.Thread(
                            target=self._async_end_stream,
                            args=(asr_session, client_id)
                        ).start()
                
            except Exception as e:
                self.app.logger.error(f"结束音频流失败: {e}")
                emit('speech_error', {
                    'error': str(e),
                    'message': '结束音频流失败'
                })
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            """处理客户端断开连接"""
            # 这里需要实际的客户端ID，在实际应用中可以从session中获取
            self.app.logger.info("客户端断开连接")
    
    def _setup_asr_callbacks(self, asr_session: 'TencentASRService', client_id: str):
        """设置ASR回调函数"""
        
        def on_recognition_result(result_data):
            """识别结果回调"""
            self.socketio.emit('speech_result', {
                'client_id': client_id,
                'result': result_data
            })
        
        def on_error(error_code, message):
            """错误回调"""
            self.socketio.emit('speech_error', {
                'client_id': client_id,
                'error_code': error_code,
                'error': message
            })
        
        def on_connected(voice_id):
            """连接成功回调"""
            self.socketio.emit('speech_connected', {
                'client_id': client_id,
                'voice_id': voice_id,
                'success': True,
                'message': '语音识别连接成功'
            })
            
            # 开始处理音频队列
            threading.Thread(
                target=self._process_audio_queue,
                args=(asr_session, voice_id)
            ).start()
        
        def on_disconnected():
            """断开连接回调"""
            self.socketio.emit('speech_disconnected', {
                'client_id': client_id,
                'message': '语音识别连接已断开'
            })
        
        # 设置回调
        if hasattr(asr_session, 'set_recognition_callback'):
            asr_session.set_recognition_callback(on_recognition_result)
            asr_session.set_error_callback(on_error)
            asr_session.set_connected_callback(on_connected)
            asr_session.set_disconnected_callback(on_disconnected)
    
    def _async_connect(self, asr_session, client_id: str, voice_id: str):
        """异步建立ASR连接"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            success = loop.run_until_complete(asr_session.connect(voice_id))
            
            if success:
                # 开始监听识别结果
                loop.run_until_complete(asr_session.listen_for_results())
            
            loop.close()
            
        except Exception as e:
            self.app.logger.error(f"ASR连接异常: {e}")
            self.socketio.emit('speech_error', {
                'client_id': client_id,
                'error': str(e),
                'message': 'ASR连接异常'
            })
    
    def _async_disconnect(self, asr_session):
        """异步断开ASR连接"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            loop.run_until_complete(asr_session.disconnect())
            loop.close()
            
        except Exception as e:
            self.app.logger.error(f"ASR断开连接异常: {e}")
    
    def _async_end_stream(self, asr_session, client_id: str):
        """异步结束音频流"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            success = loop.run_until_complete(asr_session.end_audio_stream())
            
            if success:
                self.socketio.emit('speech_stream_ended', {
                    'client_id': client_id,
                    'message': '音频流已结束'
                })
            
            loop.close()
            
        except Exception as e:
            self.app.logger.error(f"结束音频流异常: {e}")
            self.socketio.emit('speech_error', {
                'client_id': client_id,
                'error': str(e),
                'message': '结束音频流异常'
            })
    
    def _process_audio_queue(self, asr_session, voice_id: str):
        """处理音频数据队列"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            if voice_id not in self.audio_queues:
                return
            
            audio_queue = self.audio_queues[voice_id]
            
            while hasattr(asr_session, 'is_connected') and asr_session.is_connected:
                try:
                    # 从队列获取音频数据
                    audio_data = audio_queue.get(timeout=1.0)
                    
                    # 发送音频数据到ASR
                    success = loop.run_until_complete(
                        asr_session.send_audio_data(audio_data)
                    )
                    
                    if not success:
                        break
                        
                    audio_queue.task_done()
                    
                except queue.Empty:
                    # 队列为空，继续等待
                    continue
                except Exception as e:
                    self.app.logger.error(f"处理音频队列异常: {e}")
                    break
            
            loop.close()
            
        except Exception as e:
            self.app.logger.error(f"音频队列处理异常: {e}")


def setup_websocket_handler(app: Flask) -> SocketIO:
    """设置WebSocket处理器"""
    
    # 创建SocketIO实例
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode='threading',
        logger=True,
        engineio_logger=True
    )
    
    # 创建WebSocket处理器
    handler = WebSocketHandler(app, socketio)
    
    return socketio 