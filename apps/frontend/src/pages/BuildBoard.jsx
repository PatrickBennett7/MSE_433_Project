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
const PLACEMENT_STORAGE_KEY = 'catan_placement_state_v1';

const getBoardSignature = (tiles) => {
  // Keep it stable + compact; order is stable because TILE_POSITIONS is stable.
  return JSON.stringify(
    tiles.map((t) => ({ x: t.x, y: t.y, type: t.type || null, diceNumber: t.diceNumber ?? null }))
  );
};

const PLACEMENT_ORDER = [1, 2, 3, 4, 4, 3, 2, 1];

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
  const [playerNumber, setPlayerNumber] = useState(1);
  const [currentStep, setCurrentStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisCandidates, setAnalysisCandidates] = useState([]);
  const [analysisVertices, setAnalysisVertices] = useState([]);
  const [vertexAdjacency, setVertexAdjacency] = useState({});
  const [placementIndex, setPlacementIndex] = useState(0);
  const [placedSettlements, setPlacedSettlements] = useState([]); // [{placementIndex, player, cornerId, anchorTileX, anchorTileY, cornerIndex, xyz, label}]
  const [selectedSettlement, setSelectedSettlement] = useState(null); // selection for the current user's turn
  const [placementBoardSignature, setPlacementBoardSignature] = useState(null);

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

        // Load placement state only if it matches this exact board config
        const placementRaw = localStorage.getItem(PLACEMENT_STORAGE_KEY);
        const signature = getBoardSignature(mergedTiles);
        if (placementRaw) {
          try {
            const parsed = JSON.parse(placementRaw);
            if (parsed?.boardSignature === signature) {
              setPlacementBoardSignature(signature);
              setPlacementIndex(Number(parsed.placementIndex || 0));
              setPlacedSettlements(Array.isArray(parsed.placedSettlements) ? parsed.placedSettlements : []);
              setPlayerNumber(Number(parsed.playerNumber || 1));
            } else {
              setPlacementBoardSignature(signature);
            }
          } catch (e) {
            console.warn('Failed to load placement state:', e);
            setPlacementBoardSignature(signature);
          }
        } else {
          setPlacementBoardSignature(signature);
        }
      } catch (error) {
        console.error('Failed to load saved board configuration:', error);
      }
    }
  }, []);

  // Save board configuration whenever tiles change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tiles));
  }, [tiles]);

  // Persist placement state tied to the board signature
  useEffect(() => {
    try {
      const payload = {
        boardSignature: placementBoardSignature || getBoardSignature(tiles),
        placementIndex,
        placedSettlements,
        playerNumber,
      };
      localStorage.setItem(PLACEMENT_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to persist placement state:', e);
    }
  }, [placementIndex, placedSettlements, playerNumber, placementBoardSignature]);

  // Clear placement state when board changes
  useEffect(() => {
    if (!placementBoardSignature) return;
    const signature = getBoardSignature(tiles);
    if (signature !== placementBoardSignature && placedSettlements.length > 0) {
      setPlacedSettlements([]);
      setPlacementIndex(0);
      setSelectedSettlement(null);
      setPlacementBoardSignature(signature);
    }
  }, [tiles, placementBoardSignature, placedSettlements]);

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

  const serializeBoardToCSV = () => {
    /**
     * Converts the current board state to CSV format matching tiles_with_winner.csv
     * Format: x,y,resource_type,dice_number
     */
    let csv = 'x,y,resource_type,dice_number\n';
    
    tiles.forEach((tile) => {
      const resource = tile.type || '';
      const number = tile.diceNumber || '';
      csv += `${tile.x},${tile.y},${resource},${number}\n`;
    });
    
    return csv;
  };

  const handleAnalyzeBoard = async () => {
    const signature = getBoardSignature(tiles);
    setAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisCandidates([]);
    setAnalysisVertices([]);
    setVertexAdjacency({});
    setSelectedSettlement(null);
    // Start a fresh placement run for this analysis
    setPlacementBoardSignature(signature);
    setPlacedSettlements([]);
    setPlacementIndex(0);
    
    try {
      const boardCSV = serializeBoardToCSV();
      
      const response = await fetch('http://localhost:8000/api/analyze-board', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: boardCSV,
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      setAnalysisResult(result);

      if (Array.isArray(result.vertices)) {
        setAnalysisVertices(
          result.vertices.map((opt) => ({
            cornerId: opt.corner_id,
            anchorTileX: opt.anchor_tile_x,
            anchorTileY: opt.anchor_tile_y,
            cornerIndex: opt.corner_index,
            xyz: { x: opt.x, y: opt.y, z: opt.z },
            tiles: opt.tiles,
            label: opt.label,
          }))
        );
      }
      if (result.vertex_adjacency && typeof result.vertex_adjacency === 'object') {
        setVertexAdjacency(result.vertex_adjacency);
      }
      
      const sourceCandidates = Array.isArray(result.candidates) ? result.candidates : [];

      // Store a larger ranked candidate list; we'll filter to top 5 available per player.
      if (sourceCandidates.length > 0) {
        setAnalysisCandidates(
          sourceCandidates.map((opt, idx) => ({
            globalRank: idx + 1,
            cornerId: opt.corner_id,
            anchorTileX: opt.anchor_tile_x,
            anchorTileY: opt.anchor_tile_y,
            cornerIndex: opt.corner_index,
            xyz: { x: opt.x, y: opt.y, z: opt.z },
            tiles: opt.tiles,
            valueScore: opt.value_score,
            probability: opt.probability,
            diversity: opt.resource_diversity,
            tileCount: opt.tile_count,
            label: opt.label,
          }))
        );
      }
      
    } catch (error) {
      console.error('Error analyzing board:', error);
      setAnalysisResult({
        error: `Failed to analyze board: ${error.message}`,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const currentPlacingPlayer = placementIndex < PLACEMENT_ORDER.length ? PLACEMENT_ORDER[placementIndex] : null;
  const isUserTurn = currentPlacingPlayer === playerNumber;
  const placementComplete = placementIndex >= PLACEMENT_ORDER.length;

  const placedCountForPlayer = (player) => placedSettlements.filter((s) => s.player === player).length;
  const currentPlayerSettlementNumber = currentPlacingPlayer ? placedCountForPlayer(currentPlacingPlayer) + 1 : 0;

  const blockedCornerIds = new Set();
  placedSettlements.forEach((s) => {
    blockedCornerIds.add(s.cornerId);
    (vertexAdjacency?.[s.cornerId] || []).forEach((n) => blockedCornerIds.add(n));
  });

  const handlePlaceSettlementForCurrent = (vertex) => {
    if (placementComplete || !currentPlacingPlayer) return;
    if (blockedCornerIds.has(vertex.cornerId)) return;

    setPlacedSettlements((prev) => ([
      ...prev,
      {
        placementIndex,
        player: currentPlacingPlayer,
        cornerId: vertex.cornerId,
        anchorTileX: vertex.anchorTileX,
        anchorTileY: vertex.anchorTileY,
        cornerIndex: vertex.cornerIndex,
        xyz: vertex.xyz,
        label: vertex.label,
      },
    ]));
    setPlacementIndex((i) => i + 1);
  };

  const handleAcceptSettlement = (option) => {
    setSelectedSettlement(option);
  };

  const handleConfirmSettlement = () => {
    if (!selectedSettlement || placementComplete || !currentPlacingPlayer) return;

    if (blockedCornerIds.has(selectedSettlement.cornerId)) {
      alert('That location is too close to an existing settlement. Choose a vertex at least 2 away.');
      return;
    }

    setPlacedSettlements((prev) => ([
      ...prev,
      {
        placementIndex,
        player: currentPlacingPlayer,
        cornerId: selectedSettlement.cornerId,
        anchorTileX: selectedSettlement.anchorTileX,
        anchorTileY: selectedSettlement.anchorTileY,
        cornerIndex: selectedSettlement.cornerIndex,
        xyz: selectedSettlement.xyz,
        label: selectedSettlement.label,
      },
    ]));
    setSelectedSettlement(null);
    setPlacementIndex((i) => i + 1);
  };

  const resourceCounts = getResourceCounts();
  const numberCounts = getNumberCounts();
  const filledTiles = tiles.filter(t => t.type).length;
  const totalTiles = tiles.length;
  const isBoardComplete = filledTiles === totalTiles;

  const availableCandidates = analysisCandidates
    .filter((c) => !blockedCornerIds.has(c.cornerId))
    .slice(0, 5)
    .map((c, idx) => ({ ...c, displayRank: idx + 1 }));

  return (
    <div className="build-board-wrapper">
      <div className="board-section">
        {currentStep === 1 ? (
          <div className="step-header">
            <h2>Step 1 - Please build your catan board</h2>
          </div>
        ) : (
          <div className="step-header">
            <h2>Step 2 - Settlement Drop Order</h2>
          </div>
        )}

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
            {isUserTurn && !placementComplete && availableCandidates.map((opt) => (
              <SettlementMarker
                key={`${opt.cornerId}-${opt.displayRank}`}
                settlement={opt}
                label={
                  selectedSettlement?.cornerId === opt.cornerId ? 'YOU' : `${opt.displayRank}`
                }
                variant={selectedSettlement?.cornerId === opt.cornerId ? 'accepted' : 'candidate'}
              />
            ))}

            {placedSettlements.map((s) => (
              <SettlementMarker
                key={`placed-${s.placementIndex}-${s.cornerId}-p${s.player}`}
                settlement={s}
                label={`P${s.player}`}
                variant="confirmed"
              />
            ))}

            {!isUserTurn && !placementComplete && analysisVertices.length > 0 && (
              <>
                <div className="placement-overlay-hint">
                  Click a vertex to place Player {currentPlacingPlayer}
                </div>
                {analysisVertices
                  .filter((v) => !blockedCornerIds.has(v.cornerId))
                  .map((v) => (
                    <VertexHotspot
                      key={`hotspot-${v.cornerId}`}
                      vertex={v}
                      disabled={false}
                      onPick={() => handlePlaceSettlementForCurrent(v)}
                    />
                  ))}
              </>
            )}
          </div>
        </div>

        {currentStep === 1 && (
          <div className="board-controls">
            <button onClick={handleExportBoard} className="btn btn-export">
              Export Board
            </button>
            <button onClick={handleClearBoard} className="btn btn-clear">
              Clear Board
            </button>
            <button 
              onClick={() => setCurrentStep(2)} 
              className="btn btn-next"
              disabled={!isBoardComplete}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="analytics-section">
        {currentStep === 1 ? (
          <div className="analytics-panel">
            <h2>Board Analytics</h2>
            
            <div className="analytics-card">
              <h3>Progress</h3>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(filledTiles / totalTiles) * 100}%` }}
                />
              </div>
              <p className="progress-text">{filledTiles} / {totalTiles} tiles placed</p>
            </div>

            <div className="analytics-card">
              <h3>Resources</h3>
              <div className="resource-grid">
                {RESOURCE_TYPES.map((resource) => (
                  <div key={resource} className="resource-item">
                    <div 
                      className="resource-indicator" 
                      style={{ backgroundColor: RESOURCE_COLORS[resource] }}
                    />
                    <span className="resource-label">{resource}</span>
                    <span className="resource-count">
                      {resourceCounts[resource]} / {RESOURCE_LIMITS[resource]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <h3>Dice Numbers</h3>
              <div className="number-grid">
                {[2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map((num) => (
                  <div key={num} className="number-item">
                    <span className="number-label">{num}</span>
                    <span className="number-count">
                      {numberCounts[num]} / {NUMBER_LIMITS[num]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card recommendations">
              <h3>Recommendations</h3>
              <div className="recommendations-list">
                {filledTiles === 0 && (
                  <p className="recommendation">👉 Start by clicking a tile to add a resource</p>
                )}
                {Object.entries(resourceCounts).map(([resource, count]) => {
                  const limit = RESOURCE_LIMITS[resource];
                  if (count === limit) {
                    return (
                      <p key={resource} className="recommendation complete">
                        ✓ {resource} tiles completed ({count}/{limit})
                      </p>
                    );
                  }
                  if (count > 0 && count < limit) {
                    const remaining = limit - count;
                    return (
                      <p key={resource} className="recommendation in-progress">
                        {resource}: {remaining} more needed
                      </p>
                    );
                  }
                  return null;
                })}
                {filledTiles === totalTiles && (
                  <p className="recommendation complete">
                    🎉 Board complete!
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="settlement-section">
            <div className="player-selector">
              <label htmlFor="player-slider">Your Player:</label>
              <div className="slider-container">
                <input
                  id="player-slider"
                  type="range"
                  min="1"
                  max="4"
                  value={playerNumber}
                  onChange={(e) => {
                    setPlayerNumber(parseInt(e.target.value));
                    // reset the run when changing the user player
                    setPlacementIndex(0);
                    setPlacedSettlements([]);
                    setSelectedSettlement(null);
                  }}
                  className="player-slider"
                />
                <span className="player-display">Player {playerNumber}</span>
              </div>

              <div className="placement-instructions">
                Order: {PLACEMENT_ORDER.join('-')}
                <br />
                {placementComplete ? (
                  <>All settlements placed.</>
                ) : (
                  <>
                    Turn {placementIndex + 1} of {PLACEMENT_ORDER.length}: place <strong>Player {currentPlacingPlayer}</strong>
                    {currentPlayerSettlementNumber ? ` (settlement #${currentPlayerSettlementNumber})` : ''}.
                    <br />
                    {isUserTurn ? 'Recommendations are available for your turn.' : 'Click a vertex on the board to place this player.'}
                  </>
                )}

                <div style={{ marginTop: '0.6rem' }}>
                  <button
                    type="button"
                    className="btn btn-clear-placements"
                    onClick={() => {
                      setPlacedSettlements([]);
                      setPlacementIndex(0);
                      setSelectedSettlement(null);
                    }}
                  >
                    Reset placements
                  </button>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleAnalyzeBoard}
              disabled={analyzing}
              className="btn btn-analyze"
            >
              {analyzing ? 'Analyzing...' : '🔍 Analyze Board'}
            </button>
            
            {analysisResult && (
              <div className={`analysis-result ${analysisResult.error ? 'error' : 'success'}`}>
                {analysisResult.error ? (
                  <p className="error-message">{analysisResult.error}</p>
                ) : (
                  <div className="analysis-content">
                    <h4>Analysis Complete!</h4>
                    {analysisCandidates.length > 0 && isUserTurn && !placementComplete && (
                      <div className="top-settlements">
                        <h5>Top 5 Locations</h5>
                        <div className="top-settlements-list">
                          {availableCandidates.map((opt) => (
                            <div key={opt.cornerId} className="top-settlement-item">
                              <div className="top-settlement-main">
                                <div className="top-settlement-rank">#{opt.displayRank}</div>
                                <div className="top-settlement-info">
                                  <div className="top-settlement-label">{opt.label}</div>
                                  <div className="top-settlement-tiles">
                                    {opt.tiles?.join(', ')}
                                  </div>
                                  <div className="top-settlement-meta">
                                    Score: {opt.valueScore?.toFixed?.(4) ?? opt.valueScore} • Tiles: {opt.tileCount} • Diversity: {opt.diversity}
                                  </div>
                                </div>
                              </div>
                              <button
                                className="btn btn-accept"
                                onClick={() => handleAcceptSettlement(opt)}
                                disabled={blockedCornerIds.has(opt.cornerId)}
                              >
                                {selectedSettlement?.cornerId === opt.cornerId ? 'Selected' : 'Select'}
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          className="btn btn-confirm"
                          onClick={handleConfirmSettlement}
                          disabled={!selectedSettlement}
                        >
                          Confirm your settlement
                        </button>

                        {selectedSettlement && (
                          <div className="confirm-hint">
                            Selected: {selectedSettlement.label}
                          </div>
                        )}

                        {analysisCandidates.length > 0 && availableCandidates.length === 0 && (
                          <div className="confirm-hint">
                            No remaining top options (all filtered by confirmed/taken). Try re-analyzing.
                          </div>
                        )}
                      </div>
                    )}

                    {analysisCandidates.length > 0 && (!isUserTurn || placementComplete) && (
                      <div className="top-settlements">
                        <h5>{placementComplete ? 'Placement complete' : 'Not your turn'}</h5>
                        <div className="confirm-hint">
                          {placementComplete
                            ? 'All settlements are placed.'
                            : `Place Player ${currentPlacingPlayer} by clicking a vertex on the board.`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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

const SettlementMarker = ({ settlement, label, variant = 'candidate' }) => {
  // Place marker at an actual hex vertex.
  // Tiles are positioned at:
  //   left: (hexX * 18% + 50%), where hexX = tile.x + tile.y/2
  //   top:  (hexY * 15.5% + 50%), where hexY = tile.y
  // Vertex offsets are derived from the hex clip-path geometry.
  const rowOffset = settlement.anchorTileY / 2;
  const centerX = settlement.anchorTileX + rowOffset;
  const centerY = settlement.anchorTileY;

  const dx = 8 / 18; // 0.444444... in hexX units
  const dySmall = 4 / 15.5; // 0.258064... in hexY units
  const dyLarge = 8 / 15.5; // 0.516129... in hexY units

  const cornerOffsets = [
    { x: 0, y: -dyLarge },     // 0 top
    { x: dx, y: -dySmall },   // 1 top-right
    { x: dx, y: dySmall },    // 2 bottom-right
    { x: 0, y: dyLarge },     // 3 bottom
    { x: -dx, y: dySmall },   // 4 bottom-left
    { x: -dx, y: -dySmall },  // 5 top-left
  ];

  const c = cornerOffsets[settlement.cornerIndex] || cornerOffsets[0];
  const markerHexX = centerX + c.x;
  const markerHexY = centerY + c.y;
  
  return (
    <div
      className={`settlement-marker ${variant} ${settlement?.player ? `player-${settlement.player}` : ''}`}
      style={{
        '--hex-x': markerHexX,
        '--hex-y': markerHexY,
      }}
      title={`Settlement: corner ${settlement.cornerId} @ tile (${settlement.anchorTileX}, ${settlement.anchorTileY}) corner ${settlement.cornerIndex}`}
    >
      <div className="settlement-dot">
        <span className="settlement-dot-text">{label}</span>
      </div>
    </div>
  );
};

const VertexHotspot = ({ vertex, disabled, onPick }) => {
  // Must match SettlementMarker + BuildTile coordinate transform:
  // left: (hexX * 18% + 50%), where hexX = x + y/2
  // top:  (hexY * 15.5% + 50%), where hexY = y
  const rowOffset = vertex.anchorTileY / 2;
  const centerX = vertex.anchorTileX + rowOffset;
  const centerY = vertex.anchorTileY;

  const dx = 8 / 18; // 0.444444... in hexX units
  const dySmall = 4 / 15.5; // 0.258064... in hexY units
  const dyLarge = 8 / 15.5; // 0.516129... in hexY units

  const cornerOffsets = [
    { x: 0, y: -dyLarge },     // 0 top
    { x: dx, y: -dySmall },   // 1 top-right
    { x: dx, y: dySmall },    // 2 bottom-right
    { x: 0, y: dyLarge },     // 3 bottom
    { x: -dx, y: dySmall },   // 4 bottom-left
    { x: -dx, y: -dySmall },  // 5 top-left
  ];

  const c = cornerOffsets[vertex.cornerIndex] || cornerOffsets[0];
  const markerHexX = centerX + c.x;
  const markerHexY = centerY + c.y;

  return (
    <button
      type="button"
      className={`vertex-hotspot ${disabled ? 'disabled' : ''}`}
      style={{
        '--hex-x': markerHexX,
        '--hex-y': markerHexY,
      }}
      onClick={disabled ? undefined : onPick}
      title={disabled ? 'Too close to an existing settlement' : 'Click to place settlement'}
      aria-label="Place settlement here"
    />
  );
};

export default BuildBoard;
