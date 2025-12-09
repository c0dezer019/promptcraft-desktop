import React, { useRef, useState } from 'react';

/**
 * Badge Component - Atomic Design
 */
export const Badge = ({ children, variant = 'default', className = '', onClick }) => {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    primary: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
    success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
    custom: 'bg-orange-100 text-orange-600',
  };

  const baseClasses = 'px-2 py-0.5 rounded text-xs font-medium';
  const clickableClasses = onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';

  return (
    <span
      className={`${baseClasses} ${variants[variant]} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </span>
  );
};

/**
 * Tag Component - Clickable badge for tag selection with context menu support
 */
export const Tag = ({
  children,
  onClick,
  onContextMenu,
  className = ''
}) => {
  const longPressTimerRef = useRef(null);
  const [isLongPress, setIsLongPress] = useState(false);

  const handleTouchStart = (e) => {
    setIsLongPress(false);
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPress(true);
      if (onContextMenu) {
        const touch = e.touches[0];
        const syntheticEvent = {
          preventDefault: () => e.preventDefault(),
          clientX: touch.clientX,
          clientY: touch.clientY,
        };
        onContextMenu(syntheticEvent);
      }
    }, 500); // 500ms long press duration
  };

  const handleTouchEnd = (e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (!isLongPress && onClick) {
      onClick(e);
    }
    setIsLongPress(false);
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    setIsLongPress(false);
  };

  const handleClick = (e) => {
    if (!isLongPress && onClick) {
      onClick(e);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={`text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-500 transition-all shadow-sm ${className}`}
    >
      {children}
    </button>
  );
};
