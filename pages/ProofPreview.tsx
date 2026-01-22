
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  X, 
  Maximize, 
  Minimize,
  MousePointer2,
  Move
} from 'lucide-react';

const ProofPreview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const imageUrl = searchParams.get('url');
  
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset view
  const resetView = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      handleZoom(delta);
    }
  };

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p>No image URL provided.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="bg-black/60 backdrop-blur-md p-4 border-b border-white/10 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-black text-sm uppercase tracking-widest hidden sm:block">Verification Proof Viewer</h1>
          <div className="flex bg-white/10 rounded-lg p-1 gap-1">
            <button 
              onClick={() => handleZoom(0.25)}
              className="p-2 hover:bg-white/10 rounded text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={20} />
            </button>
            <button 
              onClick={() => handleZoom(-0.25)}
              className="p-2 hover:bg-white/10 rounded text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={20} />
            </button>
            <div className="w-[1px] bg-white/10 mx-1 self-stretch" />
            <button 
              onClick={handleRotate}
              className="p-2 hover:bg-white/10 rounded text-white transition-colors"
              title="Rotate 90°"
            >
              <RotateCw size={20} />
            </button>
            <button 
              onClick={resetView}
              className="p-2 hover:bg-white/10 rounded text-white transition-colors"
              title="Reset View"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a 
            href={imageUrl} 
            download 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-malawi-green hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
          >
            <Download size={16} /> <span className="hidden sm:inline">Download Original</span>
          </a>
          <button 
            onClick={() => window.close()}
            className="p-2 bg-white/10 hover:bg-malawi-red rounded-lg text-white transition-all"
            title="Close Tab"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div 
        ref={containerRef}
        className={`flex-grow relative flex items-center justify-center overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          className="transition-transform duration-75 ease-out"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)` 
          }}
        >
          <img 
            src={imageUrl} 
            alt="Proof Document" 
            className="max-w-[90vw] max-h-[85vh] shadow-2xl rounded-sm border border-white/5 pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Status indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full pointer-events-none text-[10px] font-bold text-white uppercase tracking-widest opacity-60">
          <span className="flex items-center gap-1"><MousePointer2 size={12} /> Drag to pan</span>
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span className="flex items-center gap-1"><ZoomIn size={12} /> Ctrl + Scroll to zoom</span>
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span>Zoom: {Math.round(scale * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default ProofPreview;
