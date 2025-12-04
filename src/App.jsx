import { useState, useEffect } from 'react';
import { MainLayout } from '@promptcraft/ui/components/templates/MainLayout.jsx';
import { DallEBuilder } from '@promptcraft/ui/components/organisms/DallEBuilder.jsx';
import { SDBuilder } from '@promptcraft/ui/components/organisms/SDBuilder/index.jsx';
import { usePromptManager } from '@promptcraft/ui/hooks/usePromptManager.js';
import { useDraggable } from '@promptcraft/ui/hooks/useDraggable.js';
import { useHistory } from '@promptcraft/ui/hooks/useHistory.js';
import { usePlatform } from '@promptcraft/ui/hooks/usePlatform.js';
import { exportPromptToMarkdown, copyToClipboard, exportComfyWorkflow, exportA1111Text } from '@promptcraft/ui/utils/exportHelper.js';

// Local overrides with updated models and removed Midjourney generation
import { SettingsModal } from './components/SettingsModal.jsx';
import { VideoBuilder } from './components/VideoBuilder.jsx';
import { GrokBuilder } from './components/GrokBuilder.jsx';
import { MidjourneyBuilder } from './components/MidjourneyBuilder.jsx';

/**
 * Main PromptCraft Application
 */
export default function PromptCraft() {
  const [activeTool, setActiveTool] = useState('sora');
  const [darkMode, setDarkMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

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
  const { footerHeight, setFooterHeight } = useDraggable(85);
  const { history, addToHistory } = useHistory();
  const { platform, isDesktop, isWeb } = usePlatform();

  // Platform detection logging
  useEffect(() => {
    console.log('[PromptCraft] Platform Detection:', {
      platform,
      isDesktop,
      isWeb,
      hasTauri: typeof window !== 'undefined' && !!window.__TAURI__
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

  // Handlers
  const handleCopy = async () => {
    const text = getCurrentPromptText(activeTool);
    const success = await copyToClipboard(text);
    if (success) {
      addToHistory(activeTool, text);
    }
  };

  const handleExport = () => {
    if (activeTool === 'comfy') {
      exportComfyWorkflow(prompts.comfy);
    } else if (activeTool === 'a1111') {
      exportA1111Text(prompts.a1111);
    } else {
      const text = getCurrentPromptText(activeTool);
      exportPromptToMarkdown(activeTool, prompts[activeTool], text);
    }
  };

  const handleClear = () => {
    clearPrompt(activeTool);
  };

  // Get final prompt text
  const finalPromptText = getCurrentPromptText(activeTool);

  return (
    <>
      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Main Layout */}
      <MainLayout
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        history={history}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
        openSettings={() => setShowSettings(true)}
        finalPromptText={finalPromptText}
        onCopy={handleCopy}
        onExport={handleExport}
        onClear={handleClear}
        footerHeight={footerHeight}
        setFooterHeight={setFooterHeight}
      >
        {/* Render appropriate builder based on active tool */}
        {activeTool === 'sora' && (
          <VideoBuilder
            type="sora"
            prompt={prompts.sora.main}
            setPrompt={(val) => updatePrompt('sora', 'main', val)}
            modifiers={prompts.sora.modifiers}
            setModifiers={(val) => updatePrompt('sora', 'modifiers', val)}
            deleteEnhancer={deleteEnhancer}
            editEnhancer={editEnhancer}
            syncEnhancer={syncEnhancerAcrossBuilders}
          />
        )}

        {activeTool === 'veo' && (
          <VideoBuilder
            type="veo"
            prompt={prompts.veo.main}
            setPrompt={(val) => updatePrompt('veo', 'main', val)}
            modifiers={prompts.veo.modifiers}
            setModifiers={(val) => updatePrompt('veo', 'modifiers', val)}
            deleteEnhancer={deleteEnhancer}
            editEnhancer={editEnhancer}
            syncEnhancer={syncEnhancerAcrossBuilders}
          />
        )}

        {activeTool === 'grok' && (
          <GrokBuilder
            prompt={prompts.grok.main}
            setPrompt={(val) => updatePrompt('grok', 'main', val)}
          />
        )}

        {activeTool === 'midjourney' && (
          <MidjourneyBuilder
            prompt={prompts.midjourney.main}
            setPrompt={(val) => updatePrompt('midjourney', 'main', val)}
            modifiers={prompts.midjourney.modifiers}
            setModifiers={(val) => updatePrompt('midjourney', 'modifiers', val)}
            deleteEnhancer={deleteEnhancer}
            editEnhancer={editEnhancer}
            syncEnhancer={syncEnhancerAcrossBuilders}
          />
        )}

        {activeTool === 'dalle' && (
          <DallEBuilder
            prompt={prompts.dalle?.main || ''}
            setPrompt={(val) => updatePrompt('dalle', 'main', val)}
          />
        )}

        {(activeTool === 'comfy' || activeTool === 'a1111') && (
          <SDBuilder
            type={activeTool}
            prompt={prompts[activeTool].main}
            setPrompt={(val) => updatePrompt(activeTool, 'main', val)}
            negativePrompt={prompts[activeTool].negative}
            setNegativePrompt={(val) => updatePrompt(activeTool, 'negative', val)}
            modifiers={prompts[activeTool].modifiers}
            setModifiers={(val) => updatePrompt(activeTool, 'modifiers', val)}
            nodes={prompts[activeTool].nodes}
            setNodes={(val) => updatePrompt(activeTool, 'nodes', val)}
            params={prompts[activeTool].params}
            setParams={(val) => updatePrompt(activeTool, 'params', val)}
            deleteEnhancer={deleteEnhancer}
            editEnhancer={editEnhancer}
            syncEnhancer={syncEnhancerAcrossBuilders}
          />
        )}
      </MainLayout>
    </>
  );
}
