import React from 'react';
import { History } from 'lucide-react';
import { NAV_ITEMS } from '../../../constants/navItems';

/**
 * Sidebar Component - Desktop navigation
 * @param {string} activeTool - Current active tool
 * @param {function} setActiveTool - Tool setter
 * @param {Array} history - History items
 */
export const Sidebar = ({ activeTool, setActiveTool, history = [] }) => {
  return (
    <aside className="hidden md:flex w-20 lg:w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col justify-between z-20">
      <div className="p-4 space-y-2">
        <p className="hidden lg:block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
          Builders
        </p>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTool(item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              activeTool === item.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <item.icon size={22} className={activeTool === item.id ? 'text-indigo-500' : item.color} />
            <span className="hidden lg:block font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* History Snippet (Sidebar Footer) */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 hidden lg:block">
        <div className="flex items-center gap-2 text-gray-400 mb-3">
          <History size={16} />
          <span className="text-xs font-semibold uppercase">Recent</span>
        </div>
        <div className="space-y-2">
          {history.length === 0 && <span className="text-xs text-gray-500 italic">No history yet.</span>}
          {history.slice(0, 3).map((h, i) => (
            <div key={i} className="text-xs text-gray-500 dark:text-gray-400 truncate hover:text-indigo-500 cursor-pointer">
              {h.text}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
