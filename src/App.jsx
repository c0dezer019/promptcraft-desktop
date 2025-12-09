import { useState, useEffect } from 'react';
import { usePromptManager } from '@promptcraft/ui/hooks/usePromptManager.js';
import { useHistory } from '@promptcraft/ui/hooks/useHistory.js';
import { usePlatform } from '@promptcraft/ui/hooks/usePlatform.js';
import { exportPromptToMarkdown, copyToClipboard, exportComfyWorkflow, exportA1111Text } from '@promptcraft/ui/utils/exportHelper.js';

// Navigation components
import { TopNav } from './components/navigation/TopNav.jsx';

// Builder components
import { ImageBuilder } from './components/builders/ImageBuilder.jsx';
import { VideoBuilder } from './components/VideoBuilder.jsx';
import { LocalImageBuilder } from './components/builders/LocalImageBuilder.jsx';

// Feature components
import { ImageAnalysis } from './components/features/ImageAnalysis.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { SceneManager } from './components/features/SceneManager.jsx';
import { LocalEmptyState } from './components/features/LocalEmptyState.jsx';
import { LocalToolSetup } from './components/features/LocalToolSetup.jsx';

// Constants
import { DEFAULT_MODELS } from './constants/models.js';

// Utilities
import { hasAnyConfiguredTool } from './utils/localToolConfig.js';

/**
 * Main PromptCraft Application
 * Redesigned with top navigation and Image/Video tabs
 */
