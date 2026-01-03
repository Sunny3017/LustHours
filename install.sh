#!/bin/bash

echo "🔧 Setting up Admin System..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your credentials!"
fi

# Create folder structure
echo "📁 Creating folder structure..."
mkdir -p config controllers middleware models routes utils uploads

echo "✅ Setup complete!"
echo "🎉 Run 'npm run dev' to start the server"
echo "🔑 Default admin: sunnychaudhary3792@gmail.com / vns3017"