from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import requests
import json
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# API配置 - 从环境变量中读取API密钥
API_CONFIGS = {
    "tongyi": {
        "name": "通义千问",
        "endpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        "model": "qwen-plus",
        "api_key": os.getenv('TONGYI_API_KEY')
    },
    "deepseek": {
        "name": "DeepSeek",
        "endpoint": "https://api.deepseek.com/v1/chat/completions", 
        "model": "deepseek-chat",
        "api_key": os.getenv('DEEPSEEK_API_KEY')
    }
}

@app.route('/api/llm', methods=['POST'])
def proxy_llm():
    """
    代理LLM API调用的接口
    接收前端请求，转发到对应的LLM服务，并返回流式响应
    """
    try:
        # 获取请求数据
        data = request.get_json()
        
        # 验证必要参数
        if not data:
            return jsonify({"error": "请求数据不能为空"}), 400
        
        api_provider = data.get('provider', 'tongyi')  # 默认使用通义千问
        
        # 验证API提供商
        if api_provider not in API_CONFIGS:
            return jsonify({"error": f"不支持的API提供商: {api_provider}"}), 400
        
        config = API_CONFIGS[api_provider]
        
        # 检查API密钥是否配置
        if not config['api_key']:
            return jsonify({"error": f"{config['name']} API密钥未配置"}), 500
        
        # 构建请求参数
        llm_request = {
            "model": config['model'],
            "messages": data.get('messages', []),
            "stream": data.get('stream', True),
            "temperature": data.get('temperature', 0.7),
            "max_tokens": data.get('max_tokens', 2000)
        }
        
        # 设置请求头
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json"
        }
        
        # 如果是流式请求
        if llm_request.get('stream', True):
            return stream_llm_response(config['endpoint'], llm_request, headers)
        else:
            return non_stream_llm_response(config['endpoint'], llm_request, headers)
            
    except Exception as e:
        app.logger.error(f"API调用错误: {str(e)}")
        return jsonify({"error": "服务器内部错误"}), 500

def stream_llm_response(endpoint, request_data, headers):
    """
    处理流式响应
    """
    def generate():
        try:
            response = requests.post(
                endpoint,
                json=request_data,
                headers=headers,
                stream=True,
                timeout=30
            )
            
            if response.status_code != 200:
                error_msg = f"API调用失败，状态码: {response.status_code}"
                yield f"data: {json.dumps({'error': error_msg})}\n\n"
                return
            
            # 逐行读取流式响应
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        # 直接转发SSE格式的数据
                        yield f"{line_str}\n\n"
                    elif line_str == 'data: [DONE]':
                        yield "data: [DONE]\n\n"
                        break
                        
        except requests.exceptions.RequestException as e:
            app.logger.error(f"请求异常: {str(e)}")
            yield f"data: {json.dumps({'error': '网络请求失败'})}\n\n"
        except Exception as e:
            app.logger.error(f"流式响应处理错误: {str(e)}")
            yield f"data: {json.dumps({'error': '响应处理失败'})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/plain',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        }
    )

def non_stream_llm_response(endpoint, request_data, headers):
    """
    处理非流式响应
    """
    try:
        response = requests.post(
            endpoint,
            json=request_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": f"API调用失败，状态码: {response.status_code}"}), response.status_code
            
    except requests.exceptions.RequestException as e:
        app.logger.error(f"请求异常: {str(e)}")
        return jsonify({"error": "网络请求失败"}), 500
    except Exception as e:
        app.logger.error(f"响应处理错误: {str(e)}")
        return jsonify({"error": "响应处理失败"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    健康检查接口
    """
    return jsonify({
        "status": "healthy",
        "message": "Flask LLM代理服务运行正常",
        "supported_providers": list(API_CONFIGS.keys())
    })

@app.route('/api/providers', methods=['GET'])
def get_providers():
    """
    获取支持的API提供商列表
    """
    providers = {}
    for key, config in API_CONFIGS.items():
        providers[key] = {
            "name": config["name"],
            "model": config["model"],
            "available": bool(config["api_key"])
        }
    return jsonify(providers)

if __name__ == '__main__':
    # 检查环境变量配置
    print("🚀 启动Flask LLM代理服务...")
    print("📋 API配置状态:")
    
    for provider, config in API_CONFIGS.items():
        status = "✅ 已配置" if config['api_key'] else "❌ 未配置"
        print(f"  {config['name']} ({provider}): {status}")
    
    if not any(config['api_key'] for config in API_CONFIGS.values()):
        print("\n⚠️  警告：没有配置任何API密钥！请在.env文件中配置：")
        print("TONGYI_API_KEY=your_tongyi_api_key")
        print("DEEPSEEK_API_KEY=your_deepseek_api_key")
    
    print(f"\n🌐 服务将运行在: http://localhost:5000")
    print("🔍 健康检查: http://localhost:5000/api/health")
    print("📡 API接口: http://localhost:5000/api/llm")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 