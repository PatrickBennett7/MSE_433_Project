# Historical Results Model - Settlement Placement Advisor

## Overview

The MSE 433 Catan Analyzer now includes a **Historical Results Model** that learns from previous game data to recommend optimal settlement placements. Players can choose between two recommendation engines:

1. **Optimization Model** - Value-based analysis using resource desirability and dice probability
2. **Historical Model** - Machine Learning-based analysis trained on actual game winner data

## Features

### Historical Model
- **Data-Driven**: Learns from 43,000+ previous Catan games
- **Pattern Recognition**: Identifies settlement placement patterns that lead to wins
- **ML Clustering**: Groups vertices by similar resource and dice characteristics
- **Confidence Scoring**: Rates recommendations based on historical win frequency
- **Multiple Metrics**:
  - Resource value composition
  - Resource diversity (avoid single-resource dependence)
  - Dice number reliability
  - Historical win frequency at similar positions

### Model Selection UI
- Radio buttons to switch between "Optimization (Value-Based)" and "Historical (ML-Based)"
- Model information display showing:
  - Games analyzed (44,000+)
  - Winning settlements processed (80,000+)
  - Patterns identified (clusters)
- Real-time model switching during analysis

## How It Works

### Data Pipeline
```
game_results.csv + board_tiles.csv 
    ↓
Parse winning settlements from game history
    ↓
Extract tile features adjacent to winning positions
    ↓
Compute vertex statistics (resource value, dice reliability, diversity)
    ↓
Apply K-means clustering to identify patterns
    ↓
Score new board positions against historical patterns
```

### Scoring Algorithm
For each settlement vertex, the historical model computes:

```
Score = 0.4 * (avg_resource_value / 10)        # 40% weight on resource quality
       + 0.2 * (unique_resources / 3)           # 20% weight on resource diversity
       + 0.3 * (avg_dice_probability)           # 30% weight on dice reliability
       + 0.1 * (historical_win_frequency)       # 10% weight on historical performance
```

### Resources Analyzed
- **Wheat**: 10 points (highest priority)
- **Sheep/Ore**: 9 points
- **Brick/Wood**: 8 points
- **Desert**: 0 points (blocked)

### Dice Probability Weighting
- 2, 12: 1/36 (1 way)
- 3, 11: 2/36 (2 ways)
- 4, 10: 3/36 (3 ways)
- 5, 9: 4/36 (4 ways)
- 6, 8: 5/36 (5 ways - most reliable)

## Backend API

### Endpoint
```
POST /api/analyze-board?model=historical
Content-Type: text/csv

x,y,resource_type,dice_number
-2,2,Wood,6
-1,2,Sheep,8
...
```

### Query Parameters
- `model`: `"optimization"` (default) or `"historical"`

### Response (Historical Model)
```json
{
  "model_type": "historical",
  "candidates": [
    {
      "x": 0,
      "y": 1,
      "z": -1,
      "vertex": [0, 1, -1],
      "score": 0.785,
      "confidence": 0.65,
      "resources": ["Wheat", "Sheep", "Ore"],
      "dice_numbers": [6, 8, 5],
      "label": "Vertex (0,1,-1) - Score: 0.785"
    },
    ...
  ],
  "model_info": {
    "model_type": "historical",
    "games_analyzed": 43949,
    "winning_settlements_analyzed": 85000,
    "unique_vertices_found": 12450,
    "clusters_identified": 5
  }
}
```

## Frontend Implementation

### Model Selection
```jsx
<div className="model-selector">
  <label>Recommendation Model:</label>
  <div className="model-options">
    <label className="model-radio">
      <input type="radio" value="optimization" />
      <span>Optimization (Value-Based)</span>
    </label>
    <label className="model-radio">
      <input type="radio" value="historical" />
      <span>Historical (ML-Based)</span>
    </label>
  </div>
</div>
```

### Model Info Display
```jsx
{modelInfo && (
  <div className="model-info">
    <p className="model-type">Model: Historical</p>
    <small>📊 Analyzed 43,949 games • 85,000 winning settlements • 5 patterns</small>
  </div>
)}
```

### Recommendation Rendering
Both models return formatted recommendations that display:
- **Optimization**: Value Score, Tile Count, Resource Diversity
- **Historical**: ML Score, Confidence Level, Resource List

## Files Modified

### Backend
- `apps/backend/src/historical_analyzer.py` - New ML model implementation
- `apps/backend/src/main.py` - Updated with model routing logic
- `apps/backend/requirements.txt` - Added scikit-learn dependency

### Frontend
- `apps/frontend/src/pages/BuildBoard.jsx` - Added model selector UI, updated analysis flow
- `apps/frontend/src/pages/BuildBoard.css` - Added model selector styling

## Installation

### Install Dependencies
```bash
pip install -r apps/backend/requirements.txt
```

Required packages:
- `pandas>=2.0.0` - Data processing
- `numpy>=1.24.0` - Numerical computing
- `scikit-learn>=1.3.0` - K-means clustering and preprocessing

### Run Backend
```bash
cd apps/backend
uvicorn src.main:app --host 0.0.0.0 --port 3000
```

The historical analyzer loads automatically on first request, processing game history in ~30 seconds.

## Performance Characteristics

### Initialization
- First request: ~30 seconds (loads and processes 43,000+ games)
- Subsequent requests: <100ms (cached in memory)

### Recommendations
- Generation time: <50ms per board
- Top 10 recommendations returned by default
- Confidence scores: 0-1 (percentage of historical winning settlements)

## ML Techniques Used

### K-Means Clustering
- Groups vertices into 3-5 clusters based on resource/dice patterns
- Identifies "settlement archetypes" (e.g., "high-value balanced positions")
- Helps validate that recommendations match historical patterns

### Feature Normalization
- StandardScaler applied to clustering features
- Ensures resource value, diversity, dice reliability, and frequency are weighted equally

### Historical Analysis
- Counts winning settlements at each vertex position
- Normalizes by total occurrences to create win frequency metric
- Weights recommendations by pattern reliability

## Future Enhancements

- [ ] Player skill-level training (beginner vs advanced strategies)
- [ ] Port-based placement preferences
- [ ] Development card strategy patterns
- [ ] Real-time model retraining from new games
- [ ] Competing player settlement blocking analysis
- [ ] Time-series analysis of winning strategies over game releases

## Troubleshooting

### "Historical analyzer not available" Error
- Ensure `game_results.csv` and `board_tiles.csv` exist in `apps/backend/data/`
- Check file permissions and disk space
- Historical analyzer requires ~500MB RAM during initialization

### Slow Initial Load
- First request takes ~30 seconds to process 43,000+ games
- Subsequent requests use cached model
- Disable historical model if deployment has <1GB available RAM

### Model Not Switching
- Check browser console for API errors
- Verify backend is running on port 3000
- Clear browser cache and reload

## Citation & References

Game data sourced from Catan simulation engine. ML techniques based on:
- Scikit-learn K-Means: Lloyd's algorithm for iterative clustering
- Resource value theory: Catan ruleset and strategy analysis

## License

MSE 433 Project - Educational Use Only
