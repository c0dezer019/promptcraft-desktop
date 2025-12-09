import React, { useState, useEffect } from 'react';
import { X, Settings, Globe, Shield, Server, Sparkles, Image, Video } from 'lucide-react';
import { Button } from '../atoms';
import { loadAISettings, saveAISettings } from '../../utils/aiApi';
import { usePlatform } from '../../hooks/usePlatform.js';
import { getItem, setItem } from '../../utils/storage.js';
import { invoke } from '../../utils/tauri.js';

/**
 * SettingsModal Component - AI Provider Configuration
 */
export const SettingsModal = ({ isOpen, onClose }) => {
  const { isDesktop } = usePlatform();
  const [activeTab, setActiveTab] = useState('enhancement');

  // Enhancement settings (existing)
  const [provider, setProvider] = useState('gemini');
  const [key, setKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [saved, setSaved] = useState(false);

  // Generation settings (new)
  const [genProviders, setGenProviders] = useState({
    openai: { enabled: false, apiKey: '' },
    google: { enabled: false, apiKey: '' },
    midjourney: { enabled: false, apiKey: '' },
    grok: { enabled: false, apiKey: '' }
  });
  const [genSaved, setGenSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load settings asynchronously
      (async () => {
        // Load enhancement settings
        const settings = await loadAISettings();
        setProvider(settings.provider || 'gemini');
        setKey(settings.key || '');
        setModel(settings.model || '');
        setBaseUrl(settings.baseUrl || '');

        // Load generation settings
        const genSettings = await getItem('generation_providers', {});
        setGenProviders({
          openai: genSettings.openai || { enabled: false, apiKey: '' },
          google: genSettings.google || { enabled: false, apiKey: '' },
          midjourney: genSettings.midjourney || { enabled: false, apiKey: '' },
          grok: genSettings.grok || { enabled: false, apiKey: '' }
        });

        // Set tab based on desktop mode
        if (isDesktop) {
          setActiveTab('generation');
        }
      })();
    }
  }, [isOpen, isDesktop]);

  const handleSave = async () => {
    await saveAISettings({ provider, key, model, baseUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenSave = async () => {
    // Save to storage (works for both web and desktop)
    await setItem('generation_providers', genProviders);

    // If in desktop mode, send to Tauri backend
    if (isDesktop) {
      try {
        // Configure each enabled provider
        for (const [providerName, config] of Object.entries(genProviders)) {
          if (config.enabled && config.apiKey) {
            await invoke('configure_provider', {
              provider: providerName,
              apiKey: config.apiKey
            });
          }
        }
      } catch (error) {
        console.error('Failed to configure providers:', error);
      }
    }

    setGenSaved(true);
    setTimeout(() => setGenSaved(false), 2000);
  };

  const updateGenProvider = (provider, field, value) => {
    setGenProviders(prev => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value }
    }));
  };

  if (!isOpen) return null;

  const providerInfo = {
    openai: { name: 'OpenAI (DALL-E)', icon: Image, description: 'Image generation with DALL-E 3' },
    google: { name: 'Google (Veo)', icon: Video, description: 'Video generation with Veo' },
    midjourney: { name: 'Midjourney', icon: Image, description: 'Image generation with Midjourney' },
    grok: { name: 'Grok (xAI)', icon: Image, description: 'Image generation with Grok/Flux' }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Settings size={20} className="text-gray-500" />
            Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
          <button
            onClick={() => setActiveTab('enhancement')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'enhancement'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-900'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles size={16} />
              Prompt Enhancement
            </div>
          </button>
          {isDesktop && (
            <button
              onClick={() => setActiveTab('generation')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'generation'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-900'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Image size={16} />
                AI Generation
              </div>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {activeTab === 'enhancement' ? (
            <div className="space-y-5">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed flex items-start gap-2">
                  <Globe size={14} className="mt-0.5 flex-shrink-0" />
                  <span>Configure your preferred AI engine to power features like Magic Enhance and Auto-Negative. API keys are stored locally in your browser.</span>
                </p>
              </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Provider</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {['gemini', 'anthropic', 'openai'].map(p => (
                    <button
                      key={p}
                      onClick={() => setProvider(p)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${
                        provider === p
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {p === 'openai' ? 'OpenAI / Compatible' : p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                <div className="relative">
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={provider === 'gemini' ? "AIzaSy..." : "sk-..."}
                    className="w-full p-2.5 pl-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <Shield className="absolute right-3 top-2.5 text-gray-400" size={16} />
                </div>
              </div>

              {provider === 'openai' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base URL (Optional)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="w-full p-2.5 pl-9 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <Server className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Use for DeepSeek, Mistral, Ollama, etc.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model Name (Optional)</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={
                    provider === 'gemini' ? "gemini-2.0-flash-exp" :
                    provider === 'anthropic' ? "claude-3-5-sonnet-20240620" :
                    "gpt-4o"
                  }
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

              <button
                onClick={handleSave}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                  saved ? 'bg-green-500 text-white' : 'bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90'
                }`}
              >
                {saved ? 'Settings Saved' : 'Save Configuration'}
              </button>
            </div>
          ) : (
            /* Generation Tab */
            <div className="space-y-5">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed flex items-start gap-2">
                  <Sparkles size={14} className="mt-0.5 flex-shrink-0" />
                  <span>Configure API keys for AI generation providers. Enable providers to use direct API generation for images and videos. Keys are stored securely.</span>
                </p>
              </div>

              <div className="space-y-4">
                {Object.entries(providerInfo).map(([providerKey, info]) => {
                  const Icon = info.icon;
                  const config = genProviders[providerKey];
                  return (
                    <div key={providerKey} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.enabled ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <Icon size={20} className={config.enabled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{info.name}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{info.description}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) => updateGenProvider(providerKey, 'enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      {config.enabled && (
                        <div className="mt-3">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                          <div className="relative">
                            <input
                              type="password"
                              value={config.apiKey}
                              onChange={(e) => updateGenProvider(providerKey, 'apiKey', e.target.value)}
                              placeholder={providerKey === 'openai' ? 'sk-...' : providerKey === 'grok' ? 'xai-...' : 'API Key'}
                              className="w-full p-2.5 pl-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm placeholder-gray-400 dark:placeholder-gray-500"
                            />
                            <Shield className="absolute right-3 top-2.5 text-gray-400" size={16} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleGenSave}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                  genSaved ? 'bg-green-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {genSaved ? 'Providers Configured' : 'Save Provider Configuration'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
