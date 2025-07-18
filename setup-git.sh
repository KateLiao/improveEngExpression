#!/bin/bash

echo "🚀 准备将项目上传到GitHub..."

# 检查是否存在.env文件
if [ -f ".env" ]; then
    echo "⚠️  检测到.env文件，该文件包含您的API密钥，不会被上传到GitHub"
    echo "✅ 文件已被.gitignore保护"
else
    echo "ℹ️  未检测到.env文件，这是正常的"
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

# 检查是否意外包含了.env文件
if git status --porcelain | grep -q ".env"; then
    echo "❌ 错误：.env文件将被提交！请检查.gitignore文件"
    exit 1
fi

# 提交
echo "💾 提交更改..."
git commit -m "Initial commit: 英语对话练习助手 - 双Agent语音交互版"

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
echo "- .env 文件已被保护，不会上传到GitHub"
echo "- 其他用户需要复制 env.template 为 .env 并配置自己的API密钥" 