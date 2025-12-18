import React from 'react';
import { Settings, Sun, Moon, ScanSearch, Palette, Grid3x3, History } from 'lucide-react';
import { TabBar } from './TabBar.jsx';
import { ModelSelector } from './ModelSelector.jsx';
import { LocalModelSelector } from './LocalModelSelector.jsx';
import { GenerationModeToggle } from './GenerationModeToggle.jsx';

/**
 * TopNav Component - Main top navigation bar
 * Replaces the vertical sidebar with a horizontal top nav
 */
export const TopNav = ({
  activeCategory,
  setActiveCategory,
  selectedModel,
  setSelectedModel,
  onImageAnalysis,
  darkMode,
  toggleDarkMode,
  openSettings,
  onOpenSceneManager,
  onOpenJobHistory,
  generationMode,
  setGenerationMode,
  selectedLocalModel,
  setSelectedLocalModel
}) => {
  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 fixed w-full top-0 z-30 bg-white dark:bg-gray-900 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
      <div className="flex items-center justify-between h-full px-2 sm:px-4 max-w-screen-2xl mx-auto gap-2 lg:gap-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
            PromptCraft
          </span>
        </div>

        {/* Center: Tab Bar + Generation Mode Toggle + Model Selector */}
        <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
          <TabBar
            activeCategory={activeCategory}
            onChange={setActiveCategory}
          />
          <GenerationModeToggle
            mode={generationMode}
            onChange={setGenerationMode}
          />
          {generationMode === 'cloud' ? (
            <ModelSelector
              category={activeCategory}
              value={selectedModel}
              onChange={setSelectedModel}
            />
          ) : (
            <LocalModelSelector
              value={selectedLocalModel}
              onChange={setSelectedLocalModel}
            />
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">

          {/* Scene Manager Button */}
          <button
            onClick={onOpenSceneManager}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            title="Scene Manager"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>

          {/* Job History Button */}
          {onOpenJobHistory && (
            <button
              onClick={onOpenJobHistory}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              title="Generation History"
            >
              <History className="w-5 h-5" />
            </button>
          )}

          {/* Image Analysis Button */}
          <button
            onClick={onImageAnalysis}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            title="Image Analysis"
          >
            <ScanSearch className="w-5 h-5" />
          </button>

          {/* Settings Button */}
          <button
            onClick={openSettings}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-amber-500"
            title={darkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
