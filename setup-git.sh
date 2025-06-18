#!/bin/bash

echo "🚀 准备将项目上传到GitHub..."

# 检查是否存在config.json
if [ -f "config.json" ]; then
    echo "⚠️  检测到config.json文件，该文件包含您的API密钥，不会被上传到GitHub"
    echo "✅ 文件已被.gitignore保护"
else
    echo "ℹ️  未检测到config.json文件，这是正常的"
fi

# 初始化Git仓库
if [ ! -d ".git" ]; then
    echo "📦 初始化Git仓库..."
    git init
else
    echo "✅ Git仓库已存在"
fi

# 添加文件到Git
echo "📁 添加文件到Git..."
git add .

# 显示将要提交的文件
echo "📋 以下文件将被提交："
git status --porcelain

# 检查是否意外包含了config.json
if git status --porcelain | grep -q "config.json"; then
    echo "❌ 错误：config.json文件将被提交！请检查.gitignore文件"
    exit 1
fi

# 提交
echo "💾 提交更改..."
git commit -m "Initial commit: 英语对话助手 - 双Agent架构"

echo "🎉 项目准备完成！"
echo ""
echo "📝 下一步操作："
echo "1. 在GitHub上创建新的仓库"
echo "2. 运行以下命令连接到您的GitHub仓库："
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "🔒 安全提醒："
echo "- config.json 文件已被保护，不会上传到GitHub"
echo "- 其他用户需要复制 config.template.json 为 config.json 并配置自己的API密钥" 