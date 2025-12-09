import React from 'react';
import { NAV_ITEMS } from '../../../constants/navItems';

/**
 * MobileNav Component - Mobile navigation bar
 * @param {string} activeTool - Current active tool
 * @param {function} setActiveTool - Tool setter
 */
export const MobileNav = ({ activeTool, setActiveTool }) => {
  return (
    <nav className="md:hidden fixed top-16 w-full h-[60px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-20 flex justify-around items-center px-2 shadow-sm">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTool(item.id)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            activeTool === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <item.icon size={20} strokeWidth={activeTool === item.id ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
