import React, { useState, useMemo } from 'react';
import { ALL_MERGED_NODES, type NodeCatalogEntry } from '../../../backend/nodes/allNodes.js';

export interface NodePaletteProps {
  onAddNode: (type: string, clientX?: number, clientY?: number) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return ALL_MERGED_NODES;
    const q = searchQuery.toLowerCase();
    return ALL_MERGED_NODES.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const categories = useMemo(() => {
    const cats: Record<string, NodeCatalogEntry[]> = {};
    for (const node of filteredNodes) {
      if (!cats[node.category]) {
        cats[node.category] = [];
      }
      cats[node.category].push(node);
    }
    return cats;
  }, [filteredNodes]);

  return (
    <aside className="node-palette" id="node-palette">
      <div className="palette-search">
        <input
          id="palette-search-input"
          type="text"
          className="search-input"
          placeholder="Search 109 Rivet nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="palette-category-list" id="palette-category-list">
        {Object.entries(categories).map(([catName, nodes]) => (
          <div key={catName} className="palette-category">
            <div className="category-header">{catName} ({nodes.length})</div>
            {nodes.map((node) => (
              <div
                key={node.type}
                id={`palette-item-${node.type}`}
                className="palette-node-item"
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', node.type);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onAddNode(node.type)}
                title={node.description}
              >
                <span>{node.title}</span>
                <span className="palette-node-add">+</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
};
