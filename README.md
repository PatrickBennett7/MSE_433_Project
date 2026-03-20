# MSE_433_Project

**Catan Settlement Placement Advisor** - An intelligent recommendation system with dual-model analysis combining optimization and machine learning approaches.

## Features

### Core Features
- **Interactive Board Builder**: Drag-and-drop Catan board configuration
- **Dual Recommendation Models**:
  - **Optimization Model**: Heuristic-based analysis using resource desirability and dice probability
  - **Historical Model**: ML-based pattern recognition trained on 44,000+ previous games
- **Settlement Placement Simulator**: Interactive multi-player placement turns with model recommendations
- **Real-time Analysis**: Sub-100ms recommendations (after initialization)

### Historical Model (New)
- **Data-Driven**: Analyzes 44,000+ previous game results
- **Pattern Recognition**: K-means clustering identifies winning settlement placement patterns
- **Confidence Scoring**: Rates recommendations by historical win frequency (0-100%)
- **Smart Weighting**: 40% resource value + 20% diversity + 30% dice reliability + 10% historical performance

### Architecture
- `apps/frontend`: React 19 + Vite + TypeScript
- `apps/backend`: Python FastAPI with ML analysis engine
- `packages/shared`: Shared TypeScript utilities

## Quick Start

### Prerequisites
- Node.js **v20.19+** (or **v22.12+**)
- Python 3.11+
- pnpm `10.23.0`

### Setup

```bash
# Install Node version (if using nvm)
nvm install
nvm use

# Install dependencies
pnpm install
pip install -r apps/backend/requirements.txt

# Start development servers
pnpm dev
```

The frontend runs on `http://localhost:5173` and backend on `http://localhost:3000`.

## Usage

1. **Build Board**: Add Catan tiles with resource types and dice numbers
2. **Select Model**: Choose "Optimization" or "Historical" recommendations
3. **Analyze**: Click "Analyze Board" to get settlement recommendations
4. **Place Settlements**: Follow recommended placements for optimal starting positions

## Documentation

- **[HISTORICAL_MODEL.md](HISTORICAL_MODEL.md)** - ML model implementation details
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Complete technical guide

## Technology Stack

### Backend
- **FastAPI** - REST API framework
- **Pandas** - Data processing
- **Scikit-learn** - ML clustering and preprocessing
- **NumPy** - Numerical computing

### Frontend
- **React 19** - UI framework
- **Vite 7** - Build tool
- **TypeScript** - Type safety
- **CSS** - Responsive styling

### Data
- **44,000+ Game Records**: Historical game results with winner information
- **Settlement Placements**: Starting positions for each game
- **Board Configurations**: Tile arrangements and dice numbers

## API Endpoints

### Analysis Endpoint
```bash
POST /api/analyze-board?model=optimization|historical
Content-Type: text/csv

x,y,resource_type,dice_number
-2,2,Wood,6
-1,2,Sheep,8
```

### Health Check
```bash
GET /health
```

## Performance

- **Optimization Model**: <10ms per analysis
- **Historical Model**: 
  - First request: ~30 seconds (initialization)
  - Subsequent: <50ms per analysis
  - Memory: ~500MB (cached)

## Troubleshooting

### Node Version Issues
```bash
nvm install 20.19.2
nvm use 20.19.2
```

### Port Already in Use (port 3000)
```bash
# Find and stop the process
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill -9 <PID>
```

### Historical Model Not Available
- Ensure `game_results.csv` and `board_tiles.csv` exist in `apps/backend/data/`
- Check that scikit-learn is installed: `pip install scikit-learn`

## License

MSE 433 - Educational Project


## Run all apps in dev mode

```bash
pnpm dev
```

- Frontend: `http://localhost:5173`
- Backend health endpoint: `http://localhost:3000/health`

## Build

```bash
pnpm build
```

## Environment variables

- Frontend (`apps/frontend/.env`):
	- `VITE_API_URL=http://localhost:3000`
- Backend:
	- `PORT=3000`
	- `FRONTEND_ORIGIN=http://localhost:5173`

## Backend only (optional)

```bash
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 3000 --app-dir apps/backend
```
