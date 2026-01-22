
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Move,
  RefreshCcw,
  Type
} from 'lucide-react';

const ProofPreview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const imageUrl = searchParams.get('url');
  
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFitMode, setIsFitMode] = useState(true);
  
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset view
  const resetView = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsFitMode(true);
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setScale(prev => {
      const newScale = Math.min(Math.max(prev + delta, 0.25), 8);
      if (newScale !== 1) setIsFitMode(false);
      return newScale;
    });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const toggleFit = () => {
    if (isFitMode) {
      setScale(2); // Zoom in to detail
      setIsFitMode(false);
    } else {
      resetView();
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '=' || e.key === '+') handleZoom(0.25);
      if (e.key === '-' || e.key === '_') handleZoom(-0.25);
      if (e.key === '0') resetView();
      if (e.key === 'r' || e.key === 'R') handleRotate();
      if (e.key === 'Escape') window.close();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoom, handleRotate, resetView]);

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
        <p>No verification document found.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-neutral-950 flex flex-col overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="bg-black/80 backdrop-blur-xl p-4 border-b border-white/5 z-50 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-malawi-green p-2 rounded-lg text-white">
              <ImageIcon size={20} />
            </div>
            <div>
              <h1 className="text-white font-black text-sm uppercase tracking-wider">Document Inspector</h1>
              <p className="text-gray-500 text-[9px] uppercase font-bold tracking-widest mt-0.5">Verification Mode Active</p>
            </div>
          </div>

          <div className="hidden lg:flex bg-white/5 rounded-xl p-1 gap-1 border border-white/5">
            <button 
              onClick={() => handleZoom(0.25)}
              className="p-2.5 hover:bg-white/10 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
              title="Zoom In (+)"
            >
              <ZoomIn size={20} />
            </button>
            <button 
              onClick={() => handleZoom(-0.25)}
              className="p-2.5 hover:bg-white/10 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
              title="Zoom Out (-)"
            >
              <ZoomOut size={20} />
            </button>
            <div className="w-[1px] bg-white/5 mx-1 self-stretch" />
            <button 
              onClick={handleRotate}
              className="p-2.5 hover:bg-white/10 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
              title="Rotate (R)"
            >
              <RotateCw size={20} />
            </button>
            <button 
              onClick={toggleFit}
              className={`p-2.5 rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${
                isFitMode ? 'bg-malawi-green text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Toggle View (0)"
            >
              {isFitMode ? <Minimize size={20} /> : <Maximize size={20} />}
              <span className="text-[10px] font-black uppercase tracking-tighter pr-1">{isFitMode ? '100%' : 'Fit'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a 
            href={imageUrl} 
            download="verification_proof" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/5 shadow-lg"
          >
            <Download size={16} /> 
            <span className="hidden sm:inline">Save Copy</span>
          </a>
          <button 
            onClick={() => window.close()}
            className="p-2.5 bg-malawi-red/20 hover:bg-malawi-red rounded-xl text-malawi-red hover:text-white transition-all shadow-lg border border-malawi-red/20"
            title="Close Preview (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div 
        ref={containerRef}
        className={`flex-grow relative flex items-center justify-center overflow-hidden transition-colors ${isDragging ? 'bg-neutral-900 cursor-grabbing' : 'bg-neutral-950 cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          className={`transition-transform duration-150 ${isDragging ? 'ease-linear' : 'ease-out'}`}
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)` 
          }}
        >
          <img 
            src={imageUrl} 
            alt="Proof Document" 
            className="max-w-[95vw] max-h-[85vh] shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-lg border-4 border-white/5 pointer-events-none ring-1 ring-white/10"
            draggable={false}
          />
        </div>

        {/* HUD Overlay */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-2xl border border-white/5 px-6 py-3 rounded-2xl pointer-events-none text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-2xl transition-all hover:opacity-100 opacity-60">
          <div className="flex items-center gap-2 text-malawi-green">
            <Move size={14} /> 
            <span>DRAG TO PAN</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div className="flex items-center gap-2 text-malawi-red">
            <ZoomIn size={14} /> 
            <span>CTRL + SCROLL</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
            <span className="text-gray-400">ZOOM:</span>
            <span className="text-white w-12 text-right">{Math.round(scale * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Re-using ImageIcon from internal lucide-react mapping if available, or providing fallback
const ImageIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);

export default ProofPreview;
