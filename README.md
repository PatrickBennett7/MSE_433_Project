# Catan Settlement Placement Advisor

**An intelligent recommendation system with dual-model analysis combining optimization and machine learning approaches.**

## Features

### Core Models
- **Optimization Model**: Heuristic-based analysis using empirical resource values and dice probabilities
- **Historical Model**: ML-based pattern recognition trained on 44,000+ previous games with K-means clustering

### Key Capabilities
- **Interactive Board Builder**: Configure Catan boards with resource tiles and dice numbers
- **Dual Recommendation Engine**: Choose between theory-driven or data-driven recommendations
- **Real-time Analysis**: <10ms optimization, <50ms historical (post-initialization)
- **Settlement Placement Simulator**: Multi-player placement turns with model-guided recommendations

## Quick Start

### Prerequisites
- Node.js **v20.19+** or **v22.12+**
- Python 3.11+
- pnpm 10.23.0

### Installation

```bash
# Setup Node environment
nvm install
nvm use

# Install all dependencies
pnpm install
pip install -r apps/backend/requirements.txt

# Start development servers
pnpm dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:3000`

## How to Use

1. **Build Board** - Add Catan hex tiles with resource types and dice numbers
2. **Select Model** - Choose "Optimization" (fast, theory-based) or "Historical" (data-driven, slower first run)
3. **Analyze** - Generate settlement recommendations
4. **Place Settlements** - Follow recommended positions for optimal starting placement

## Optimization Model

### Scoring Formula
$$\text{Score} = 0.7 \times \sum r_i p_i + 0.3 \times \frac{d_j}{30}$$

- **70%**: Resource value × probability (Wheat: 1.350, Ore: 1.329, Sheep: 0.760, Wood: 0.781, Brick: 0.781)
- **30%**: Resource diversity normalized (unique resources / 30)

### Performance
- Speed: <10ms per board
- Scalability: Handles any board size
- Deterministic: Same recommendations each time

## Historical Model

### Scoring Formula
$$\text{Score} = 0.35R + 0.25P + 0.2D + 0.05H + 0.15C$$

- **35%**: Resource value
- **25%**: Dice probability (rolling frequency)
- **20%**: Resource diversity bonus
- **5%**: Historical pattern (direct vertex win frequency)
- **15%**: Cluster matching bonus (ML-identified winning patterns)

### Key Components
- **K-means Clustering**: Groups 44,000+ winning settlements into 3-5 archetypal patterns
- **Win Frequency**: Tracks how often each vertex position led to wins
- **Pattern Recognition**: Matches new board positions to historically successful clusters
- **Adaptive Weighting**: Cluster bonus elevates ML insights to 15% (equal with diversity)

### Performance
- First run: ~30 seconds (initialization + clustering)
- Subsequent runs: <50ms per analysis
- Memory: ~500MB (cached model)

## Architecture

```
MSE_433_Project/
├── apps/
│   ├── frontend/          # React 19 + Vite + TypeScript
│   └── backend/           # Python FastAPI + ML engine
├── packages/shared/       # Shared TypeScript utilities
└── docs/                  # Documentation
```

### Backend Stack
- **FastAPI** - REST API framework
- **Pandas** - Data processing (CSV parsing)
- **NumPy** - Numerical computing
- **Scikit-learn** - K-means clustering & preprocessing

### Frontend Stack
- **React 19** - UI framework
- **Vite 7** - Build tool & dev server
- **TypeScript** - Type safety
- **CSS 3** - Responsive styling

## API

### Analyze Board
```bash
POST /api/analyze-board?model=optimization|historical
Content-Type: text/csv

x,y,resource_type,dice_number
-2,2,Wood,6
-1,2,Sheep,8
0,2,Wheat,9
```

### Health Check
```bash
GET /health
```

## Development

### Run all services
```bash
pnpm dev
```

### Build production
```bash
pnpm build
```

### Backend only
```bash
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 3000 --app-dir apps/backend
```

## Environment Variables

**Frontend** (`apps/frontend/.env`):
```
VITE_API_URL=http://localhost:3000
```

**Backend** (environment):
```
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
```

## Troubleshooting

### Node version mismatch
```bash
nvm install 20.19.2 && nvm use 20.19.2
```

### Port 3000 already in use
```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN | awk 'NR==2 {print $2}' | xargs kill -9
```

### Historical model unavailable
- Verify data files exist: `apps/backend/data/game_results.csv` and `board_tiles.csv`
- Install scikit-learn: `pip install scikit-learn>=1.3.0`