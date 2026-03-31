import os
from io import StringIO
from typing import Optional

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np

from .catan_analyzer import CatanBoardAnalyzer
from .historical_analyzer import HistoricalResultsAnalyzer

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5174")

app = FastAPI(title="MSE Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:5174", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cache for historical analyzer (load once at startup for performance)
_historical_analyzer = None

def get_historical_analyzer():
    """Lazy load the historical analyzer."""
    global _historical_analyzer
    if _historical_analyzer is None:
        try:
            data_dir = os.path.join(os.path.dirname(__file__), '../data')
            game_results_path = os.path.join(data_dir, 'game_results.csv')
            board_tiles_path = os.path.join(data_dir, 'board_tiles.csv')
            
            if os.path.exists(game_results_path) and os.path.exists(board_tiles_path):
                print("Loading historical analyzer...")
                _historical_analyzer = HistoricalResultsAnalyzer(
                    game_results_path,
                    board_tiles_path
                )
                print(f"Historical analyzer loaded: {_historical_analyzer.get_model_info()}")
            else:
                print(f"Warning: Historical data files not found at {data_dir}")
                _historical_analyzer = False  # Mark as "tried but not available"
        except Exception as e:
            print(f"Error loading historical analyzer: {e}")
            _historical_analyzer = False
    
    return _historical_analyzer if _historical_analyzer is not False else None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze-board")
async def analyze_board(
    request_data: str = Body(..., media_type="text/csv"),
    model: Optional[str] = "optimization"
) -> dict:
    """
    Receive board configuration as CSV and return settlement recommendations.
    
    Query parameters:
    - model: "optimization" (default) or "historical"
    
    Expected CSV format:
    x,y,resource_type,dice_number
    -2,2,Wood,6
    -1,2,Sheep,8
    ...
    """
    try:
        print(f"DEBUG: Received CSV data for {model} model:\n{request_data[:200]}...")
        
        # Parse the CSV into a DataFrame
        df = pd.read_csv(StringIO(request_data))
        print(f"DEBUG: Parsed DataFrame shape: {df.shape}")
        
        # Validate required columns
        required_cols = ['x', 'y', 'resource_type', 'dice_number']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f'Missing required columns: {missing}. Got: {df.columns.tolist()}'
            )
        
        # Route to appropriate model
        if model == "historical":
            response = await _analyze_board_historical(df)
        else:
            response = await _analyze_board_optimization(df)
        
        # Save board configuration to history
        timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
        archive_dir = os.path.join(
            os.path.dirname(__file__),
            '../data/analyzed_boards'
        )
        os.makedirs(archive_dir, exist_ok=True)
        archive_path = os.path.join(archive_dir, f'board_{timestamp}.csv')
        df.to_csv(archive_path, index=False)
        
        return response
        
    except pd.errors.ParserError as e:
        print(f"ERROR: CSV parsing failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f'Invalid CSV format: {str(e)}'
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f'Server error: {type(e).__name__}: {str(e)}'
        )


