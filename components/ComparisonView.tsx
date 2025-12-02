import React, { useState } from 'react';
import { GeneratedImage } from '../types';

interface ComparisonViewProps {
  originalImage: string;
  generatedImage: GeneratedImage;
  themeColor?: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  originalImage,
  generatedImage,
  themeColor = 'indigo'
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
     const rect = e.currentTarget.getBoundingClientRect();
     const touch = e.touches[0];
     const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
     setSliderPosition((x / rect.width) * 100);
  };

  const generatedImageUrl = `data:${generatedImage.mimeType};base64,${generatedImage.data}`;

  const getColorClass = () => {
     switch(themeColor) {
        case 'blue': return 'text-blue-900 bg-blue-100';
        case 'teal': return 'text-teal-900 bg-teal-100';
        case 'emerald': return 'text-emerald-900 bg-emerald-100';
        case 'orange': return 'text-orange-900 bg-orange-100';
        case 'rose': return 'text-rose-900 bg-rose-100';
        default: return 'text-indigo-900 bg-indigo-100';
     }
  }

  return (
    // Absolute inset-0 guarantees it fills the parent container which now has explicit height
    <div className="absolute inset-0 w-full h-full select-none group touch-none"
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}
         onTouchMove={handleTouchMove}
    >
      {/* Original Image Layer */}
      <img 
        src={originalImage} 
        alt="Original" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />

      {/* Generated Image Layer (Clipped) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img 
          src={generatedImageUrl} 
          alt="Generated" 
          className="absolute inset-0 w-full h-full object-contain" 
        />
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-shadow z-20"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={() => setIsResizing(true)}
        onTouchEnd={() => setIsResizing(false)}
      >
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 ${getColorClass()} rounded-full shadow-xl flex items-center justify-center pointer-events-none transform transition-transform group-hover:scale-110`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)" />
          </svg>
        </div>
      </div>

      {/* Floating Labels */}
      <div className="absolute bottom-6 left-6 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium border border-white/10 shadow-lg z-10 pointer-events-none">Original</div>
      <div className={`absolute bottom-6 right-6 ${getColorClass()} px-4 py-2 rounded-full text-sm font-bold shadow-lg z-10 pointer-events-none`}>Design IA</div>
    </div>
  );
};