import React, { useRef } from 'react';
import { Copy, Share2, ChevronDown } from 'lucide-react';
import { Button } from '../atoms';

/**
 * PromptFooter Component - Draggable footer with final output
 * @param {string} finalPromptText - Combined final prompt text
 * @param {number} footerHeight - Current footer height
 * @param {function} setFooterHeight - Height setter
 * @param {function} onCopy - Copy handler
 * @param {function} onShare - Share handler (optional)
 */
export const PromptFooter = ({
  finalPromptText,
  footerHeight,
  setFooterHeight,
  onCopy,
  onShare
}) => {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleTouchStart = (e) => {
    dragging.current = true;
    startY.current = e.touches[0].clientY;
    startHeight.current = footerHeight;
  };

  const handleTouchMove = (e) => {
    if (!dragging.current) return;
    const currentY = e.touches[0].clientY;
    const diff = startY.current - currentY;

    let newHeight = startHeight.current + diff;
    if (newHeight < 85) newHeight = 85;
    if (newHeight > window.innerHeight * 0.85) newHeight = window.innerHeight * 0.85;

    setFooterHeight(newHeight);
  };

  const handleTouchEnd = () => {
    dragging.current = false;
    if (footerHeight > 100 && footerHeight < 250) {
      setFooterHeight(250);
    } else if (footerHeight < 100) {
      setFooterHeight(85);
    }
  };

  const isCollapsed = window.innerWidth < 768 && typeof footerHeight === 'number' && footerHeight < 120;

  return (
    <div
      className={`border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-4 md:p-6 fixed md:absolute bottom-0 w-full z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] transition-all duration-300 md:h-auto`}
      style={window.innerWidth < 768 ? { height: `${footerHeight}px`, transition: dragging.current ? 'none' : 'height 0.3s ease-out' } : {}}
    >
      {/* Mobile Drag Handle */}
      <div
        className="md:hidden absolute top-0 left-0 w-full h-8 flex justify-center items-center cursor-grab active:cursor-grabbing z-30"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mt-4 md:mt-0 h-full">
        <div className="flex-1 w-full h-full flex flex-col relative">
          {/* Header Row: Label + Chevron */}
          <div className="relative h-6 w-full flex items-center md:block flex-shrink-0 mb-1">
            <label
              className={`text-xs font-bold text-gray-400 uppercase absolute transition-all duration-300 md:relative md:translate-x-0 ${
                isCollapsed ? 'left-1/2 -translate-x-1/2' : 'left-0 translate-x-0'
              }`}
            >
              Final Output
            </label>
            <span
              className={`md:hidden text-gray-400 absolute right-0 top-0 transition-opacity duration-300 ${
                isCollapsed ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <ChevronDown size={16} />
            </span>
          </div>

          {/* Collapsible Content Container */}
          <div
            className={`flex-1 font-mono text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-black/50 rounded-lg border border-gray-200 dark:border-gray-800 overflow-y-auto transition-all duration-300 ${
              isCollapsed ? 'opacity-0 h-0 pointer-events-none' : 'opacity-100 h-auto p-3'
            }`}
          >
            {finalPromptText || <span className="opacity-40">Start typing above to build your prompt...</span>}
          </div>

          {/* Hint Text when collapsed */}
          {isCollapsed && (
            <div className="absolute bottom-2 left-0 w-full text-center text-[10px] text-gray-400 animate-pulse">
              Swipe up to view
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className={`flex-shrink-0 flex gap-3 w-full md:w-auto transition-opacity duration-200 pb-safe md:pb-0 ${
            isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <Button
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2"
          >
            <Copy size={18} /> <span className="md:hidden lg:inline">Copy</span>
          </Button>
          {onShare && (
            <button className="flex-none p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <Share2 size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
