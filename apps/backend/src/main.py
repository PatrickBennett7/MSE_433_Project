import os
from io import StringIO

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from .catan_analyzer import CatanBoardAnalyzer

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5174")

app = FastAPI(title="MSE Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:5174", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze-board")
async def analyze_board(request_data: str = Body(..., media_type="text/csv")) -> dict:
    """
    Receive board configuration as CSV and return optimal settlement recommendation.
    
    Expected CSV format:
    x,y,resource_type,dice_number
    -2,2,Forest,6
    -1,2,Wool,8
    ...
    """
    try:
        print(f"DEBUG: Received CSV data:\n{request_data[:200]}...")  # Print first 200 chars
        
        # Parse the CSV into a DataFrame
        df = pd.read_csv(StringIO(request_data))
        print(f"DEBUG: Parsed DataFrame shape: {df.shape}")
        print(f"DEBUG: Columns: {df.columns.tolist()}")
        
        # Validate required columns
        required_cols = ['x', 'y', 'resource_type', 'dice_number']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f'Missing required columns: {missing}. Got: {df.columns.tolist()}'
            )
        
        # Create a temporary CSV file for analysis
        board_csv_path = '/tmp/current_board.csv'
        df.to_csv(board_csv_path, index=False)
        
        print(f"DEBUG: Saved board to {board_csv_path}")
        
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
                'value_score': float(rec['total_value']),
                'resource_diversity': int(rec['diversity']),
                'probability': float(rec['avg_probability']),
                'tiles': rec['tiles'],
                'touching_tile_positions': rec.get('touching_tile_positions', []),
                'tile_count': int(rec.get('tile_count', len(rec.get('tiles', [])))),
                'label': (
                    f"corner {rec['corner_id']} @ tile ({rec['anchor_tile_x']},{rec['anchor_tile_y']}) "
                    f"corner {rec['corner_index']} (xyz={rec['x']},{rec['y']},{rec['z']})"
                ),
            }

        response = {
            # Larger candidate list for client-side filtering (e.g., remove confirmed/taken corners)
            'candidates': [_format_candidate(r) for r in recommendations[:50]],
            'candidate_count': len(recommendations),
            'candidate_returned': min(len(recommendations), 50),

            # Vertex graph for placement constraints
            'vertices': [_format_candidate(r) for r in recommendations],
            'vertex_adjacency': analyzer.vertex_adjacency,
        }
        
        print(f"DEBUG: Returning response: {response}")
        
        # Save board configuration to history for future analysis
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