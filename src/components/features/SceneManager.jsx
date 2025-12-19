import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Grid3x3, List, Filter, X, Plus, Image as ImageIcon, Video, Sparkles, Film } from 'lucide-react';
import { Button, Input } from '../../lib/promptcraft-ui';
import { invoke } from '@tauri-apps/api/core';
import { usePlatform } from '../../lib/promptcraft-ui';
import { useScenes } from '../../hooks/useScenes';
import { SceneCard } from './scenes/SceneCard';
import { SceneDetailModal } from './scenes/SceneDetailModal';
import { CreateSequenceDialog } from './scenes/CreateSequenceDialog';
import { getModelById } from '../../constants/models';

/**
 * SceneManager - Main component for managing generation scenes
 * Features: grid view, search, filtering, detail modal
 */
export function SceneManager({ onLoadScene, onClose }) {
  const { isDesktop } = usePlatform();
  const {
    scenes,
    loading,
    error,
    loadScenes: reloadScenes,
    createVariation,
    createSequence,
    removeFromSequence,
  } = useScenes('all'); // Load ALL scenes across all workflows

  const [selectedScene, setSelectedScene] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: null, // 'image' | 'video' | null
    model: null,
    tags: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showSequenceDialog, setShowSequenceDialog] = useState(false);

  // Handler for variation creation
  const handleCreateVariation = useCallback(async (parentScene, modifications) => {
    try {
      const newScene = await createVariation(parentScene, modifications);
      console.log('[SceneManager] Created variation:', newScene);
      // Optionally, open the new scene
      // setSelectedScene(newScene);
    } catch (err) {
      console.error('[SceneManager] Failed to create variation:', err);
      alert('Failed to create variation: ' + err.message);
    }
  }, [createVariation]);

  // Handler for sequence creation
  const handleCreateSequence = useCallback(async (sceneIds, sequenceName) => {
    try {
      await createSequence(sceneIds, sequenceName);
      setShowSequenceDialog(false);
    } catch (err) {
      console.error('[SceneManager] Failed to create sequence:', err);
      alert('Failed to create sequence: ' + err.message);
    }
  }, [createSequence]);

  // Handler for removing from sequence
  const handleRemoveFromSequence = useCallback(async (sceneId) => {
    try {
      await removeFromSequence(sceneId);
      console.log('[SceneManager] Removed scene from sequence:', sceneId);
    } catch (err) {
      console.error('[SceneManager] Failed to remove from sequence:', err);
      alert('Failed to remove from sequence: ' + err.message);
    }
  }, [removeFromSequence]);

  // Delete scene (from useScenes hook)
  const deleteScene = useCallback(async (id) => {
    // The deleteScene function is already available from useScenes hook
    // But we need to call it via invoke since we didn't destructure it
    try {
      await invoke('delete_scene', { id });
      await reloadScenes();
    } catch (err) {
      console.error('Failed to delete scene:', err);
      throw err;
    }
  }, [reloadScenes]);

  // Get jobs for a scene (stub - not implemented yet)
  const getSceneJobs = useCallback(async (sceneId) => {
    if (!isDesktop) return [];

    try {
      const jobs = await invoke('list_jobs', { workflowId: 'default' });
      return jobs.filter(job => job.scene_id === sceneId);
    } catch (err) {
      console.error('Failed to get scene jobs:', err);
      return [];
    }
  }, [isDesktop]);

  // Scenes auto-load via useScenes hook

  // Get unique models and tags from scenes
  const { availableModels, availableTags } = useMemo(() => {
    const models = new Set();
    const tags = new Set();

    scenes.forEach(scene => {
      if (scene.data?.model) models.add(scene.data.model);
      if (scene.data?.metadata?.tags) {
        scene.data.metadata.tags.forEach(tag => tags.add(tag));
      }
    });

    return {
      availableModels: Array.from(models).sort(),
      availableTags: Array.from(tags).sort(),
    };
  }, [scenes]);

  // Filter scenes based on search and filters
  const filteredScenes = useMemo(() => {
    let filtered = [...scenes];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(scene =>
        scene.name.toLowerCase().includes(query) ||
        scene.data?.prompt?.main?.toLowerCase().includes(query) ||
        scene.data?.metadata?.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(scene => scene.data?.category === filters.category);
    }

    // Model filter
    if (filters.model) {
      filtered = filtered.filter(scene => scene.data?.model === filters.model);
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(scene =>
        filters.tags.every(tag =>
          scene.data?.metadata?.tags?.includes(tag)
        )
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return filtered;
  }, [scenes, searchQuery, filters]);

  // Toggle tag filter
  const toggleTagFilter = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      category: null,
      model: null,
      tags: [],
    });
  };

  const hasActiveFilters = searchQuery || filters.category || filters.model || filters.tags.length > 0;

  // Auto-refresh scenes every 5 seconds to pick up new scenes created elsewhere
  useEffect(() => {
    const intervalId = setInterval(() => {
      reloadScenes();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [reloadScenes]);

  return (
    <div className="fixed inset-0 z-40 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Grid3x3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scene Manager</h1>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredScenes.length} {filteredScenes.length === 1 ? 'scene' : 'scenes'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {(filters.category ? 1 : 0) + (filters.model ? 1 : 0) + filters.tags.length}
                  </span>
                )}
              </Button>

              {/* Create Sequence Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSequenceDialog(true)}
                className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                <Film className="w-4 h-4 mr-2" />
                Create Sequence
              </Button>

              {/* Close Button */}
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search scenes by name, prompt, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, category: null }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.category === null
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, category: 'image' }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    filters.category === 'image'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Images
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, category: 'video' }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    filters.category === 'video'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  Videos
                </button>
              </div>
            </div>

            {/* Model Filter */}
            {availableModels.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, model: null }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filters.model === null
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    All Models
                  </button>
                  {availableModels.map(model => {
                    const modelInfo = getModelById(model);
                    const displayName = modelInfo?.name || model;
                    return (
                      <button
                        key={model}
                        onClick={() => setFilters(prev => ({ ...prev, model }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          filters.model === model
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filters.tags.includes(tag)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-indigo-600 dark:text-indigo-400"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto h-[calc(100vh-180px)]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading scenes...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-red-600 dark:text-red-400">
              <p className="font-semibold mb-2">Error loading scenes</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : filteredScenes.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Grid3x3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {hasActiveFilters ? 'No scenes found' : 'No scenes yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first scene by generating an image or video'}
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'space-y-3'
          }>
            {filteredScenes.map(scene => (
              <SceneCard
                key={scene.id}
                scene={scene}
                onClick={setSelectedScene}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedScene && (
        <SceneDetailModal
          scene={selectedScene}
          onClose={() => setSelectedScene(null)}
          onDelete={deleteScene}
          onLoadScene={onLoadScene}
          getSceneJobs={getSceneJobs}
          allScenes={scenes}
          onSceneClick={setSelectedScene}
          onCreateVariation={handleCreateVariation}
          onCreateSequence={handleCreateSequence}
          onRemoveFromSequence={handleRemoveFromSequence}
        />
      )}

      {/* Sequence Dialog (from toolbar) */}
      {showSequenceDialog && (
        <CreateSequenceDialog
          scenes={scenes}
          currentScene={null}
          onClose={() => setShowSequenceDialog(false)}
          onCreateSequence={handleCreateSequence}
        />
      )}
    </div>
  );
}
