#!/bin/bash

echo "🚀 AUTO-PUSH TO GITHUB"
echo "====================="
echo ""
echo "This script will push your ACE CRM to GitHub."
echo ""
echo "📝 Please enter your GitHub Personal Access Token"
echo "   (Get one at: https://github.com/settings/tokens/new)"
echo "   Select 'repo' scope when creating the token"
echo ""
read -p "Enter your GitHub token (starts with ghp_): " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

echo ""
echo "🔄 Setting up authenticated remote..."
git remote set-url origin https://rhyanalmeida:$TOKEN@github.com/rhyanalmeida/theacewebcrm.git

echo "📤 Pushing to GitHub..."
if git push -u origin main; then
    echo ""
    echo "✅ SUCCESS! Code pushed to GitHub!"
    echo ""
    echo "🔒 Resetting remote URL for security..."
    git remote set-url origin https://github.com/rhyanalmeida/theacewebcrm.git
    echo ""
    echo "🎉 Your repository is live at:"
    echo "   https://github.com/rhyanalmeida/theacewebcrm"
    echo ""
    echo "📦 Next: Deploy to Render"
    echo "   1. Go to: https://dashboard.render.com"
    echo "   2. Click: New+ → Blueprint"
    echo "   3. Select: rhyanalmeida/theacewebcrm"
    echo "   4. Deploy!"
else
    echo ""
    echo "❌ Push failed. Please check your token and try again."
    git remote set-url origin https://github.com/rhyanalmeida/theacewebcrm.git
fi