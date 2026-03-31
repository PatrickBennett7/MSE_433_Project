import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import defaultdict, Counter
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


class HistoricalResultsAnalyzer:
    """
    Analyzes previous game results to recommend settlement placements.
    Uses ML techniques to identify patterns in winning settlements based on:
    - Resource combinations (clusters)
    - Dice number distributions
    - Vertex adjacency patterns
    - Win rates and frequencies
    """

    # Canonical Catan resources with empirical values
    RESOURCE_VALUE = {
        'Wheat': 1.350,    # Grain (empirical)
        'Sheep': 0.760,    # Sheep (empirical)
        'Brick': 0.781,    # Brick (empirical)
        'Ore': 1.329,      # Ore (empirical)
        'Wood': 0.781,     # Wood (empirical)
        'Desert': 0        # No production
    }

    RESOURCE_ALIASES = {
        'Forest': 'Wood',
        'Wool': 'Sheep',
        'Grain': 'Wheat',
    }

    @classmethod
    def normalize_resource(cls, resource: str) -> str:
        """Normalize resource names to canonical Catan names."""
        if resource is None:
            return ''
        raw = str(resource).strip()
        if not raw or raw.lower() == 'nan':
            return ''
        normalized = raw.title()
        return cls.RESOURCE_ALIASES.get(normalized, normalized)

    def __init__(self, game_results_path: str, board_tiles_path: str):
        """
        Initialize with historical game data.
        
        Args:
            game_results_path: Path to game_results.csv (contains winner info and starting positions)
            board_tiles_path: Path to board_tiles.csv (contains board configurations)
        """
        print("Loading game results...")
        self.game_results_df = pd.read_csv(game_results_path)
        print(f"  Loaded {len(self.game_results_df)} games")
        
        print("Loading board tiles...")
        self.board_tiles_df = pd.read_csv(board_tiles_path)
        print(f"  Loaded {len(self.board_tiles_df)} board records")
        
        # Parse board tiles into more usable format
        print("Parsing boards...")
        self.boards = self._parse_boards()
        print(f"  Parsed {len(self.boards)} boards")
        
        # Extract winning settlement positions
        print("Extracting winning settlements...")
        self.winning_settlements = self._extract_winning_settlements()
        print(f"  Found {len(self.winning_settlements)} winning settlements")
        
        # Build vertex features from historical data
        print("Computing vertex features...")
        self.vertex_features = self._compute_vertex_features()
        print(f"  Computed features for {len(self.vertex_stats)} unique vertices")
        
        # Cluster vertices by resource+dice combinations
        print("Clustering vertices...")
        self.vertex_clusters = self._cluster_vertices()
        print(f"  Created {len(self.vertex_clusters.get('clusters', {}))} clusters")
        
        print("Historical analyzer initialization complete!")

    def _parse_boards(self) -> Dict[int, List[Dict]]:
        """Parse board tiles CSV into dictionary of boards indexed by game_id."""
        boards = {}
        
        # Extract tile columns (tile_0_x, tile_0_y, tile_0_type, tile_0_dice_number, etc.)
        for _, row in self.board_tiles_df.iterrows():
            game_id = int(row['game_id'])
            tiles = []
            
            for i in range(19):  # 19 tiles in standard Catan
                x_col = f'tile_{i}_x'
                y_col = f'tile_{i}_y'
                type_col = f'tile_{i}_type'
                dice_col = f'tile_{i}_dice_number'
                
                if x_col in row.index and pd.notna(row[x_col]):
                    tile = {
                        'x': int(row[x_col]),
                        'y': int(row[y_col]),
                        'resource': self.normalize_resource(row[type_col]),
                        'dice': int(row[dice_col]) if pd.notna(row[dice_col]) else 0
                    }
                    tiles.append(tile)
            
            boards[game_id] = tiles
        
        return boards

    def _extract_winning_settlements(self) -> List[Dict]:
        """
        Extract settlement positions from winning games.
        Returns list of settlements with their board context and win outcome.
        """
        winning_settlements = []
        
        for _, row in self.game_results_df.iterrows():
            game_id = int(row['game_id'])
            
            # Skip if winner_color is NaN
            if pd.isna(row['winner_color']):
                continue
                
            winner_color = int(row['winner_color'])  # 1-4 representing which player
            
            if game_id not in self.boards:
                continue
            
            board_tiles = self.boards[game_id]
            
            # Extract starting settlements for the winner (player 1-4)
            # Format: player_X_start1_corner, player_X_start1_x/y/z, player_X_start2_corner, player_X_start2_x/y/z
            for settlement_num in [1, 2]:
                corner_col = f'player_{winner_color}_start{settlement_num}_corner'
                x_col = f'player_{winner_color}_start{settlement_num}_x'
                y_col = f'player_{winner_color}_start{settlement_num}_y'
                z_col = f'player_{winner_color}_start{settlement_num}_z'
                
                if corner_col in row.index and pd.notna(row[corner_col]):
                    settlement = {
                        'game_id': game_id,
                        'winner': True,
                        'corner': int(row[corner_col]),
                        'x': int(row[x_col]),
                        'y': int(row[y_col]),
                        'z': int(row[z_col]),
                        'board_tiles': board_tiles
                    }
                    winning_settlements.append(settlement)
        
        return winning_settlements

    def _compute_vertex_features(self) -> Dict[Tuple, Dict]:
        """
        For each winning settlement vertex, compute features:
        - Average resource value of adjacent tiles
        - Dice number distribution
        - Diversity metrics
        - Frequency in winning games
        """
        vertex_stats = defaultdict(lambda: {
            'count': 0,
            'resources': [],
            'dice_numbers': [],
            'resource_diversity': 0,
            'avg_resource_value': 0,
            'dice_reliability': 0,
        })
        
        # Process each winning settlement
        for i, settlement in enumerate(self.winning_settlements):
            # Progress logging
            if i % 5000 == 0:
                print(f"  Processing winning settlements: {i}/{len(self.winning_settlements)}...")
            
            x, y, z = settlement['x'], settlement['y'], settlement['z']
            vertex_key = (x, y, z)
            
            # Find tiles adjacent to this vertex and extract their features
            board_tiles = settlement['board_tiles']
            adjacent_tiles = self._find_adjacent_tiles(x, y, z, board_tiles)
            
            # Update stats
            vertex_stats[vertex_key]['count'] += 1
            
            for tile in adjacent_tiles:
                resource = tile['resource']
                dice = tile['dice']
                
                if resource and resource != 'Desert':
                    vertex_stats[vertex_key]['resources'].append(resource)
                    vertex_stats[vertex_key]['dice_numbers'].append(dice)
        
        # Normalize statistics
        for vertex_key, stats in vertex_stats.items():
            if stats['count'] > 0:
                # Resource diversity (unique resources / total resources)
                unique_resources = len(set(stats['resources']))
                stats['resource_diversity'] = unique_resources / max(len(stats['resources']), 1)
                
                # Average resource value
                resource_values = [self.RESOURCE_VALUE.get(r, 0) for r in stats['resources']]
                stats['avg_resource_value'] = np.mean(resource_values) if resource_values else 0
                
                # Dice reliability (average probability of rolling)
                probability_weights = {
                    2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36,
                    8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
                }
                probabilities = [probability_weights.get(d, 0) for d in stats['dice_numbers']]
                stats['dice_reliability'] = np.mean(probabilities) if probabilities else 0
                
                # Win rate (normalized: count / max_count_for_any_vertex)
                stats['win_frequency'] = stats['count']
        
        self.vertex_stats = vertex_stats
        return vertex_stats

    def _find_adjacent_tiles(self, x: int, y: int, z: int, 
                            board_tiles: List[Dict]) -> List[Dict]:
        """
        Find tiles adjacent to a vertex (x, y, z).
        In axial coordinates, a vertex is shared by up to 3 tiles.
        """
        adjacent = []
        
        # Axial coordinate vertex-to-tile adjacency (hex grid specific)
        # For a vertex at (x, y, z), check surrounding tile coordinates
        candidate_tiles = [
            (x, y), (x-1, y), (x, y-1),  # Three possible adjacent hex centers
            (x, y+1), (x+1, y), (x+1, y-1),
        ]
        
        for tile in board_tiles:
            tile_pos = (tile['x'], tile['y'])
            if tile_pos in candidate_tiles:
                adjacent.append(tile)
        
        return adjacent

    def _cluster_vertices(self) -> Dict:
        """
        Use K-means clustering to group vertices by similar resource+dice patterns.
        This helps identify "types" of good settlement locations.
        """
        if not self.vertex_stats:
            return {}
        
        # Prepare feature matrix
        vertices = list(self.vertex_stats.keys())
        features = []
        
        # Limit to top vertices by win frequency to reduce computation
        top_vertices = sorted(vertices, 
                             key=lambda v: self.vertex_stats[v]['win_frequency'], 
                             reverse=True)[:100]  # Top 100 vertices
        
        for vertex in top_vertices:
            stats = self.vertex_stats[vertex]
            feature_vector = [
                stats['avg_resource_value'],
                stats['resource_diversity'],
                stats['dice_reliability'],
                stats['win_frequency']
            ]
            features.append(feature_vector)
        
        if len(features) < 2:
            return {'vertices': top_vertices, 'clusters': [0] * len(top_vertices)}
        
        # Normalize features
        scaler = StandardScaler()
        normalized_features = scaler.fit_transform(features)
        
        # Cluster (use 3-5 clusters for typical pattern recognition)
        n_clusters = min(5, max(2, len(top_vertices) // 20))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=5, max_iter=50)
        labels = kmeans.fit_predict(normalized_features)
        
        clusters = defaultdict(list)
        for vertex, label in zip(top_vertices, labels):
            clusters[label].append(vertex)
        
        return {
            'vertices': top_vertices,
            'labels': labels,
            'clusters': dict(clusters),
            'scaler': scaler,
            'kmeans': kmeans
        }

    def _calculate_cluster_bonus(self, x: int, y: int, z: int, 
                                 adjacent: List[Dict]) -> float:
        """
        Calculate bonus based on how well this vertex matches the clusters.
        Finds the best-matching cluster and returns its average win frequency.
        
        Returns:
            Cluster bonus (0-1), higher if vertex matches high-performing clusters
        """
        if not self.vertex_clusters or 'kmeans' not in self.vertex_clusters:
            return 0.0
        
        # Extract features for this vertex
        resources = [self.normalize_resource(t['resource']) for t in adjacent]
        resource_values = [self.RESOURCE_VALUE.get(r, 0) for r in resources]
        avg_resource_value = np.mean(resource_values) if resource_values else 0
        
        # Resource diversity
        unique_resources = len(set(resources))
        diversity = unique_resources / 3.0
        
        # Dice reliability
        dice_numbers = [int(t['dice']) for t in adjacent 
                       if pd.notna(t['dice']) and int(t['dice']) > 0]
        probability_weights = {
            2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36, 7: 6/36,
            8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
        }
        if dice_numbers:
            probabilities = [probability_weights.get(d, 0) for d in dice_numbers]
            avg_prob = np.mean(probabilities) / max(probability_weights.values())
        else:
            avg_prob = 0
        
        # Create feature vector for this vertex
        vertex_features = [avg_resource_value, diversity, avg_prob, 0]  # 0 for win frequency placeholder
        
        try:
            # Normalize using the same scaler
            scaler = self.vertex_clusters.get('scaler')
            kmeans = self.vertex_clusters.get('kmeans')
            
            if scaler is None or kmeans is None:
                return 0.0
            
            # Normalize features
            normalized = scaler.transform([vertex_features])
            
            # Find distances to all cluster centers
            distances = kmeans.transform(normalized)[0]
            closest_cluster_idx = np.argmin(distances)
            
            # Get vertices in the closest cluster
            clusters = self.vertex_clusters.get('clusters', {})
            cluster_vertices = clusters.get(closest_cluster_idx, [])
            
            # Calculate average win frequency of vertices in this cluster
            cluster_win_freqs = []
            for cluster_vertex in cluster_vertices:
                if cluster_vertex in self.vertex_stats:
                    cluster_win_freqs.append(self.vertex_stats[cluster_vertex]['win_frequency'])
            
            if cluster_win_freqs:
                max_freq = max([s['win_frequency'] for s in self.vertex_stats.values()], default=1)
                cluster_bonus = np.mean(cluster_win_freqs) / max_freq
                return min(1.0, cluster_bonus)
            else:
                return 0.0
                
        except Exception as e:
            print(f"Error calculating cluster bonus: {e}")
            return 0.0

    def score_vertex(self, anchor_x: int, anchor_y: int, corner_index: int, 
                     board_tiles: List[Dict]) -> float:
        """
        Score a single vertex based on historical patterns.
        
        Args:
            anchor_x, anchor_y: Anchor tile coordinates
            corner_index: Corner index (0-5) on the hex
            board_tiles: List of board tiles with resource and dice
            
        Returns:
            Historical score (0-1)
        """
        # Map corner_index to approximate (x, y, z) vertex coordinates
        # This is an approximation based on hex geometry
        corner_offsets = {
            0: (0, 0, 1),    # Top
            1: (1, -1, 0),   # Top-right
            2: (1, 0, -1),   # Bottom-right
            3: (0, 1, -1),   # Bottom
            4: (-1, 1, 0),   # Bottom-left
            5: (-1, 0, 1)    # Top-left
        }
        
        offset = corner_offsets.get(corner_index, (0, 0, 1))
        x = anchor_x + offset[0]
        y = anchor_y + offset[1]
        z = offset[2]
        
        # Find adjacent tiles using the same logic as get_recommendations
        adjacent = []
        candidate_tiles = [
            (anchor_x, anchor_y), (anchor_x-1, anchor_y), (anchor_x, anchor_y-1),
            (anchor_x, anchor_y+1), (anchor_x+1, anchor_y), (anchor_x+1, anchor_y-1),
        ]
        
        for tile in board_tiles:
            tile_pos = (tile['x'], tile['y'])
            if tile_pos in candidate_tiles:
                adjacent.append(tile)
        
        if not adjacent:
            return 0.0
        
        # Compute historical score (weights: 0.35 resource, 0.25 dice, 0.2 diversity, 0.05 history, 0.15 cluster)
        score = 0.0
        
        # 1. Resource value (35%)
        resources = [self.normalize_resource(t['resource']) for t in adjacent]
        resource_values = [self.RESOURCE_VALUE.get(r, 0) for r in resources]
        if resource_values:
            score += 0.35 * (np.mean(resource_values) / 10.0)
        
        # 2. Resource diversity (20%)
        unique_resources = len(set(resources))
        diversity_bonus = unique_resources / 3.0
        score += 0.2 * diversity_bonus
        
        # 3. Dice reliability (25%)
        dice_numbers = [int(t['dice']) for t in adjacent 
                       if pd.notna(t['dice']) and int(t['dice']) > 0]
        if dice_numbers:
            probability_weights = {
                2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36, 7: 6/36,
                8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
            }
            probabilities = [probability_weights.get(d, 0) for d in dice_numbers]
            avg_prob = np.mean(probabilities)
            score += 0.25 * (avg_prob / max(probability_weights.values()))
        
        # 4. Historical pattern (5%)
        vertex_key = (x, y, z)
        if vertex_key in self.vertex_stats:
            max_freq = max([s['win_frequency'] for s in self.vertex_stats.values()], default=1)
            historical_score = self.vertex_stats[vertex_key]['win_frequency'] / max_freq
            score += 0.05 * historical_score
        else:
            score += 0.025  # Small bonus for any valid position
        
        # 5. Cluster matching bonus (15%)
        cluster_bonus = self._calculate_cluster_bonus(x, y, z, adjacent)
        score += 0.15 * cluster_bonus
        
        return min(1.0, score)

    def get_recommendations(self, board_tiles: List[Dict], 
                          top_n: int = 5) -> List[Dict]:
        """
        Recommend settlement placements based on historical patterns.
        
        Args:
            board_tiles: List of tile dicts with 'x', 'y', 'resource', 'dice'
            top_n: Number of top recommendations to return
            
        Returns:
            List of recommended vertices with scores and corner_id
        """
        # Build vertex features for this board
        board_vertex_scores = defaultdict(float)
        
        # Extract all vertices from tiles (hexes have 6 vertices each)
        board_vertices = self._extract_board_vertices(board_tiles)
        
        # Create mapping from vertex tuple to corner_id (same logic as catan_analyzer)
        vertices_sorted = sorted(board_vertices)
        vertex_to_corner_id = {v: i for i, v in enumerate(vertices_sorted)}
        
        for vertex in board_vertices:
            x, y, z = vertex
            
            # Find adjacent tiles on this board
            adjacent_tiles = self._find_adjacent_tiles(x, y, z, board_tiles)
            
            if not adjacent_tiles:
                continue
            
            # Compute features for this vertex
            resources = [self.normalize_resource(t['resource']) 
                        for t in adjacent_tiles if t['resource']]
            # Ensure dice values are ints before comparison
            dice_numbers = [int(t['dice']) for t in adjacent_tiles 
                           if pd.notna(t['dice']) and int(t['dice']) > 0]
            
            # Score based on historical patterns
            score = 0
            
            # 1. Resource value component (40%)
            resource_values = [self.RESOURCE_VALUE.get(r, 0) for r in resources]
            if resource_values:
                score += 0.4 * (np.mean(resource_values) / 10.0)
            
            # 2. Resource diversity bonus (20%)
            unique_resources = len(set(resources))
            diversity_bonus = unique_resources / 3.0  # Up to 3 tiles per vertex
            score += 0.2 * diversity_bonus
            
            # 3. Dice reliability component (30%)
            if dice_numbers:
                probability_weights = {
                    2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36,
                    8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
                }
                probabilities = [probability_weights.get(d, 0) for d in dice_numbers]
                avg_prob = np.mean(probabilities)
                score += 0.3 * (avg_prob / max(probability_weights.values()))
            
            # 4. Historical pattern matching (10%)
            vertex_key = (x, y, z)
            if vertex_key in self.vertex_stats:
                max_freq = max([s['win_frequency'] for s in self.vertex_stats.values()], default=1)
                historical_score = self.vertex_stats[vertex_key]['win_frequency'] / max_freq
                score += 0.1 * historical_score
            
            board_vertex_scores[vertex] = score
        
        # Sort by score and return top N
        sorted_vertices = sorted(board_vertex_scores.items(), 
                               key=lambda x: x[1], reverse=True)[:top_n]
        
        recommendations = []
        for vertex, score in sorted_vertices:
            x, y, z = vertex
            adjacent_tiles = self._find_adjacent_tiles(x, y, z, board_tiles)
            resources = [self.normalize_resource(t['resource']) 
                        for t in adjacent_tiles if t['resource'] and t['resource'] != 'Desert']
            dice_numbers = [int(t['dice']) for t in adjacent_tiles 
                           if pd.notna(t['dice']) and int(t['dice']) > 0]
            
            # Store touching tile positions for corner_id lookup
            touching_coords = tuple(sorted([(t['x'], t['y']) for t in adjacent_tiles]))
            
            rec = {
                'corner_id': vertex_to_corner_id.get(vertex, -1),
                'vertex': vertex,
                'x': x,
                'y': y,
                'z': z,
                'score': float(score),
                'resources': resources,
                'dice_numbers': dice_numbers,
                'touching_coords': touching_coords,
                'touching_tiles': [(t['x'], t['y']) for t in adjacent_tiles],
                'confidence': min(1.0, self.vertex_stats.get((x, y, z), {}).get('count', 0) / 10.0)
            }
            recommendations.append(rec)
        
        return recommendations

    def _extract_board_vertices(self, board_tiles: List[Dict]) -> List[Tuple[int, int, int]]:
        """Extract all possible vertices from board tiles."""
        vertices = set()
        
        for tile in board_tiles:
            x, y = tile['x'], tile['y']
            # Each hex has 6 vertices. In cube coordinates (x, y, z where x+y+z=0):
            # Calculate the 6 vertices of hex at (x, y)
            tile_vertices = self._get_hex_vertices(x, y)
            vertices.update(tile_vertices)
        
        return list(vertices)

    def _get_hex_vertices(self, x: int, y: int) -> List[Tuple[int, int, int]]:
        """Get the 6 vertices of a hex in cube coordinates."""
        z = -x - y
        
        # Six vertices around a hex (clockwise from top)
        # These are the corners shared with neighboring hexes
        vertices = [
            (x, y+1, z-1),    # top
            (x+1, y, z-1),    # top-right
            (x+1, y-1, z),    # bottom-right
            (x, y-1, z+1),    # bottom
            (x-1, y, z+1),    # bottom-left
            (x-1, y+1, z),    # top-left
        ]
        
        return vertices

    def get_model_info(self) -> Dict:
        """Return metadata about the historical model."""
        return {
            'model_type': 'historical',
            'games_analyzed': len(self.game_results_df),
            'winning_settlements_analyzed': len(self.winning_settlements),
            'unique_vertices_found': len(self.vertex_stats),
            'clusters_identified': len(self.vertex_clusters.get('clusters', {}))
        }
