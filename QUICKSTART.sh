#!/bin/bash
# Quick Start Guide - Historical Results Model Implementation

# This file shows all the commands needed to set up and run the system

# ============================================================================
# SETUP (Run Once)
# ============================================================================

# 1. Install Node.js version (if using nvm)
nvm install 20.19.2
nvm use 20.19.2

# 2. Install Node dependencies
cd /Users/patrickbennett1/Desktop/MSE\ 433/MSE_433_Project
pnpm install

# 3. Install Python dependencies
pip install -r apps/backend/requirements.txt

# Verify installation
python -u test_demo.py

# ============================================================================
# DEVELOPMENT (Daily Use)
# ============================================================================

# Start the development server (both frontend and backend)
pnpm dev

# In your browser, open:
# http://localhost:5173 (Frontend)
# http://localhost:3000 (Backend API)

# ============================================================================
# MANUAL TESTING
# ============================================================================

# Terminal 1: Start backend only
cd /Users/patrickbennett1/Desktop/MSE\ 433/MSE_433_Project/apps/backend
uvicorn src.main:app --reload --port 3000

# Terminal 2: Start frontend only  
cd /Users/patrickbennett1/Desktop/MSE\ 433/MSE_433_Project/apps/frontend
npm run dev

# Terminal 3: Test API
curl -X POST http://localhost:3000/api/analyze-board?model=historical \
  -H "Content-Type: text/csv" \
  -d "x,y,resource_type,dice_number
-2,2,Wood,6
-1,2,Sheep,8"

# ============================================================================
# TROUBLESHOOTING
# ============================================================================

# Check if port 3000 is in use
lsof -nP -iTCP:3000 -sTCP:LISTEN

# Kill process on port 3000
kill -9 $(lsof -t -i:3000)

# Verify Node version
node -v
# Should be v20.19.2 or v22.12+

# Verify Python version
python --version
# Should be Python 3.11+

# Check if dependencies are installed
pip list | grep -E "pandas|numpy|scikit-learn"

# ============================================================================
# DEPLOYMENT
# ============================================================================

# Build frontend for production
cd /Users/patrickbennett1/Desktop/MSE\ 433/MSE_433_Project/apps/frontend
npm run build
npm run preview

# Run backend in production
cd /Users/patrickbennett1/Desktop/MSE\ 433/MSE_433_Project/apps/backend
uvicorn src.main:app --host 0.0.0.0 --port 3000 --workers 4

# ============================================================================
# DOCUMENTATION
# ============================================================================

# Read these files for more information:
# - README.md                  - Project overview
# - HISTORICAL_MODEL.md        - ML model documentation
# - IMPLEMENTATION_GUIDE.md    - Technical details
# - DELIVERY_SUMMARY.md        - Project completion summary
# - CHANGELOG.md               - All changes made

# ============================================================================
# FEATURES TO TEST
# ============================================================================

# 1. Build a Catan board:
#    - Click tiles to add resources (Wood, Sheep, Wheat, Ore, Brick, Desert)
#    - Add dice numbers (2-12, with constraints)
#    - Save configuration

# 2. Select recommendation model:
#    - Try "Optimization (Value-Based)"
#    - Try "Historical (ML-Based)" (first request: wait ~30 seconds)

# 3. Analyze board:
#    - Click "Analyze Board"
#    - Compare recommendations from both models
#    - Note confidence scores for historical model

# 4. Place settlements:
#    - Follow top 5 recommendations
#    - See different metric explanations per model

# ============================================================================
# API ENDPOINTS
# ============================================================================

# Health Check
curl http://localhost:3000/health

# Optimization Model
curl -X POST http://localhost:3000/api/analyze-board?model=optimization \
  -H "Content-Type: text/csv" \
  -d @board.csv

# Historical Model  
curl -X POST http://localhost:3000/api/analyze-board?model=historical \
  -H "Content-Type: text/csv" \
  -d @board.csv

# ============================================================================
# FILES STRUCTURE
# ============================================================================

# MSE_433_Project/
# ├── apps/
# │   ├── backend/
# │   │   ├── src/
# │   │   │   ├── main.py                    (✏️ Updated)
# │   │   │   ├── catan_analyzer.py          (Unchanged)
# │   │   │   └── historical_analyzer.py     (✨ New)
# │   │   ├── requirements.txt               (✏️ Updated)
# │   │   └── data/
# │   │       ├── game_results.csv           (Dataset)
# │   │       └── board_tiles.csv            (Dataset)
# │   └── frontend/
# │       ├── src/
# │       │   └── pages/
# │       │       ├── BuildBoard.jsx         (✏️ Updated)
# │       │       └── BuildBoard.css         (✏️ Updated)
# │       └── package.json
# │
# ├── HISTORICAL_MODEL.md                    (✨ New)
# ├── IMPLEMENTATION_GUIDE.md                (✨ New)
# ├── DELIVERY_SUMMARY.md                    (✨ New)
# ├── CHANGELOG.md                           (✨ New)
# ├── README.md                              (✏️ Updated)
# ├── test_demo.py                           (✨ New)
# └── test_historical.py                     (✨ New)

# ============================================================================
# SUCCESS INDICATORS
# ============================================================================

# ✅ Backend starts without errors:
#    "INFO:     Application startup complete"

# ✅ Frontend loads:
#    "VITE v7.3.1 ready in 500 ms"

# ✅ Health check succeeds:
#    curl http://localhost:3000/health
#    {"status":"ok"}

# ✅ Board analysis works:
#    Response has "candidates" array with recommendations

# ✅ Model switching works:
#    - Change model via radio buttons
#    - Click Analyze Board
#    - See different recommendation formats

# ============================================================================

echo "Setup complete! Run 'pnpm dev' to start"
