import { useState, useEffect } from 'react';
import { usePromptManager } from './lib/promptcraft-ui/hooks/usePromptManager.js';
import { useHistory } from './lib/promptcraft-ui/hooks/useHistory.js';
import { usePlatform } from './lib/promptcraft-ui/hooks/usePlatform.js';
import { useWorkflows } from './lib/promptcraft-ui/hooks/useWorkflows.js';
import { exportPromptToMarkdown, copyToClipboard, exportComfyWorkflow, exportA1111Text } from './lib/promptcraft-ui/utils/exportHelper.js';

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
import JobHistoryPanel from './components/features/JobHistoryPanel.jsx';

// Constants
import { DEFAULT_MODELS } from './constants/models.js';

// Utilities
import { hasAnyConfiguredTool } from './utils/localToolConfig.js';
import { loadAISettings } from './utils/aiApi.js';
import { invoke } from '@tauri-apps/api/core';
import { getItem } from './lib/promptcraft-ui/utils/storage.js';

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
  const [settingsInitialTab, setSettingsInitialTab] = useState(null);
  const [showImageAnalysis, setShowImageAnalysis] = useState(false);
  const [showSceneManager, setShowSceneManager] = useState(false);
  const [showJobHistory, setShowJobHistory] = useState(false);

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
  const { workflows, createWorkflow } = useWorkflows();

  // Current workflow ID (or create default workflow)
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [workflowInitialized, setWorkflowInitialized] = useState(false);

  // Initialize default workflow if needed
  useEffect(() => {
    if (!isDesktop || workflowInitialized) return;

    if (workflows.length === 0 && !currentWorkflowId) {
      // Create a default workflow on first load
      console.log('[App] Creating default workflow...');
      createWorkflow('Default Workflow', 'image', {}).then(workflow => {
        if (workflow) {
          console.log('[App] Default workflow created:', workflow.id);
          setCurrentWorkflowId(workflow.id);
          setWorkflowInitialized(true);
        }
      });
    } else if (workflows.length > 0 && !currentWorkflowId) {
      // Use the first workflow if we don't have one set
      console.log('[App] Using existing workflow:', workflows[0].id);
      setCurrentWorkflowId(workflows[0].id);
      setWorkflowInitialized(true);
    }
  }, [isDesktop, workflows, currentWorkflowId, workflowInitialized, createWorkflow]);

  // Sync API keys to backend on startup (desktop only)
  useEffect(() => {
    if (!isDesktop) return;

    const syncAPIKeys = async () => {
      // Sync enhancement provider API keys
      const enhancementProviders = ['anthropic', 'openai', 'gemini', 'minimax', 'venice'];

      for (const providerName of enhancementProviders) {
        try {
          const settings = await loadAISettings(providerName);
          if (settings && settings.key) {
            console.log(`[App] Syncing ${providerName} enhancement API key to backend`);
            await invoke('configure_provider', {
              provider: providerName,
              apiKey: settings.key,
            });
          }
        } catch (error) {
          console.error(`[App] Failed to sync ${providerName} enhancement API key:`, error);
        }
      }

      // Sync generation provider API keys
      try {
        const genSettings = await getItem('generation_providers', {});

        for (const [providerName, config] of Object.entries(genSettings)) {
          if (config.enabled && config.apiKey) {
            console.log(`[App] Syncing ${providerName} generation API key to backend`);
            await invoke('configure_provider', {
              provider: providerName,
              apiKey: config.apiKey,
            });
          }
        }
      } catch (error) {
        console.error('[App] Failed to sync generation provider API keys:', error);
      }
    };

    syncAPIKeys();
  }, [isDesktop]);

  // Platform detection logging
  useEffect(() => {
    console.log('[PromptCraft] Platform Detection:', {
      platform,
      isDesktop,
      isWeb
    });
  }, [platform, isDesktop, isWeb]);

  // Debug logging for workflow state
  useEffect(() => {
    console.log('[App] Workflow State:', {
      currentWorkflowId,
      workflowsCount: workflows.length,
      workflowInitialized,
      isDesktop
    });
  }, [currentWorkflowId, workflows, workflowInitialized, isDesktop]);

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

  // Use category as the prompt key to retain prompts across model switches
  const promptKey = activeCategory;

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

  // Sync prompt from previous category when switching categories
  const handleCategoryChange = (newCategory) => {
    const oldCategory = activeCategory;
    const oldPromptData = prompts[oldCategory];
    const newPromptData = prompts[newCategory];

    // If the new category has an empty prompt but old category has content, copy it over
    if (oldPromptData?.main && !newPromptData?.main) {
      updatePrompt(newCategory, 'main', oldPromptData.main);
      if (oldPromptData.modifiers?.length > 0) {
        updatePrompt(newCategory, 'modifiers', oldPromptData.modifiers);
      }
    }

    setActiveCategory(newCategory);
  };

  const handleImageAnalysisPrompt = (prompt) => {
    // When user selects a prompt from image analysis, set it for the image category
    if (activeCategory === 'image') {
      updatePrompt('image', 'main', prompt);
    } else {
      // Switch to image tab and set prompt
      setActiveCategory('image');
      updatePrompt('image', 'main', prompt);
    }
  };

  const handleLoadScene = (scene) => {
    // Load a scene from Scene Manager into the current builder
    const { data } = scene;
    if (!data) return;

    const { category, model, prompt } = data;

    // Load prompt data first - use category as the key
    if (prompt) {
      const targetPromptKey = category || activeCategory;
      if (prompt.main) updatePrompt(targetPromptKey, 'main', prompt.main);
      if (prompt.modifiers) updatePrompt(targetPromptKey, 'modifiers', prompt.modifiers);
      if (prompt.negative) updatePrompt(targetPromptKey, 'negative', prompt.negative);
      if (prompt.nodes) updatePrompt(targetPromptKey, 'nodes', prompt.nodes);
      if (prompt.params) updatePrompt(targetPromptKey, 'params', prompt.params);
    }

    // Set model if different
    if (model && category) {
      setSelectedModel(prev => ({
        ...prev,
        [category]: model
      }));
    }

    // Switch to appropriate category (do this last to avoid syncing old prompt)
    if (category && category !== activeCategory) {
      setActiveCategory(category);
    }

    // Close scene manager
    setShowSceneManager(false);
  };

  // Get current prompt data
  const currentPromptData = prompts[promptKey] || { main: '', modifiers: [] };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          setSettingsInitialTab(null);
        }}
        initialTab={settingsInitialTab}
      />

      {/* Image Analysis Modal */}
      <ImageAnalysis
        isOpen={showImageAnalysis}
        onClose={() => setShowImageAnalysis(false)}
        onGeneratePrompt={handleImageAnalysisPrompt}
      />

      {/* Top Navigation */}
      <TopNav
        activeCategory={activeCategory}
        setActiveCategory={handleCategoryChange}
        selectedModel={currentModel}
        setSelectedModel={handleModelChange}
        onImageAnalysis={() => setShowImageAnalysis(true)}
        onOpenSceneManager={() => setShowSceneManager(true)}
        onOpenJobHistory={() => setShowJobHistory(true)}
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

      {/* Job History Panel */}
      <JobHistoryPanel
        isOpen={showJobHistory}
        onClose={() => setShowJobHistory(false)}
        workflowId={null}
      />

      {/* Main Content */}
      <main className="pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto">
        {generationMode === 'cloud' ? (
          <>
            {/* Category: Image */}
            {activeCategory === 'image' && (
              <ImageBuilder
                model={currentModel}
                workflowId={currentWorkflowId || 'default'}
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
                onOpenSettings={() => {
                  setSettingsInitialTab('enhancement');
                  setShowSettings(true);
                }}
              />
            )}

            {/* Category: Video */}
            {activeCategory === 'video' && (
              <VideoBuilder
                model={currentModel}
                workflowId={currentWorkflowId || 'default'}
                prompt={currentPromptData.main || ''}
                setPrompt={(val) => updatePrompt(promptKey, 'main', val)}
                modifiers={currentPromptData.modifiers || []}
                setModifiers={(val) => updatePrompt(promptKey, 'modifiers', val)}
                deleteEnhancer={deleteEnhancer}
                editEnhancer={editEnhancer}
                syncEnhancer={syncEnhancerAcrossBuilders}
                onOpenSettings={() => {
                  setSettingsInitialTab('enhancement');
                  setShowSettings(true);
                }}
              />
            )}
          </>
        ) : (
          /* Local Generation Mode */
          hasAnyConfiguredTool() ? (
            <LocalImageBuilder
              selectedModel={selectedLocalModel}
              workflowId={currentWorkflowId}
              prompt={currentPromptData.main || ''}
              setPrompt={(val) => updatePrompt(activeCategory, 'main', val)}
              negativePrompt={currentPromptData.negative || ''}
              setNegativePrompt={(val) => updatePrompt(activeCategory, 'negative', val)}
              modifiers={currentPromptData.modifiers || []}
              setModifiers={(val) => updatePrompt(activeCategory, 'modifiers', val)}
              params={currentPromptData.params || {}}
              setParams={(val) => updatePrompt(activeCategory, 'params', val)}
              onOpenSettings={() => {
                setSettingsInitialTab('enhancement');
                setShowSettings(true);
              }}
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
