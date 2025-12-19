import React, { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Trash2, Edit2, Image as ImageIcon, Video, Sparkles, Settings, Hash, Calendar, Clock, ChevronLeft, ChevronRight, FolderOpen, GitBranch, Film } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { Button } from '../../../lib/promptcraft-ui';
import { SceneRelations } from './SceneRelations';
import { CreateVariationDialog } from './CreateVariationDialog';
import { CreateSequenceDialog } from './CreateSequenceDialog';
import { convertToAssetUrl } from '../../../utils/fileUrlHelper';
import { usePlatform } from '../../../lib/promptcraft-ui/hooks/usePlatform';
import { getModelById } from '../../../constants/models';

/**
 * SceneDetailModal - Expanded CivitAI-style view for scene details
 * Displays: full image, prompts, settings, metadata, variations, sequences
 */
export function SceneDetailModal({ scene, onClose, onDelete, onLoadScene, getSceneJobs, allScenes = [], onSceneClick, onCreateVariation, onCreateSequence }) {
  const { isDesktop } = usePlatform();
  const [jobs, setJobs] = useState([]);
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [copiedField, setCopiedField] = useState(null);
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [showSequenceDialog, setShowSequenceDialog] = useState(false);

  const { id, name, data, thumbnail, created_at } = scene;
  const { category, model, prompt, metadata, params } = data || {};

  // Get model display name
  const modelInfo = model ? getModelById(model) : null;
  const modelDisplayName = modelInfo?.name || model || 'Unknown';

  // Load jobs for this scene
  useEffect(() => {
    const loadJobs = async () => {
      setLoadingJobs(true);
      try {
        const sceneJobs = await getSceneJobs(id);
        setJobs(sceneJobs || []);
      } catch (err) {
        console.error('Failed to load jobs:', err);
      } finally {
        setLoadingJobs(false);
      }
    };

    loadJobs();
  }, [id, getSceneJobs]);

  // Get current job/generation
  const currentJob = jobs[selectedJobIndex];
  const jobResult = currentJob?.result ? JSON.parse(currentJob.result) : null;

  // Handle both URL-based output (DALL-E, Grok, etc.) and base64 output (Gemini)
  const rawOutputUrl = jobResult?.output_url ||
    (jobResult?.output_data ? `data:image/png;base64,${jobResult.output_data}` : null) ||
    thumbnail;

  // Convert file:// URLs to Tauri asset protocol URLs
  const outputUrl = isDesktop && rawOutputUrl ? convertToAssetUrl(rawOutputUrl) : rawOutputUrl;

  // Copy to clipboard helper
  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format date
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Handle delete
  const handleDelete = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Use Tauri's dialog API for proper confirmation
    const confirmed = await ask(`Are you sure you want to delete "${name}"?`, {
      title: 'Confirm Delete',
      kind: 'warning'
    });

    if (!confirmed) return;

    await onDelete(id);
    onClose();
  };

  const CategoryIcon = category === 'video' ? Video : ImageIcon;

  // Handle opening in default viewer
  const handleOpenInViewer = async () => {
    // Prefer file_path from job result, fallback to raw output URL
    const pathToOpen = jobResult?.file_path || rawOutputUrl;
    if (pathToOpen) {
      try {
        await invoke('open_in_default_app', { path: pathToOpen });
      } catch (error) {
        console.error('Failed to open in viewer:', error);
      }
    }
  };

  // Handle opening with custom application
  const handleOpenWith = async () => {
    // Prefer file_path from job result, fallback to raw output URL
    const pathToOpen = jobResult?.file_path || rawOutputUrl;
    if (pathToOpen) {
      try {
        await invoke('open_with_app', { path: pathToOpen });
      } catch (error) {
        console.error('Failed to open with app:', error);
      }
    }
  };

  // Handle variation creation
  const handleCreateVariation = async (modifications) => {
    if (onCreateVariation) {
      await onCreateVariation(scene, modifications);
      setShowVariationDialog(false);
    }
  };

  // Handle sequence creation
  const handleCreateSequence = async (sceneIds) => {
    if (onCreateSequence) {
      await onCreateSequence(sceneIds);
      setShowSequenceDialog(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <CategoryIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLoadScene(scene)}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Load Scene
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVariationDialog(true)}
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Create Variation
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSequenceDialog(true)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <Film className="w-4 h-4 mr-2" />
              Add to Sequence
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column - Image/Video */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square">
                {outputUrl ? (
                  category === 'video' ? (
                    <video
                      src={outputUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={outputUrl}
                      alt={name}
                      className="w-full h-full object-contain"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CategoryIcon className="w-24 h-24 text-gray-400" />
                  </div>
                )}

                {/* Job Navigation (if multiple generations) */}
                {jobs.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedJobIndex(Math.max(0, selectedJobIndex - 1))}
                      disabled={selectedJobIndex === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedJobIndex(Math.min(jobs.length - 1, selectedJobIndex + 1))}
                      disabled={selectedJobIndex === jobs.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
                      {selectedJobIndex + 1} / {jobs.length}
                    </div>
                  </>
                )}
              </div>

              {/* Open in Viewer/Copy Actions */}
              {outputUrl && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenInViewer}
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Viewer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenWith}
                    className="flex-1"
                    title="Open with another application (GIMP, Photoshop, etc.)"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Open With...
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(outputUrl, 'url')}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copiedField === 'url' ? 'Copied!' : 'Copy URL'}
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Metadata Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium">Model:</span>
                    <span className="text-gray-900 dark:text-white">{modelDisplayName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CategoryIcon className="w-4 h-4" />
                    <span className="font-medium">Type:</span>
                    <span className="text-gray-900 dark:text-white capitalize">{category || 'image'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Created:</span>
                    <span className="text-gray-900 dark:text-white text-xs">{formatDateTime(created_at)}</span>
                  </div>
                  {currentJob && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Status:</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        currentJob.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        currentJob.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {currentJob.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {metadata?.tags && metadata.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {metadata.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-3 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt Section */}
              {prompt && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prompt</h3>

                  {/* Main Prompt */}
                  {prompt.main && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Main Prompt</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(prompt.main, 'main')}
                          className="text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copiedField === 'main' ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-800 dark:text-gray-200 max-h-32 overflow-y-auto">
                        {prompt.main}
                      </div>
                    </div>
                  )}

                  {/* Negative Prompt */}
                  {prompt.negative && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Negative Prompt</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(prompt.negative, 'negative')}
                          className="text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copiedField === 'negative' ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-800 dark:text-gray-200 max-h-24 overflow-y-auto">
                        {prompt.negative}
                      </div>
                    </div>
                  )}

                  {/* Modifiers/Enhancers */}
                  {prompt.modifiers && prompt.modifiers.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enhancers</label>
                      <div className="flex flex-wrap gap-2">
                        {prompt.modifiers.map((mod, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2.5 py-1 rounded-full"
                          >
                            {mod}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generation Settings */}
              {(prompt?.params || params) && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Generation Settings
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                    {Object.entries(prompt?.params || params || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {metadata?.notes && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Notes</h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-800 dark:text-gray-200">
                    {metadata.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Variations & Sequential Scenes Section */}
          <div className="px-6 pb-6">
            <SceneRelations
              scene={scene}
              allScenes={allScenes}
              onSceneClick={onSceneClick}
            />
          </div>
        </div>
      </div>

      {/* Variation Dialog */}
      {showVariationDialog && (
        <CreateVariationDialog
          parentScene={scene}
          onClose={() => setShowVariationDialog(false)}
          onCreateVariation={handleCreateVariation}
        />
      )}

      {/* Sequence Dialog */}
      {showSequenceDialog && (
        <CreateSequenceDialog
          scenes={allScenes}
          currentScene={scene}
          onClose={() => setShowSequenceDialog(false)}
          onCreateSequence={handleCreateSequence}
        />
      )}
    </div>
  );
}
