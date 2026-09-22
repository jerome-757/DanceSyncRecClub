#!/bin/bash

# git pull origin main

while true; do
    echo ""
    echo "=============================="
    echo "📋 git status当前改动："
    echo "=============================="
    git status

    echo ""
    echo "=============================="
    echo "⚠️  有不想上传的文件吗？"
    echo "   - 直接按【回车】继续"
    echo "   - 输入【c】回车，先修改 .gitignore，改好后重新检查"
    echo "=============================="
    read -p "请选择: " choice

    if [ "$choice" = "c" ]; then
        echo ""
        echo "📝 请修改 .gitignore，改好后按【回车】重新检查..."
        read -p ""
        continue
    else
        break
    fi
done

# git add .
echo ""
echo "=============================="
echo "📦 git add .添加所有修改的文件..."
echo "=============================="
git add .

# git status
echo ""
echo "=============================="
echo "📋 git status即将提交的文件："
echo "=============================="
git status

# commit 信息
echo ""
echo "=============================="
read -p "📝 请输入 commit 信息: " msg
if [ -z "$msg" ]; then
    echo "❌ commit 信息不能为空，已取消"
    exit 1
fi

# git commit
echo ""
echo "=============================="
echo "💾 git commit -m "$msg"提交中..."
echo "=============================="
git commit -m "$msg"

# git push
echo ""
echo "=============================="
echo "🚀 git push推送到 GitHub..."
echo "=============================="
git push

echo ""
echo "✅ 完成！"