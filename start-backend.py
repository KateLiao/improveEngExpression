#!/usr/bin/env python3
"""
英语对话助手后端启动脚本
用于启动Flask LLM代理服务
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("❌ 错误：需要Python 3.8或更高版本")
        print(f"当前Python版本: {sys.version}")
        sys.exit(1)
    print(f"✅ Python版本检查通过: {sys.version}")

def check_pip():
    """检查pip是否可用"""
    try:
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                      check=True, capture_output=True)
        print("✅ pip检查通过")
    except subprocess.CalledProcessError:
        print("❌ 错误：pip不可用")
        sys.exit(1)

def install_dependencies():
    """安装依赖包"""
    requirements_file = Path("requirements.txt")
    if not requirements_file.exists():
        print("❌ 错误：requirements.txt文件不存在")
        sys.exit(1)
    
    print("📦 安装Python依赖包...")
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], check=True)
        print("✅ 依赖包安装完成")
    except subprocess.CalledProcessError as e:
        print(f"❌ 依赖包安装失败: {e}")
        sys.exit(1)

def check_env_file():
    """检查环境变量文件"""
    env_file = Path(".env")
    env_template = Path("env.template")
    
    if not env_file.exists():
        if env_template.exists():
            print("⚠️  .env文件不存在，请复制env.template为.env并配置您的API密钥")
            print("命令：copy env.template .env  (Windows) 或 cp env.template .env  (Linux/Mac)")
        else:
            print("❌ 错误：环境变量配置文件不存在")
        return False
    
    # 检查.env文件内容
    with open(env_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    has_tongyi = 'TONGYI_API_KEY=' in content and 'your_tongyi_api_key' not in content.lower()
    has_deepseek = 'DEEPSEEK_API_KEY=' in content and 'your_deepseek_api_key' not in content.lower()
    
    if not has_tongyi and not has_deepseek:
        print("⚠️  .env文件中未配置任何API密钥，请编辑.env文件添加您的API密钥")
        return False
    
    print("✅ 环境变量配置检查通过")
    return True

def start_server():
    """启动Flask服务器"""
    server_file = Path("server.py")
    if not server_file.exists():
        print("❌ 错误：server.py文件不存在")
        sys.exit(1)
    
    print("\n🚀 启动Flask后端服务...")
    print("🌐 服务地址: http://localhost:4399")
    print("🔍 健康检查: http://localhost:4399/api/health")
    print("📡 API接口: http://localhost:4399/api/llm")
    print("\n按 Ctrl+C 停止服务\n")
    
    try:
        # 使用python -m flask run启动服务
        env = os.environ.copy()
        env['FLASK_APP'] = 'server.py'
        env['FLASK_ENV'] = 'development'
        
        subprocess.run([sys.executable, "server.py"], env=env)
    except KeyboardInterrupt:
        print("\n\n🛑 服务已停止")
    except Exception as e:
        print(f"❌ 服务启动失败: {e}")
        sys.exit(1)

def main():
    """主函数"""
    print("🎯 英语对话助手 - 后端服务启动器\n")
    
    # 检查运行环境
    check_python_version()
    check_pip()
    
    # 安装依赖
    install_dependencies()
    
    # 检查配置文件
    env_configured = check_env_file()
    
    if not env_configured:
        print("\n❌ 请先配置API密钥后再启动服务")
        print("配置步骤：")
        print("1. 复制 env.template 为 .env")
        print("2. 编辑 .env 文件，填入您的API密钥")
        print("3. 重新运行此脚本")
        sys.exit(1)
    
    # 启动服务器
    start_server()

if __name__ == "__main__":
    main() 