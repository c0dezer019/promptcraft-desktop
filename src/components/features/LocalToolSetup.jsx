import { useState, useEffect } from 'react';
import { X, FolderOpen, Wifi, WifiOff, Check, AlertCircle } from 'lucide-react';
import { LOCAL_TOOLS } from '../../constants/models.js';
import {
    loadLocalToolConfigs,
    saveLocalToolConfig,
} from '../../utils/localToolConfig.js';
import { fetch } from '@tauri-apps/plugin-http';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { usePlatform } from '@promptcraft/ui/hooks/usePlatform.js';

/**
 * LocalToolSetup Component
 * Modal for configuring local generation tool paths and connections
 */
export const LocalToolSetup = ({ isOpen, onClose, isEmbedded }) => {
    const { isDesktop } = usePlatform();
    const [selectedTool, setSelectedTool] = useState('comfyui');
    const [installPath, setInstallPath] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [testing, setTesting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null); // 'success' | 'error' | null
    const [saved, setSaved] = useState(false);

    // Load existing config when modal opens
    useEffect(() => {
        if (isOpen) {
            const configs = loadLocalToolConfigs();
            const config = configs[selectedTool];
            if (config) {
                setInstallPath(config.installPath || '');
                setApiUrl(config.apiUrl || getDefaultApiUrl(selectedTool));
            } else {
                setApiUrl(getDefaultApiUrl(selectedTool));
            }
            setConnectionStatus(null);
            setSaved(false);
        }
    }, [isOpen, selectedTool]);

    // Get default API URL for a tool
    const getDefaultApiUrl = toolId => {
        const tool = LOCAL_TOOLS.find(t => t.id === toolId);
        return tool?.defaultUrl || '127.0.0.1:8188';
    };

    // Handle tool selection change
    const handleToolChange = toolId => {
        setSelectedTool(toolId);
        const configs = loadLocalToolConfigs();
        const config = configs[toolId];
        setInstallPath(config?.installPath || '');
        setApiUrl(config?.apiUrl || getDefaultApiUrl(toolId));
        setConnectionStatus(null);
    };

    // Auto-detect installation path
    const handleAutoDetect = async () => {
        // For now, just set common paths based on tool
        // In future, this could scan filesystem or check running processes
        const commonPaths = {
            comfyui: ['~/ComfyUI', '~/.local/share/ComfyUI', '/opt/ComfyUI'],
            a1111: ['~/stable-diffusion-webui', '/opt/stable-diffusion-webui'],
            invokeai: ['~/invokeai', '~/.invokeai'],
        };

        const paths = commonPaths[selectedTool] || [];
        if (paths.length > 0) {
            setInstallPath(paths[0]);
        }
    };

    // Open folder picker (Tauri only)
    const handleBrowse = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select Installation Directory',
            });
            if (selected) {
                setInstallPath(selected);
            }
        } catch (error) {
            console.error('Failed to open folder picker:', error);
        }
    };

    // Test connection to API
    const handleTestConnection = async () => {
        setTesting(true);
        setConnectionStatus(null);

        try {
            // Attempt to fetch from the API
            await fetch(apiUrl, { mode: 'no-cors' });
            setConnectionStatus('success');
        } catch (error) {
            console.error('Connection test failed:', error);
            setConnectionStatus('error');
        } finally {
            setTesting(false);
        }
    };

    // Save configuration
    const handleSave = async () => {
        const finalApiUrl = apiUrl || getDefaultApiUrl(selectedTool);
        const config = {
            enabled: true,
            installPath: installPath || null,
            apiUrl: finalApiUrl,
        };

        const success = saveLocalToolConfig(selectedTool, config);
        if (success) {
            // Also configure in Tauri backend if in desktop mode
            if (isDesktop) {
                try {
                    await invoke('configure_local_provider', {
                        provider: selectedTool,
                        apiUrl: finalApiUrl,
                    });
                } catch (error) {
                    console.error(
                        'Failed to configure provider in backend:',
                        error
                    );
                    // Continue anyway - frontend config is saved
                }
            }

            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                onClose();
            }, 1500);
        }
    };

    if (!isOpen && !isEmbedded) return null;

    const selectedToolInfo = LOCAL_TOOLS.find(t => t.id === selectedTool);

    return (
        <>
            {!isEmbedded ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                Configure Local Tool
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-5">
                            {/* Tool Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    Select Tool
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {LOCAL_TOOLS.map(tool => (
                                        <button
                                            key={tool.id}
                                            onClick={() =>
                                                handleToolChange(tool.id)
                                            }
                                            className={`px-4 py-3 rounded-lg text-sm font-medium border transition-all ${
                                                selectedTool === tool.id
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                            }`}>
                                            {tool.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Installation Path */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    Installation Directory (Optional)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={installPath}
                                        onChange={e =>
                                            setInstallPath(e.target.value)
                                        }
                                        placeholder={`/home/user/${selectedToolInfo?.name}`}
                                        className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                    <button
                                        onClick={handleAutoDetect}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                                        Auto-Detect
                                    </button>
                                    {isDesktop && (
                                        <button
                                            onClick={handleBrowse}
                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                                            title="Browse">
                                            <FolderOpen className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* API URL */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    API URL
                                </label>
                                <input
                                    type="text"
                                    value={apiUrl}
                                    onChange={e => setApiUrl(e.target.value)}
                                    placeholder={getDefaultApiUrl(selectedTool)}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Default: {getDefaultApiUrl(selectedTool)}
                                </p>
                            </div>

                            {/* Test Connection */}
                            <div>
                                <button
                                    onClick={handleTestConnection}
                                    disabled={testing || !apiUrl}
                                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {testing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                            Testing Connection...
                                        </>
                                    ) : (
                                        <>
                                            <Wifi className="w-5 h-5" />
                                            Test Connection
                                        </>
                                    )}
                                </button>

                                {/* Connection Status */}
                                {connectionStatus === 'success' && (
                                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                                        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        <span className="text-sm text-green-700 dark:text-green-300">
                                            Connection successful!{' '}
                                            {selectedToolInfo?.name} is
                                            reachable.
                                        </span>
                                    </div>
                                )}
                                {connectionStatus === 'error' && (
                                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        <span className="text-sm text-red-700 dark:text-red-300">
                                            Connection failed. Make sure{' '}
                                            {selectedToolInfo?.name} is running
                                            at {apiUrl}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={handleSave}
                                disabled={!apiUrl}
                                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                    saved
                                        ? 'bg-green-500 text-white'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}>
                                {saved
                                    ? 'Configuration Saved!'
                                    : 'Save Configuration'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Content */}
                    <div className="p-6 overflow-y-auto space-y-5">
                        {/* Tool Selection */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                Select Tool
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {LOCAL_TOOLS.map(tool => (
                                    <button
                                        key={tool.id}
                                        onClick={() =>
                                            handleToolChange(tool.id)
                                        }
                                        className={`px-4 py-3 rounded-lg text-sm font-medium border transition-all ${
                                            selectedTool === tool.id
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}>
                                        {tool.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Installation Path */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                Installation Directory (Optional)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={installPath}
                                    onChange={e =>
                                        setInstallPath(e.target.value)
                                    }
                                    placeholder={`/home/user/${selectedToolInfo?.name}`}
                                    className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                />
                                <button
                                    onClick={handleAutoDetect}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                                    Auto-Detect
                                </button>
                                {isDesktop && (
                                    <button
                                        onClick={handleBrowse}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                                        title="Browse">
                                        <FolderOpen className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* API URL */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                API URL
                            </label>
                            <input
                                type="text"
                                value={apiUrl}
                                onChange={e => setApiUrl(e.target.value)}
                                placeholder={getDefaultApiUrl(selectedTool)}
                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Default: {getDefaultApiUrl(selectedTool)}
                            </p>
                        </div>

                        {/* Test Connection */}
                        <div>
                            <button
                                onClick={handleTestConnection}
                                disabled={testing || !apiUrl}
                                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {testing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                        Testing Connection...
                                    </>
                                ) : (
                                    <>
                                        <Wifi className="w-5 h-5" />
                                        Test Connection
                                    </>
                                )}
                            </button>

                            {/* Connection Status */}
                            {connectionStatus === 'success' && (
                                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    <span className="text-sm text-green-700 dark:text-green-300">
                                        Connection successful!{' '}
                                        {selectedToolInfo?.name} is reachable.
                                    </span>
                                </div>
                            )}
                            {connectionStatus === 'error' && (
                                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    <span className="text-sm text-red-700 dark:text-red-300">
                                        Connection failed. Make sure{' '}
                                        {selectedToolInfo?.name} is running at{' '}
                                        {apiUrl}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <button
                            onClick={handleSave}
                            disabled={!apiUrl}
                            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                saved
                                    ? 'bg-green-500 text-white'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}>
                            {saved
                                ? 'Configuration Saved!'
                                : 'Save Local Configuration'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default LocalToolSetup;
