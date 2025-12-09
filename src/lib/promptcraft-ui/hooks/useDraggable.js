import { useState, useEffect } from 'react';

/**
 * useDraggable Hook - Manages draggable footer height
 * @param {number} initialHeight - Initial height value
 * @returns {object} Height state and handlers
 */
export const useDraggable = (initialHeight = 85) => {
  const [footerHeight, setFooterHeight] = useState(initialHeight);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setFooterHeight('auto');
      } else {
        if (footerHeight === 'auto') setFooterHeight(initialHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [footerHeight, initialHeight]);

  return {
    footerHeight,
    setFooterHeight
  };
};
