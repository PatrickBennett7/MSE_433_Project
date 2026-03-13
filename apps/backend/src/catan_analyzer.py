import pandas as pd
import numpy as np
from typing import Dict, List, Tuple

class CatanBoardAnalyzer:
    """
    Analyzes a Catan board to recommend settlement placement.
    A settlement sits on a VERTEX (corner) of a hex. Vertices on the island edge
    can touch 1-2 tiles; interior vertices touch 3 tiles.
    """
    
    # Standard Catan resource values (probability of rolling that number)
    PROBABILITY_WEIGHTS = {
        2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36,
        8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
    }
    
    # Resource desirability in 4v4 (normalize 0-10)
    RESOURCE_VALUE = {
        'Wheat': 10,    # Always needed for development & cities
        'Sheep': 9,     # Development cards, settlements
        'Brick': 8,     # Roads, cities
        'Ore': 9,       # Development cards, cities
        'Wood': 8,      # Roads, settlements
        'Forest': 8,    # Alternative name for Wood
        'Wool': 9,      # Alternative name for Sheep
        'Grain': 10,    # Alternative name for Wheat
        'Desert': 0     # No production
    }
    
    def __init__(self, csv_path: str):
        """Initialize analyzer with board data."""
        self.df = pd.read_csv(csv_path)
        self.validate_data()
        self.tiles = self._parse_tiles()
        self._tile_map = {(t["x"], t["y"]): t for t in self.tiles}
        # Build deterministic vertex map (no geometry tolerances)
        self.vertices = self._build_vertices()
        self.vertex_adjacency = self._build_vertex_adjacency()
        
    def validate_data(self):
        """Ensure CSV has required columns."""
        required_cols = ['x', 'y', 'resource_type', 'dice_number']
        missing = [col for col in required_cols if col not in self.df.columns]
        if missing:
            print(f"Warning: Missing columns: {missing}")
    
    def _parse_tiles(self) -> List[Dict]:
        """Parse tiles from CSV format."""
        tiles = []
        for idx, row in self.df.iterrows():
            tile = {
                'index': idx,
                'x': int(row['x']),
                'y': int(row['y']),
                'resource': str(row['resource_type']).strip() if pd.notna(row['resource_type']) else '',
                'number': int(row['dice_number']) if pd.notna(row['dice_number']) else 0
            }
            if tile['resource'] and tile['resource'].lower() != 'nan':
                tiles.append(tile)
        return tiles

    # Axial neighbor directions for pointy-top hexes (q=x, r=y), clockwise starting at NE.
    _AXIAL_DIRS: List[Tuple[int, int]] = [
        (1, -1),  # NE
        (1, 0),   # E
        (0, 1),   # SE
        (-1, 1),  # SW
        (-1, 0),  # W
        (0, -1),  # NW
    ]

    # Corner indices match the hex clip-path order:
    # 0 top, 1 top-right, 2 bottom-right, 3 bottom, 4 bottom-left, 5 top-left
    # Each corner is shared by the tile and two adjacent neighbor directions.
    _CORNER_DIR_IDXS: List[Tuple[int, int]] = [
        (5, 0),  # top: NW + NE
        (0, 1),  # top-right: NE + E
        (1, 2),  # bottom-right: E + SE
        (2, 3),  # bottom: SE + SW
        (3, 4),  # bottom-left: SW + W
        (4, 5),  # top-left: W + NW
    ]

    # Vertex cube coordinate offsets (doubled) per corner.
    # We represent a vertex as an integer (x,y,z) with x+y+z=0 in a doubled cube grid.
    _CORNER_CUBE_OFFSETS_2X: List[Tuple[int, int, int]] = [
        (1, 1, -2),    # top
        (2, -1, -1),   # top-right
        (1, -2, 1),    # bottom-right
        (-1, -1, 2),   # bottom
        (-2, 1, 1),    # bottom-left
        (-1, 2, -1),   # top-left
    ]

    def _build_vertices(self) -> List[Dict]:
        """Build unique vertex definitions deterministically from tile adjacency."""
        vertices_by_key: Dict[Tuple[Tuple[int, int], ...], Dict] = {}

        for tile in self.tiles:
            tx, ty = tile["x"], tile["y"]

            for corner_index, (d1_idx, d2_idx) in enumerate(self._CORNER_DIR_IDXS):
                d1 = self._AXIAL_DIRS[d1_idx]
                d2 = self._AXIAL_DIRS[d2_idx]

                n1 = (tx + d1[0], ty + d1[1])
                n2 = (tx + d2[0], ty + d2[1])

                touching_coords = [(tx, ty)]
                if n1 in self._tile_map:
                    touching_coords.append(n1)
                if n2 in self._tile_map and n2 not in touching_coords:
                    touching_coords.append(n2)

                touching_coords_sorted = tuple(sorted(touching_coords))
                rep = (tx, ty, corner_index)

                existing = vertices_by_key.get(touching_coords_sorted)
                if existing is None or rep < existing["_rep"]:
                    vertices_by_key[touching_coords_sorted] = {
                        "_rep": rep,
                        "touching_coords": touching_coords_sorted,
                        "anchor_tile": (tx, ty),
                        "corner_index": corner_index,
                    }

        # Assign stable corner_id 0..N-1 (Catan base board typically has 54)
        keys_sorted = sorted(vertices_by_key.keys())
        vertices: List[Dict] = []
        for corner_id, key in enumerate(keys_sorted):
            v = vertices_by_key[key]
            touching_tiles = [self._tile_map[c] for c in v["touching_coords"]]

            vertices.append(
                {
                    "corner_id": int(corner_id),
                    "anchor_tile": v["anchor_tile"],
                    "corner_index": int(v["corner_index"]),
                    "touching_coords": v["touching_coords"],
                    "touching_tiles": touching_tiles,
                }
            )

        return vertices

    def _vertex_key_for_corner(self, tx: int, ty: int, corner_index: int) -> Tuple[Tuple[int, int], ...]:
        """Return the canonical vertex key (sorted touching tile coords) for a tile corner."""
        d1_idx, d2_idx = self._CORNER_DIR_IDXS[corner_index]
        d1 = self._AXIAL_DIRS[d1_idx]
        d2 = self._AXIAL_DIRS[d2_idx]

        n1 = (tx + d1[0], ty + d1[1])
        n2 = (tx + d2[0], ty + d2[1])

        touching_coords = [(tx, ty)]
        if n1 in self._tile_map:
            touching_coords.append(n1)
        if n2 in self._tile_map and n2 not in touching_coords:
            touching_coords.append(n2)

        return tuple(sorted(touching_coords))

    def _build_vertex_adjacency(self) -> Dict[int, List[int]]:
        """Build vertex adjacency graph as corner_id -> list[corner_id]."""
        key_to_corner_id: Dict[Tuple[Tuple[int, int], ...], int] = {
            tuple(sorted(v["touching_coords"])): int(v["corner_id"]) for v in self.vertices
        }

        adjacency: Dict[int, set[int]] = {int(v["corner_id"]): set() for v in self.vertices}

        for tile in self.tiles:
            tx, ty = tile["x"], tile["y"]
            for corner_index in range(6):
                a_key = self._vertex_key_for_corner(tx, ty, corner_index)
                b_key = self._vertex_key_for_corner(tx, ty, (corner_index + 1) % 6)
                a_id = key_to_corner_id.get(a_key)
                b_id = key_to_corner_id.get(b_key)
                if a_id is None or b_id is None or a_id == b_id:
                    continue
                adjacency[a_id].add(b_id)
                adjacency[b_id].add(a_id)

        return {k: sorted(list(v)) for k, v in adjacency.items()}

    def _vertex_xyz(self, anchor_x: int, anchor_y: int, corner_index: int) -> Tuple[int, int, int]:
        """Return a consistent integer x,y,z for this vertex in a doubled cube grid."""
        # Convert axial (q=x, r=y) -> cube (x, y, z) where x+y+z=0.
        cx = anchor_x
        cz = anchor_y
        cy = -cx - cz

        cx2, cy2, cz2 = 2 * cx, 2 * cy, 2 * cz
        ox, oy, oz = self._CORNER_CUBE_OFFSETS_2X[corner_index]
        return (cx2 + ox, cy2 + oy, cz2 + oz)
            
    def calculate_tile_value(self, resource: str, number: int) -> float:
        """
        Calculate the value of a single tile.
        Combines resource value with probability weight.
        """
        if pd.isna(number) or number == 0 or number == '':
            return 0
        
        try:
            number = int(number)
        except (ValueError, TypeError):
            return 0
        
        resource_val = self.RESOURCE_VALUE.get(resource, 0)
        prob_weight = self.PROBABILITY_WEIGHTS.get(number, 0)
        
        # Combined score: resource value * probability
        return resource_val * prob_weight
    
    def calculate_vertex_value(self, touching_tiles: List[Dict]) -> Dict:
        """
        Calculate total value of a settlement at a vertex.
        Takes the 3 tiles touching this vertex.
        """
        if len(touching_tiles) < 2:  # Need at least 2 tiles (edges) or 3 (interior)
            return None
        
        individual_values = []
        resources = []
        numbers = []
        
        for tile in touching_tiles:
            value = self.calculate_tile_value(tile['resource'], tile['number'])
            individual_values.append(value)
            resources.append(f"{tile['resource']} {tile['number']}" if tile['number'] > 0 else tile['resource'])
            if tile['number'] > 0:
                numbers.append(tile['number'])
        
        total_value = sum(individual_values)
        
        # Avoid division by zero
        avg_prob = np.mean([self.PROBABILITY_WEIGHTS.get(int(n), 0) for n in numbers if n > 0]) if numbers else 0
        
        return {
            'total_value': total_value,
            'individual_values': individual_values,
            'tiles': resources,
            'numbers': numbers,
            'diversity': len(set([t['resource'] for t in touching_tiles])),
            'avg_probability': avg_prob
        }
    
    def analyze_board(self) -> List[Dict]:
        """Analyze all settlement vertices, returning ranked recommendations."""
        settlements: List[Dict] = []

        for vertex in self.vertices:
            touching_tiles = vertex["touching_tiles"]
            if not touching_tiles:
                continue

            vertex_value = self.calculate_vertex_value(touching_tiles)
            if vertex_value is None:
                continue

            anchor_x, anchor_y = vertex["anchor_tile"]
            corner_index = vertex["corner_index"]
            vx, vy, vz = self._vertex_xyz(anchor_x, anchor_y, corner_index)

            settlements.append(
                {
                    "corner_id": vertex["corner_id"],
                    "anchor_tile_x": anchor_x,
                    "anchor_tile_y": anchor_y,
                    "corner_index": corner_index,
                    "x": vx,
                    "y": vy,
                    "z": vz,
                    "tile_count": len(touching_tiles),
                    **vertex_value,
                    "touching_tile_positions": vertex["touching_coords"],
                }
            )

        # Prefer true interior vertices (3 tiles) over edges (2) over corners (1)
        settlements.sort(
            key=lambda s: (
                -s["tile_count"],
                -s["total_value"],
                -s["diversity"],
                -s["avg_probability"],
            )
        )

        if settlements:
            best = settlements[0]
            print(
                "DEBUG: Best settlement "
                f"corner_id={best['corner_id']} anchor=({best['anchor_tile_x']},{best['anchor_tile_y']}) "
                f"corner_index={best['corner_index']} tiles={best['tiles']}"
            )

        return settlements