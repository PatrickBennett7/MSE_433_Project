import React, { useState, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import './TileForm.css';

const RESOURCE_TYPES = ['Desert', 'Wool', 'Grain', 'Forest', 'Ore', 'Brick'];
const RESOURCE_LIMITS = {
  'Forest': 4,
  'Wool': 4,
  'Grain': 4,
  'Ore': 3,
  'Brick': 3,
  'Desert': 1,
};
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

const TileForm = ({
  tile,
  onSave,
  onCancel,
  canAddResource,
  canAddNumber,
  tileIndex,
  resourceCounts,
  numberCounts,
}) => {
  const [resourceType, setResourceType] = useState(tile.type || 'Wool');
  const [diceNumber, setDiceNumber] = useState(tile.diceNumber || '6');

  useEffect(() => {
    // If Desert is selected, set number to 0
    if (resourceType === 'Desert') {
      setDiceNumber(0);
    }
  }, [resourceType]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(resourceType, diceNumber);
  };

  const getAvailableResources = () => {
    return RESOURCE_TYPES.filter((resource) => canAddResource(resource, tileIndex));
  };

  const getAvailableNumbers = () => {
    if (resourceType === 'Desert') return [];
    return [2, 3, 4, 5, 6, 8, 9, 10, 11, 12].filter((num) =>
      canAddNumber(num, tileIndex)
    );
  };

  const getResourceCountDisplay = (resource) => {
    const used = resourceCounts[resource];
    const limit = RESOURCE_LIMITS[resource];
    return `${used}/${limit}`;
  };

  const getNumberCountDisplay = (number) => {
    const used = numberCounts[number];
    const limit = NUMBER_LIMITS[number];
    return `${used}/${limit}`;
  };

  const availableResources = getAvailableResources();
  const availableNumbers = getAvailableNumbers();
  const isResourceDisabled = !availableResources.includes(resourceType);
  const isNumberDisabled = resourceType !== 'Desert' && !availableNumbers.includes(parseInt(diceNumber));

  return (
    <div className="tile-form-overlay" onClick={onCancel}>
      <div className="tile-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tile-form-header">
          <h2>Edit Tile</h2>
          <button className="close-btn" onClick={onCancel}>
            <IoClose />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="resource">
              Resource Type: <span className="count">{getResourceCountDisplay(resourceType)}</span>
            </label>
            <select
              id="resource"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
            >
              {RESOURCE_TYPES.map((resource) => (
                <option key={resource} value={resource} disabled={!availableResources.includes(resource)}>
                  {resource} ({getResourceCountDisplay(resource)})
                </option>
              ))}
            </select>
          </div>

          {resourceType !== 'Desert' && (
            <div className="form-group">
              <label htmlFor="dice">
                Dice Number: <span className="count">{getNumberCountDisplay(parseInt(diceNumber))}</span>
              </label>
              <select
                id="dice"
                value={diceNumber}
                onChange={(e) => setDiceNumber(e.target.value)}
              >
                {[2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map((num) => (
                  <option key={num} value={num} disabled={!availableNumbers.includes(num)}>
                    {num} ({getNumberCountDisplay(num)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {resourceType === 'Desert' && (
            <div className="form-group info-message">
              <p>Desert tiles have no dice number (always 0)</p>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-save"
              disabled={isResourceDisabled || (resourceType !== 'Desert' && isNumberDisabled)}
            >
              Save Tile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TileForm;
