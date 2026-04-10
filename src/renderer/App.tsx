import React, { useState, useCallback } from 'react';
import './App.css';

// Node type definition
interface ColorNode {
  id: string;
  enabled: boolean;
  lift: [number, number, number];
  gamma: [number, number, number];
  gain: [number, number, number];
  offset: [number, number, number];
  contrast: number;
  pivot: number;
  saturation: number;
  temperature: number;
  tint: number;
}

// Create initial node
function createDefaultNode(id: string): ColorNode {
  return {
    id,
    enabled: true,
    lift: [0, 0, 0],
    gamma: [0, 0, 0],
    gain: [0, 0, 0],
    offset: [0, 0, 0],
    contrast: 0,
    pivot: 0.5,
    saturation: 1,
    temperature: 0,
    tint: 0
  };
}

function App() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [nodes, setNodes] = useState<ColorNode[]>([createDefaultNode('node1')]);
  const [activeNodeId, setActiveNodeId] = useState<string>('node1');
  const [isPlaying, setIsPlaying] = useState(false);

  const handleImportVideo = useCallback(async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.openVideoDialog();
      if (filePath) {
        setVideoSrc(`file://${filePath}`);
      }
    } else {
      // Fallback for development without electron
      console.log('Electron API not available');
    }
  }, []);

  const activeNode = nodes.find(n => n.id === activeNodeId) || nodes[0];

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>Chroma Node</h1>
        <button onClick={handleImportVideo} className="btn-import">
          Import Video
        </button>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* Video Viewer */}
        <div className="viewer-section">
          <div className="viewer">
            {videoSrc ? (
              <video
                src={videoSrc}
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <div className="viewer-placeholder">
                <p>No video loaded</p>
                <button onClick={handleImportVideo}>Import Video</button>
              </div>
            )}
          </div>
          {/* Playback controls */}
          <div className="playback-controls">
            <span>{videoSrc ? 'Video loaded' : 'No video'}</span>
          </div>
        </div>

        {/* Node Panel */}
        <div className="node-panel">
          <h2>Nodes</h2>
          <div className="node-list">
            {nodes.map((node, index) => (
              <div
                key={node.id}
                className={`node-item ${activeNodeId === node.id ? 'active' : ''}`}
                onClick={() => setActiveNodeId(node.id)}
              >
                <span className="node-name">Node {index + 1}</span>
                <button
                  className={`node-toggle ${node.enabled ? 'enabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNodes(nodes.map(n =>
                      n.id === node.id ? { ...n, enabled: !n.enabled } : n
                    ));
                  }}
                >
                  {node.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
          {nodes.length < 3 && (
            <button
              className="btn-add-node"
              onClick={() => {
                const newNode = createDefaultNode(`node${nodes.length + 1}`);
                setNodes([...nodes, newNode]);
              }}
            >
              Add Node
            </button>
          )}
        </div>

        {/* Controls Panel */}
        <div className="controls-panel">
          <h2>Primary Controls - {activeNode?.id.replace('node', 'Node ')}</h2>

          <div className="control-section">
            <h3>Color Wheels</h3>
            <div className="color-wheels">
              <div className="wheel-group">
                <label>Lift (Shadows)</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.lift[0] || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    const val = parseFloat(e.target.value);
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, lift: [val, val, val] }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="wheel-group">
                <label>Gamma (Midtones)</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.gamma[0] || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    const val = parseFloat(e.target.value);
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, gamma: [val, val, val] }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="wheel-group">
                <label>Gain (Highlights)</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.gain[0] || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    const val = parseFloat(e.target.value);
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, gain: [val, val, val] }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="wheel-group">
                <label>Offset</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.offset[0] || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    const val = parseFloat(e.target.value);
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, offset: [val, val, val] }
                        : n
                    ));
                  }}
                />
              </div>
            </div>
          </div>

          <div className="control-section">
            <h3>Basic Adjustments</h3>
            <div className="sliders">
              <div className="slider-group">
                <label>Contrast: {activeNode?.contrast.toFixed(2)}</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.contrast || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, contrast: parseFloat(e.target.value) }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Pivot: {activeNode?.pivot.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activeNode?.pivot || 0.5}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, pivot: parseFloat(e.target.value) }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Saturation: {activeNode?.saturation.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={activeNode?.saturation || 1}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, saturation: parseFloat(e.target.value) }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Temperature: {activeNode?.temperature.toFixed(2)}</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.temperature || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, temperature: parseFloat(e.target.value) }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Tint: {activeNode?.tint.toFixed(2)}</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.tint || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, tint: parseFloat(e.target.value) }
                        : n
                    ));
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;