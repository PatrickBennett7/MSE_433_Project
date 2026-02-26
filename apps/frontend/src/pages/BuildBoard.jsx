import React, { useState, useEffect } from 'react';
import { IoAdd } from 'react-icons/io5';
import TileForm from '../components/TileForm';
import './BuildBoard.css';

// Resource type colors - matching Catan board colors
const RESOURCE_COLORS = {
  'Desert': '#fbb17c',      // Brown/Orange
  'Wool': '#9ACD32',        // Yellow-Green
  'Grain': '#FFD700',       // Golden Yellow
  'Forest': '#0c6300',      // Dark Green
  'Ore': '#383838',         // Grey
  'Brick': '#da450a',       // Orange-Red
};

const RESOURCE_TYPES = ['Desert', 'Wool', 'Grain', 'Forest', 'Ore', 'Brick'];
const TILE_POSITIONS = [
  // Top row (y=2)
  { x: -2, y: 2 },
  { x: -1, y: 2 },
  { x: 0, y: 2 },
  // Second row (y=1)
  { x: -2, y: 1 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  // Middle row (y=0)
  { x: -2, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  // Fourth row (y=-1)
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 2, y: -1 },
  // Bottom row (y=-2)
  { x: 0, y: -2 },
  { x: 1, y: -2 },
  { x: 2, y: -2 },
];

const STORAGE_KEY = 'catan_board_config';

const BuildBoard = () => {
  const [tiles, setTiles] = useState(
    TILE_POSITIONS.map((pos) => ({
      ...pos,
      type: null,
      diceNumber: null,
    }))
  );
  const [selectedTile, setSelectedTile] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Resource limits: Forest, Wool, Grain, Ore, Brick, Desert
  const RESOURCE_LIMITS = {
    'Forest': 4,
    'Wool': 4,
    'Grain': 4,
    'Ore': 3,
    'Brick': 3,
    'Desert': 1,
  };

  // Number limits: 2 and 12 appear once, others appear twice
  const NUMBER_LIMITS = {
    2: 1,
    3: 2,
    4: 2,
    5: 2,
    6: 2,
    8: 2,
    9: 2,
    10: 2,
    11: 2,
    12: 1,
  };

  const getResourceCounts = () => {
    const counts = {
      'Forest': 0,
      'Wool': 0,
      'Grain': 0,
      'Ore': 0,
      'Brick': 0,
      'Desert': 0,
    };
    tiles.forEach((tile) => {
      if (tile.type) counts[tile.type]++;
    });
    return counts;
  };

  const getNumberCounts = () => {
    const counts = {};
    [2, 3, 4, 5, 6, 8, 9, 10, 11, 12].forEach((num) => {
      counts[num] = 0;
    });
    tiles.forEach((tile) => {
      if (tile.diceNumber && tile.diceNumber !== 0) {
        counts[tile.diceNumber]++;
      }
    });
    return counts;
  };

  const canAddResource = (resourceType, currentTileIndex) => {
    const counts = getResourceCounts();
    const currentTile = tiles[currentTileIndex];
    const currentResourceCount = currentTile.type ? 1 : 0;
    return counts[resourceType] - currentResourceCount < RESOURCE_LIMITS[resourceType];
  };

  const canAddNumber = (number, currentTileIndex) => {
    const counts = getNumberCounts();
    const currentTile = tiles[currentTileIndex];
    const currentNumberCount = currentTile.diceNumber === number ? 1 : 0;
    return counts[number] - currentNumberCount < NUMBER_LIMITS[number];
  };

  const handleTileClick = (index) => {
    setSelectedTile(index);
    setShowForm(true);
  };

  const handleSaveTile = (resourceType, diceNumber) => {
    if (selectedTile !== null) {
      // Validate constraints
      if (!canAddResource(resourceType, selectedTile)) {
        alert(`Cannot add more ${resourceType}. Limit: ${RESOURCE_LIMITS[resourceType]}`);
        return;
      }
      if (resourceType !== 'Desert' && !canAddNumber(diceNumber, selectedTile)) {
        alert(`Cannot add more tiles with number ${diceNumber}. Limit: ${NUMBER_LIMITS[diceNumber]}`);
        return;
      }

      const updatedTiles = [...tiles];
      updatedTiles[selectedTile].type = resourceType;
      updatedTiles[selectedTile].diceNumber = resourceType === 'Desert' ? 0 : diceNumber;
      setTiles(updatedTiles);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTiles));
    }
    setShowForm(false);
    setSelectedTile(null);
  };

  // Load saved board configuration on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    if (savedConfig) {
      try {
        const loadedData = JSON.parse(savedConfig);
        // Merge loaded data with tile positions to ensure positions are preserved
        const mergedTiles = TILE_POSITIONS.map((pos, index) => ({
          ...pos,
          type: loadedData[index]?.type || null,
          diceNumber: loadedData[index]?.diceNumber || null,
        }));
        setTiles(mergedTiles);
      } catch (error) {
        console.error('Failed to load saved board configuration:', error);
      }
    }
  }, []);

  // Save board configuration whenever tiles change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tiles));
  }, [tiles]);

  const handleExportBoard = () => {
    const boardConfig = tiles.map((tile) => ({
      x: tile.x,
      y: tile.y,
      type: tile.type || '',
      diceNumber: tile.diceNumber || '',
    }));
    const jsonStr = JSON.stringify(boardConfig, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonStr));
    element.setAttribute('download', 'board_config.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleClearBoard = () => {
    if (window.confirm('Are you sure you want to clear the board?')) {
      setTiles(
        TILE_POSITIONS.map((pos) => ({
          ...pos,
          type: null,
          diceNumber: null,
        }))
      );
    }
  };

  return (
    <div>
      <div className="board-container">
        <div className="board">
          {tiles.map((tile, index) => (
            <BuildTile
              key={index}
              tile={tile}
              index={index}
              onClick={handleTileClick}
            />
          ))}
        </div>
      </div>

      <div className="board-controls">
        <button onClick={handleExportBoard} className="btn btn-export">
          Export Board
        </button>
        <button onClick={handleClearBoard} className="btn btn-clear">
          Clear Board
        </button>
      </div>

      {showForm && selectedTile !== null && (
        <TileForm
          tile={tiles[selectedTile]}
          onSave={handleSaveTile}
          onCancel={() => {
            setShowForm(false);
            setSelectedTile(null);
          }}
          canAddResource={canAddResource}
          canAddNumber={canAddNumber}
          tileIndex={selectedTile}
          resourceCounts={getResourceCounts()}
          numberCounts={getNumberCounts()}
        />
      )}
    </div>
  );
};

