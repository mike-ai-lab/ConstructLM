import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Info } from 'lucide-react';
import { ImageRegion, gridToCoords } from '../CitationRenderer/utils/citationUtils';

interface ImageAnnotationViewerProps {
  fileName: string;
  region: ImageRegion | null;
  quote: string;
  imageUrl: string;
  onClose: () => void;
  allCitations?: Array<{ region: ImageRegion; quote: string }>;
}

export const ImageAnnotationViewer: React.FC<ImageAnnotationViewerProps> = ({
  fileName,
  region,
  quote,
  imageUrl,
  onClose,
  allCitations = []
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const getRegionCoords = (reg: ImageRegion | null) => {
    if (!reg) return null;
    
    if (reg.type === 'grid' && reg.zone) {
      return gridToCoords(reg.zone);
    } else if (reg.type === 'bbox') {
      return { x: reg.x!, y: reg.y!, w: reg.w!, h: reg.h! };
    }
    
    return null;
  };

  const coords = getRegionCoords(region);

  const handleNext = () => {
    if (allCitations.length > 1) {
      setCurrentIndex((currentIndex + 1) % allCitations.length);
    }
  };

  const handlePrev = () => {
    if (allCitations.length > 1) {
      setCurrentIndex((currentIndex - 1 + allCitations.length) % allCitations.length);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-6xl h-full flex flex-col relative group">
        
        {/* Main Canvas */}
        <div className="flex-1 bg-black rounded-[40px] shadow-2xl overflow-hidden relative border border-white/10 flex items-center justify-center">
          
          {/* Image Container */}
          <div className="relative max-w-[85%] max-h-[85%]" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }}>
            <img 
              src={imageUrl} 
              className="w-full h-full object-contain opacity-90" 
              alt={fileName} 
            />
            
            {/* Region Highlight Overlay */}
            {coords && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                <rect
                  x={`${coords.x}%`}
                  y={`${coords.y}%`}
                  width={`${coords.w}%`}
                  height={`${coords.h}%`}
                  className="fill-transparent stroke-indigo-400 transition-all duration-500"
                  strokeWidth="3"
                  rx="8"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.5))'
                  }}
                />
                
                {/* Label */}
                <foreignObject
                  x={`${coords.x}%`}
                  y={`${Math.max(0, coords.y - 6)}%`}
                  width="300"
                  height="40"
                >
                  <div className="bg-indigo-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter inline-block">
                    {quote.substring(0, 40)}{quote.length > 40 ? '...' : ''}
                  </div>
                </foreignObject>
              </svg>
            )}
          </div>

          {/* Top Controls */}
          <div className="absolute top-8 left-8 right-8 flex justify-between items-start pointer-events-none">
            {/* Info Card */}
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white max-w-xs pointer-events-auto">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Info size={12} />
                Spatial Context
              </h4>
              <p className="text-xs text-neutral-300 leading-snug">{quote}</p>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="w-12 h-12 bg-white/10 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-all pointer-events-auto"
            >
              <X size={20} />
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 pointer-events-auto bg-black/40 backdrop-blur-2xl p-2 rounded-full border border-white/10">
            
            {/* Navigation */}
            {allCitations.length > 1 && (
              <>
                <button 
                  onClick={handlePrev} 
                  className="w-10 h-10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="px-2 flex flex-col items-center">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Citation</span>
                  <span className="text-sm font-bold text-white leading-none tracking-tighter">
                    {currentIndex + 1} / {allCitations.length}
                  </span>
                </div>
                
                <button 
                  onClick={handleNext} 
                  className="w-10 h-10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              <button 
                onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} 
                className="w-8 h-8 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-white font-mono min-w-[45px] text-center">{Math.round(zoom * 100)}%</span>
              <button 
                onClick={() => setZoom(Math.min(3, zoom + 0.2))} 
                className="w-8 h-8 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Rotation */}
            <button 
              onClick={() => setRotation((rotation + 90) % 360)} 
              className="w-8 h-8 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all border-l border-white/10 ml-2 pl-2"
              title="Rotate 90°"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
