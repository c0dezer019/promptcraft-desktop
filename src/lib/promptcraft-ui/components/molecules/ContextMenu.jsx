import React, { useEffect, useRef } from 'react';
import { Trash2, Edit2, Copy } from 'lucide-react';

/**
 * ContextMenu Component
 * Provides a context menu for right-click and long-press interactions
 */
export const ContextMenu = ({
  isOpen,
  onClose,
  position,
  onDelete,
  onEdit,
  onSync,
  itemName
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems = [
    {
      label: 'Edit',
      icon: Edit2,
      onClick: () => {
        onEdit?.();
        onClose();
      },
      className: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
    },
    {
      label: 'Sync to All Builders',
      icon: Copy,
      onClick: () => {
        onSync?.();
        onClose();
      },
      className: 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => {
        onDelete?.();
        onClose();
      },
      className: 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
    }
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      {itemName && (
        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 font-medium">
          {itemName}
        </div>
      )}
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={item.onClick}
          className={`w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors ${item.className}`}
        >
          <item.icon size={14} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
