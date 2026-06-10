import React, { useRef, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { API_BASE } from '../config';

export default function NetworkGraph({ profileData }) {
  const fgRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGraphData() {
      try {
        const response = await fetch(`${API_BASE}/api/graph`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_data: profileData }),
        });
        const data = await response.json();
        setGraphData({ nodes: data.nodes, links: data.edges });
      } catch (err) {
        console.error("Failed to fetch graph data", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (profileData) {
      fetchGraphData();
    }
  }, [profileData]);

  // Make the graph slowly rotate
  useEffect(() => {
    if (!fgRef.current) return;
    
    // Set initial camera position
    fgRef.current.cameraPosition({ x: 0, y: 0, z: 300 });

    let angle = 0;
    const interval = setInterval(() => {
      if (fgRef.current) {
        angle += 0.005; // orbit speed
        fgRef.current.cameraPosition({
          x: 300 * Math.sin(angle),
          z: 300 * Math.cos(angle),
          y: 100 * Math.sin(angle * 0.5)
        });
      }
    }, 30);

    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-cyan-400">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <span className="ml-3 font-mono text-sm tracking-widest uppercase">Building Nexus Graph...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#020a18] rounded-xl overflow-hidden border border-cyan-900/30">
      
      {/* Decorative overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-cyan-400 font-mono text-sm tracking-widest font-bold">NEXUS ALIAS GRAPH</h3>
        <p className="text-cyan-600/70 text-xs font-mono mt-1">
          {graphData.nodes.length} Nodes • {graphData.links.length} Edges
        </p>
      </div>

      <div className="absolute inset-0 z-0">
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          backgroundColor="#020a18"
          nodeColor={node => node.color || '#fff'}
          nodeLabel={node => `${node.type.toUpperCase()}: ${node.label}`}
          nodeVal={node => node.size || 10}
          nodeResolution={16}
          linkColor={link => link.dashed ? '#6b7280' : '#38bdf8'}
          linkWidth={link => link.strength ? link.strength * 2 : 1}
          linkResolution={8}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleSpeed={d => d.strength * 0.01}
          nodeThreeObject={node => {
            // Optional: customize specific node types
            if (node.type === 'suspect') {
              const group = new THREE.Group();
              const core = new THREE.Mesh(
                new THREE.SphereGeometry(12, 16, 16),
                new THREE.MeshBasicMaterial({ color: '#00ffff' })
              );
              const wireframe = new THREE.Mesh(
                new THREE.SphereGeometry(16, 16, 16),
                new THREE.MeshBasicMaterial({ color: '#00ffff', wireframe: true, transparent: true, opacity: 0.3 })
              );
              group.add(core);
              group.add(wireframe);
              return group;
            }
            if (node.type === 'email_breach') {
               const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(10, 10, 10),
                new THREE.MeshBasicMaterial({ color: '#ef4444' })
               );
               return mesh;
            }
            return false; // use default sphere
          }}
          enableNodeDrag={true}
          enableNavigationControls={true}
          showNavInfo={false}
        />
      </div>
    </div>
  );
}
