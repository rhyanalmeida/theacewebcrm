#!/bin/bash

# ACE CRM Quick Start Script
echo "🚀 Starting ACE CRM System..."
echo "================================"

# Kill any existing processes
echo "📍 Cleaning up old processes..."
lsof -ti:3001 | xargs -r kill -9 2>/dev/null
lsof -ti:3000 | xargs -r kill -9 2>/dev/null

# Start Backend
echo "🔧 Starting Backend API on port 3001..."
cd "/mnt/c/Users/rhyan/Downloads/THE ACE CRM"
PORT=3001 node src/simple-server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "   ✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 3

# Test backend
echo "🧪 Testing Backend..."
if curl -s http://localhost:3001/health | grep -q "healthy"; then
    echo "   ✅ Backend is healthy!"
else
    echo "   ❌ Backend failed to start. Check backend.log"
    exit 1
fi

# Start Frontend
echo "🎨 Starting Frontend on port 3000..."
cd "/mnt/c/Users/rhyan/Downloads/THE ACE CRM/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "   📦 Installing frontend dependencies..."
    npm install
fi

npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   ✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "================================"
echo "✨ ACE CRM IS STARTING!"
echo "================================"
echo ""
echo "🌐 Access your CRM at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo ""
echo "📝 First time setup:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Click 'Sign Up' to create your account"
echo "   3. Login with your new credentials"
echo ""
echo "🛑 To stop the servers:"
echo "   Press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📋 Logs available at:"
echo "   Backend: backend.log"
echo "   Frontend: frontend.log"
echo ""

# Keep script running
echo "Press Ctrl+C to stop all servers..."
wait