async def _analyze_board_optimization(df: pd.DataFrame) -> dict:
    """Use optimization-based analyzer."""
    # Create a temporary CSV file for analysis
    board_csv_path = '/tmp/current_board.csv'
    df.to_csv(board_csv_path, index=False)
    
    print(f"DEBUG: Using optimization model on {board_csv_path}")
    
    # Analyze the board
    analyzer = CatanBoardAnalyzer(board_csv_path)
    print(f"DEBUG: Analyzer created with {len(analyzer.tiles)} tiles")
    
    recommendations = analyzer.analyze_board()
    print(f"DEBUG: Found {len(recommendations)} settlement recommendations")
    
    if not recommendations:
        raise HTTPException(
            status_code=400,
            detail='Could not generate recommendations for this board. No valid settlement vertices found.'
        )
    
    def _format_candidate(rec: dict) -> dict:
        return {
            'corner_id': int(rec['corner_id']),
            'anchor_tile_x': int(rec['anchor_tile_x']),
            'anchor_tile_y': int(rec['anchor_tile_y']),
            'corner_index': int(rec['corner_index']),
            'x': int(rec['x']),
            'y': int(rec['y']),
            'z': int(rec['z']),
            'value_score': float(rec['weighted_score']),
            'resource_diversity': int(rec['diversity']),
            'probability': float(rec['avg_probability']),
            'tiles': rec['tiles'],
            'touching_tile_positions': rec.get('touching_tile_positions', []),
            'tile_count': int(rec.get('tile_count', len(rec.get('tiles', [])))),
            'label': (
                f"corner {rec['corner_id']} @ tile ({rec['anchor_tile_x']},{rec['anchor_tile_y']}) "
                f"corner {rec['corner_index']} (xyz={rec['x']},{rec['y']},{rec['z']})"
            ),
            'model_type': 'optimization'
        }

    response = {
        'model_type': 'optimization',
        'candidates': [_format_candidate(r) for r in recommendations[:50]],
        'candidate_count': len(recommendations),
        'candidate_returned': min(len(recommendations), 50),
        'vertices': [_format_candidate(r) for r in recommendations],
        'vertex_adjacency': analyzer.vertex_adjacency,
    }
    
    print(f"DEBUG: Returning optimization response with {len(response['candidates'])} candidates")
    return response


