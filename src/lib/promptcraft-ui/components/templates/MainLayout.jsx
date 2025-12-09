import React from 'react';
import { Wand2, Settings, Sun, Zap, FileText, Trash2 } from 'lucide-react';
import { IconButton } from '../atoms';
import { Sidebar, MobileNav } from '../organisms';
import { NAV_ITEMS, TOOL_DESCRIPTIONS } from '../../constants/navItems';

/**
 * MainLayout Component - Template for the main app layout
 * @param {ReactNode} children - Main content
 * @param {string} activeTool - Current active tool
 * @param {function} setActiveTool - Tool setter
 * @param {Array} history - History items
 * @param {boolean} darkMode - Dark mode state
 * @param {function} toggleDarkMode - Dark mode toggle
 * @param {function} openSettings - Settings modal opener
 * @param {function} onExport - Export handler
 * @param {function} onClear - Clear handler
 */
export const MainLayout = ({
  children,
  activeTool,
  setActiveTool,
  history,
  darkMode,
  toggleDarkMode,
  openSettings,
  onExport,
  onClear
}) => {
  const currentTool = NAV_ITEMS.find(n => n.id === activeTool);
  const toolDescription = TOOL_DESCRIPTIONS[activeTool];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'} font-sans`}>
      {/* Top Bar */}
      <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 sm:px-6 fixed w-full top-0 z-30">
        <div className="flex items-center gap-2">
          <Wand2 className="text-indigo-500" size={24} />
          <h1 className="text-xl font-bold tracking-tight">
            Prompt<span className="text-indigo-500">Craft</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <IconButton icon={Settings} onClick={openSettings} title="Settings" />
          <IconButton icon={darkMode ? Sun : Zap} onClick={toggleDarkMode} />
        </div>
      </header>

      {/* Mobile Top Navigation Bar */}
      <MobileNav activeTool={activeTool} setActiveTool={setActiveTool} />

      {/* Main Layout */}
      <div className="pt-16 flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar activeTool={activeTool} setActiveTool={setActiveTool} history={history} />

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 pt-32 md:pt-8">
            <div className="max-w-6xl mx-auto">
              {/* Tool Header */}
              <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                    {currentTool?.label} Builder
                    <span className="text-sm font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2">
                      v1.0
                    </span>
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">
                    {toolDescription}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={onExport}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                    title="Export Documentation"
                  >
                    <FileText size={16} /> <span className="inline">Export</span>
                  </button>
                  <button
                    onClick={onClear}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 sm:border-transparent"
                    title="Clear All"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Builder Content */}
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