const BuildTile = ({ tile, index, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const resourceColor = RESOURCE_COLORS[tile.type] || '#CCCCCC';

  let rowOffset = 0;
  if (tile.y === 2) {
    rowOffset = 1;
  } else if (tile.y === 1) {
    rowOffset = 0.5;
  } else if (tile.y === -1) {
    rowOffset = -0.5;
  } else if (tile.y === -2) {
    rowOffset = -1;
  }

  return (
    <div
      className="hex-tile"
      style={{
        '--hex-color': resourceColor,
        '--hex-x': tile.x + rowOffset,
        '--hex-y': tile.y,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(index)}
    >
      <div className="hex-inner">
        <div className="hex-content">
          {tile.type ? (
            <>
              <div className="resource-name">{tile.type}</div>
              {tile.diceNumber && tile.diceNumber !== 0 && (
                <div className="dice-number">{tile.diceNumber}</div>
              )}
            </>
          ) : (
            <div className="tile-add-icon">
              <IoAdd />
            </div>
          )}
        </div>
      </div>
      {isHovered && (
        <div className="hex-tooltip">
          <div>Position: ({tile.x}, {tile.y})</div>
          {tile.type && <div>Resource: {tile.type}</div>}
          {tile.diceNumber && <div>Dice: {tile.diceNumber}</div>}
        </div>
      )}
    </div>
  );
};

export default BuildBoard;