export default function PromptCraft() {
  // Navigation state
  const [activeCategory, setActiveCategory] = useState('image');
  const [selectedModel, setSelectedModel] = useState({
    image: DEFAULT_MODELS.image,
    video: DEFAULT_MODELS.video
  });

  // Local model state
  const [selectedLocalModel, setSelectedLocalModel] = useState(() => {
    return localStorage.getItem('selected_local_model') || null;
  });

  // UI state
  const [darkMode, setDarkMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showImageAnalysis, setShowImageAnalysis] = useState(false);
  const [showSceneManager, setShowSceneManager] = useState(false);

  // Generation mode state (cloud vs local)
  const [generationMode, setGenerationMode] = useState(() => {
    return localStorage.getItem('generation_mode') || 'cloud';
  });
  const [showLocalToolSetup, setShowLocalToolSetup] = useState(false);

  // Custom Hooks
  const {
    prompts,
    updatePrompt,
    clearPrompt,
    getCurrentPromptText,
    deleteEnhancer,
    editEnhancer,
    syncEnhancerAcrossBuilders
  } = usePromptManager();
  const { history, addToHistory } = useHistory();
  const { platform, isDesktop, isWeb } = usePlatform();

  // Platform detection logging
  useEffect(() => {
    console.log('[PromptCraft] Platform Detection:', {
      platform,
      isDesktop,
      isWeb
    });
  }, [platform, isDesktop, isWeb]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Save generation mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('generation_mode', generationMode);
  }, [generationMode]);

  // Save selected local model to localStorage when it changes
  useEffect(() => {
    if (selectedLocalModel) {
      localStorage.setItem('selected_local_model', selectedLocalModel);
    }
  }, [selectedLocalModel]);

  // Get current model for active category
  const currentModel = selectedModel[activeCategory];

  // Get prompt key based on model (map models to prompt storage keys)
  const getPromptKey = (model) => {
    // Map model IDs to prompt storage keys
    const modelToKey = {
      // Image models
      'gpt-image-1-mini': 'dalle',
      'gpt-image-1': 'dalle',
      'grok-2-image': 'grok',
      'aurora': 'grok',
      'comfy': 'comfy',
      'a1111': 'a1111',
      'midjourney': 'midjourney',
      // Video models - OpenAI
      'sora': 'sora',
      'sora-2-pro': 'sora',
      // Video models - Google
      'veo': 'veo',
      'veo-3.1-generate-preview': 'veo',
      // Video models - Runway
      'runway-gen3-alpha': 'runway',
      'runway-gen3-alpha-turbo': 'runway',
      // Video models - Luma
      'luma-ray': 'luma',
      'luma-dream-machine': 'luma',
      // Video models - Hailuo
      'hailuo-minimax': 'hailuo',
    };
    return modelToKey[model] || model;
  };

  const promptKey = getPromptKey(currentModel);

  // Handlers
  const handleCopy = async () => {
    const text = getCurrentPromptText(promptKey);
    const success = await copyToClipboard(text);
    if (success) {
      addToHistory(promptKey, text);
    }
  };

  const handleExport = () => {
    if (currentModel === 'comfy') {
      exportComfyWorkflow(prompts.comfy);
    } else if (currentModel === 'a1111') {
      exportA1111Text(prompts.a1111);
    } else {
      const text = getCurrentPromptText(promptKey);
      exportPromptToMarkdown(promptKey, prompts[promptKey], text);
    }
  };

  const handleClear = () => {
    clearPrompt(promptKey);
  };

  const handleModelChange = (model) => {
    setSelectedModel(prev => ({
      ...prev,
      [activeCategory]: model
    }));
  };

  const handleImageAnalysisPrompt = (prompt) => {
    // When user selects a prompt from image analysis, set it for the current image model
    if (activeCategory === 'image') {
      updatePrompt(promptKey, 'main', prompt);
    } else {
      // Switch to image tab and set prompt
      setActiveCategory('image');
      const imagePromptKey = getPromptKey(selectedModel.image);
      updatePrompt(imagePromptKey, 'main', prompt);
    }
  };

  const handleLoadScene = (scene) => {
    // Load a scene from Scene Manager into the current builder
    const { data } = scene;
    if (!data) return;

    const { category, model, prompt } = data;

    // Switch to appropriate category
    if (category) {
      setActiveCategory(category);
    }

    // Set model if different
    if (model && category) {
      setSelectedModel(prev => ({
        ...prev,
        [category]: model
      }));
    }

    // Load prompt data
    if (prompt) {
      const targetPromptKey = getPromptKey(model || currentModel);
      if (prompt.main) updatePrompt(targetPromptKey, 'main', prompt.main);
      if (prompt.modifiers) updatePrompt(targetPromptKey, 'modifiers', prompt.modifiers);
      if (prompt.negative) updatePrompt(targetPromptKey, 'negative', prompt.negative);
      if (prompt.nodes) updatePrompt(targetPromptKey, 'nodes', prompt.nodes);
      if (prompt.params) updatePrompt(targetPromptKey, 'params', prompt.params);
    }

    // Close scene manager
    setShowSceneManager(false);
  };

  // Get current prompt data
  const currentPromptData = prompts[promptKey] || { main: '', modifiers: [] };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Image Analysis Modal */}
      <ImageAnalysis
        isOpen={showImageAnalysis}
        onClose={() => setShowImageAnalysis(false)}
        onGeneratePrompt={handleImageAnalysisPrompt}
      />

      {/* Top Navigation */}
      <TopNav
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        selectedModel={currentModel}
        setSelectedModel={handleModelChange}
        onImageAnalysis={() => setShowImageAnalysis(true)}
        onOpenSceneManager={() => setShowSceneManager(true)}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
        openSettings={() => setShowSettings(true)}
        generationMode={generationMode}
        setGenerationMode={setGenerationMode}
        selectedLocalModel={selectedLocalModel}
        setSelectedLocalModel={setSelectedLocalModel}
      />

      {/* Scene Manager */}
      {showSceneManager && (
        <SceneManager
          onLoadScene={handleLoadScene}
          onClose={() => setShowSceneManager(false)}
        />
      )}

      {/* Local Tool Setup Modal */}
      <LocalToolSetup
        isOpen={showLocalToolSetup}
        onClose={() => setShowLocalToolSetup(false)}
      />

      {/* Main Content */}
      <main className="pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto">
        {generationMode === 'cloud' ? (
          <>
            {/* Category: Image */}
            {activeCategory === 'image' && (
              <ImageBuilder
                model={currentModel}
                prompt={currentPromptData.main || ''}
                setPrompt={(val) => updatePrompt(promptKey, 'main', val)}
                modifiers={currentPromptData.modifiers || []}
                setModifiers={(val) => updatePrompt(promptKey, 'modifiers', val)}
                negativePrompt={currentPromptData.negative || ''}
                setNegativePrompt={(val) => updatePrompt(promptKey, 'negative', val)}
                nodes={currentPromptData.nodes || []}
                setNodes={(val) => updatePrompt(promptKey, 'nodes', val)}
                params={currentPromptData.params || {}}
                setParams={(val) => updatePrompt(promptKey, 'params', val)}
                deleteEnhancer={deleteEnhancer}
                editEnhancer={editEnhancer}
                syncEnhancer={syncEnhancerAcrossBuilders}
              />
            )}

            {/* Category: Video */}
            {activeCategory === 'video' && (
              <VideoBuilder
                model={currentModel}
                prompt={currentPromptData.main || ''}
                setPrompt={(val) => updatePrompt(promptKey, 'main', val)}
                modifiers={currentPromptData.modifiers || []}
                setModifiers={(val) => updatePrompt(promptKey, 'modifiers', val)}
                deleteEnhancer={deleteEnhancer}
                editEnhancer={editEnhancer}
                syncEnhancer={syncEnhancerAcrossBuilders}
              />
            )}
          </>
        ) : (
          /* Local Generation Mode */
          hasAnyConfiguredTool() ? (
            <LocalImageBuilder
              selectedModel={selectedLocalModel}
              prompt={currentPromptData.main || ''}
              setPrompt={(val) => updatePrompt('local', 'main', val)}
              negativePrompt={currentPromptData.negative || ''}
              setNegativePrompt={(val) => updatePrompt('local', 'negative', val)}
            />
          ) : (
            <LocalEmptyState onConfigure={() => setShowLocalToolSetup(true)} />
          )
        )}
      </main>

      {/* Footer Bar with Actions */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-3 px-4 z-20">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="hidden sm:inline">Model: </span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {currentModel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Export
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Copy Prompt
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
