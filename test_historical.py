#!/usr/bin/env python3
"""Quick test of the historical analyzer with real data."""

import sys
sys.path.insert(0, '/Users/patrickbennett1/Desktop/MSE 433/MSE_433_Project/apps/backend/src')

from historical_analyzer import HistoricalResultsAnalyzer

# Test with real data
data_dir = '/Users/patrickbennett1/Desktop/MSE 433/MSE_433_Project/apps/backend/data'
game_results_path = f'{data_dir}/game_results.csv'
board_tiles_path = f'{data_dir}/board_tiles.csv'

print("Loading historical analyzer...")
try:
    analyzer = HistoricalResultsAnalyzer(game_results_path, board_tiles_path)
    print("✓ Successfully loaded!")
    
    info = analyzer.get_model_info()
    print("\nModel Info:")
    for key, value in info.items():
        print(f"  {key}: {value}")
    
    # Get recommendations for first board
    if analyzer.boards:
        first_game_id = list(analyzer.boards.keys())[0]
        first_board = analyzer.boards[first_game_id]
        print(f"\nGetting recommendations for game {first_game_id}...")
        
        recommendations = analyzer.get_recommendations(first_board, top_n=5)
        print(f"✓ Generated {len(recommendations)} recommendations")
        
        for i, rec in enumerate(recommendations[:3], 1):
            print(f"\n  Recommendation {i}:")
            print(f"    Vertex: ({rec['x']}, {rec['y']}, {rec['z']})")
            print(f"    Score: {rec['score']:.3f}")
            print(f"    Resources: {rec['resources']}")
            print(f"    Confidence: {rec['confidence']:.2%}")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✓ All tests passed!")
