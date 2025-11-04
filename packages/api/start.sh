#!/bin/bash

# Kill any process on port 3222
echo "Cleaning up port 3222..."
lsof -ti:3222 | xargs kill -9 2>/dev/null || true
sleep 1

# Start the server
echo "Starting Ephemera API..."
npm run dev:node