async def _analyze_board_historical(df: pd.DataFrame) -> dict:
    """Use historical results-based analyzer with ML clustering."""
    # Get historical analyzer
    historical_analyzer = get_historical_analyzer()
    
    if not historical_analyzer:
        raise HTTPException(
            status_code=503,
            detail='Historical analyzer not available. Ensure game_results.csv and board_tiles.csv exist in data folder.'
        )
    
    # Create CatanBoardAnalyzer to get all valid vertices with their resources
    board_csv_path = '/tmp/current_board_hist.csv'
    df.to_csv(board_csv_path, index=False)
    catan_analyzer = CatanBoardAnalyzer(board_csv_path)
    
    print(f"DEBUG: CatanBoardAnalyzer found {len(catan_analyzer.vertices)} vertices")
    
    # Convert board to tile list for feature extraction
    board_tiles = []
    for _, row in df.iterrows():
        board_tiles.append({
            'x': int(row['x']),
            'y': int(row['y']),
            'resource': row['resource_type'],
            'dice': int(row['dice_number']) if pd.notna(row['dice_number']) else 0
        })
    
    # Score each vertex using ML features
    vertex_recommendations = []
    
    for vertex in catan_analyzer.vertices:
        corner_id = vertex['corner_id']
        anchor_tile_x, anchor_tile_y = vertex['anchor_tile']
        corner_index = vertex['corner_index']
        touching_tiles = vertex['touching_tiles']
        
        if not touching_tiles:
            continue
        
        # Extract features from this vertex (same as training)
        resources = [historical_analyzer.normalize_resource(t['resource']) for t in touching_tiles]
        resource_values = [historical_analyzer.RESOURCE_VALUE.get(r, 0) for r in resources]
        
        # Feature 1: Resource value
        avg_resource_value = np.mean(resource_values) if resource_values else 0
        
        # Feature 2: Resource diversity
        unique_resources = len(set(resources))
        resource_diversity = unique_resources / max(len(resources), 1)
        
        # Feature 3: Dice reliability
        dice_numbers = [int(t['number']) for t in touching_tiles if t['number'] > 0]
        probability_weights = {
            2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36, 7: 6/36,
            8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
        }
        probabilities = [probability_weights.get(d, 0) for d in dice_numbers]
        dice_reliability = np.mean(probabilities) if probabilities else 0
        
        # Create feature vector (matching training data)
        feature_vector = np.array([
            avg_resource_value,
            resource_diversity,
            dice_reliability,
            0  # placeholder for historical frequency (not available for new vertex)
        ]).reshape(1, -1)
        
        # Use trained clustering to find nearest cluster
        if hasattr(historical_analyzer, 'vertex_clusters') and 'kmeans' in historical_analyzer.vertex_clusters:
            kmeans = historical_analyzer.vertex_clusters['kmeans']
            scaler = historical_analyzer.vertex_clusters['scaler']
            
            # Normalize features using training scaler
            feature_normalized = scaler.transform(feature_vector)
            
            # Find cluster
            cluster_id = kmeans.predict(feature_normalized)[0]
            
            # Score based on cluster quality (how many winning vertices in this cluster)
            cluster_info = historical_analyzer.vertex_clusters.get('clusters', {})
            cluster_vertices = cluster_info.get(cluster_id, [])
            
            # Score = average win frequency of vertices in cluster + resource bonus
            if cluster_vertices:
                avg_win_freq = np.mean([historical_analyzer.vertex_stats.get(v, {}).get('count', 0) 
                                       for v in cluster_vertices])
                max_win_freq = max([v['count'] for v in historical_analyzer.vertex_stats.values()], default=1)
                cluster_score = avg_win_freq / max_win_freq
            else:
                cluster_score = 0.5  # Default for empty clusters
            
            # Add resource quality bonus
            historical_score = 0.7 * cluster_score + 0.3 * (avg_resource_value / 10.0)
        else:
            # Fallback: just use resource value
            historical_score = avg_resource_value / 10.0
        
        # Get vertex value using optimization model logic
        vertex_value = catan_analyzer.calculate_vertex_value(touching_tiles)
        if vertex_value is None:
            continue
        
        # Debug: log first vertex
        if corner_id == 0 or corner_id == 1:
            print(f"DEBUG: corner_id={corner_id}, vertex_value={vertex_value}")
        
        recommendation = {
            'corner_id': int(corner_id),
            'anchor_tile_x': int(anchor_tile_x),
            'anchor_tile_y': int(anchor_tile_y),
            'corner_index': int(corner_index),
            'x': int(anchor_tile_x),
            'y': int(anchor_tile_y),
            'z': int(corner_index),
            'xyz': {'x': int(anchor_tile_x), 'y': int(anchor_tile_y), 'z': int(corner_index)},
            'value_score': float(historical_score),
            'score': float(historical_score),
            'confidence': 1.0,
            'resource_diversity': int(vertex_value.get('diversity', 0)),
            'diversity': int(vertex_value.get('diversity', 0)),
            'probability': float(vertex_value.get('avg_probability', 0)),
            'tiles': vertex_value.get('tiles', []),
            'resources': [s.split()[0] if s else '' for s in vertex_value.get('tiles', [])],  # Extract just resource name
            'dice_numbers': [int(s.split()[1]) if len(s.split()) > 1 else 0 for s in vertex_value.get('tiles', [])],
            'touching_tile_positions': [(t['x'], t['y']) for t in touching_tiles],
            'tile_count': len(touching_tiles),
            'label': (
                f"corner {corner_id} @ tile ({anchor_tile_x},{anchor_tile_y}) "
                f"corner {corner_index}"
            ),
            'model_type': 'historical'
        }
        vertex_recommendations.append(recommendation)
    
    # Sort by historical score
    vertex_recommendations.sort(key=lambda x: x['value_score'], reverse=True)
    
    if not vertex_recommendations:
        raise HTTPException(
            status_code=400,
            detail='Could not generate historical recommendations for this board.'
        )
    
    response = {
        'model_type': 'historical',
        'candidates': vertex_recommendations[:50],
        'candidate_count': len(vertex_recommendations),
        'candidate_returned': min(len(vertex_recommendations), 50),
        'vertices': vertex_recommendations,
        'vertex_adjacency': catan_analyzer.vertex_adjacency,
        'model_info': historical_analyzer.get_model_info()
    }
    
    print(f"DEBUG: Returning historical response with {len(response['candidates'])} candidates")
    return response
