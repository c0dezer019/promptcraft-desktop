import React, { useState } from 'react';
import { Image, Sparkles, Wand2, AlertCircle } from 'lucide-react';
import { TextArea } from '@promptcraft/ui/components/atoms/Input.jsx';
import { SectionHeader } from '@promptcraft/ui/components/molecules/SectionHeader.jsx';
import { TagGroup } from '@promptcraft/ui/components/molecules/TagGroup.jsx';
import { EnhanceButton } from '@promptcraft/ui/components/molecules/EnhanceButton.jsx';
import { MIDJOURNEY_CATEGORIES } from '@promptcraft/ui/constants/tagCategories.js';
import { callAI } from '@promptcraft/ui/utils/aiApi.js';

/**
 * MidjourneyBuilder Component - For Midjourney prompt crafting
 * LOCAL OVERRIDE: Removed AI Generation section (no official Midjourney API available)
 *
 * @param {string} prompt - Main prompt text
 * @param {function} setPrompt - Prompt setter
 * @param {Array} modifiers - Modifier tags
 * @param {function} setModifiers - Modifiers setter
 * @param {function} deleteEnhancer - Function to delete an enhancer
 * @param {function} editEnhancer - Function to edit an enhancer
 * @param {function} syncEnhancer - Function to sync enhancer across builders
 */
export const MidjourneyBuilder = ({
  prompt,
  setPrompt,
  modifiers,
  setModifiers,
  deleteEnhancer,
  editEnhancer,
  syncEnhancer,
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [categories, setCategories] = useState(MIDJOURNEY_CATEGORIES);

  const handleEnhance = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    const systemPrompt =
      "You are an expert Midjourney prompt engineer. Transform the user's concept into a detailed, visually rich prompt optimized for Midjourney v6. Focus on composition, lighting, style, mood, and artistic details. Keep it concise but descriptive (under 150 words). DO NOT include parameters like --ar, --v, or --style in your response. Return ONLY the descriptive prompt.";

    const result = await callAI(prompt, systemPrompt);
    setPrompt(result);
    setIsEnhancing(false);
  };

  const addModifier = (tag) => {
    if (!modifiers.includes(tag)) setModifiers([...modifiers, tag]);
  };

  const handleAddTag = (category, newTag) => {
    setCategories(prev => ({
      ...prev,
      [category]: [...prev[category], newTag]
    }));
  };

  const handleDeleteTag = (tag, index) => {
    if (deleteEnhancer) {
      deleteEnhancer('midjourney', 'modifiers', tag, index);
    }
  };

  const handleEditTag = (oldTag, newTag, index) => {
    if (editEnhancer) {
      editEnhancer('midjourney', 'modifiers', oldTag, newTag, index);
    }
  };

  const handleSyncTag = (tag) => {
    if (syncEnhancer) {
      syncEnhancer(tag, 'midjourney');
    }
  };

  const handleDeleteCategory = (category, tag, index) => {
    setCategories(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const handleEditCategory = (category, oldTag, newTag, index) => {
    setCategories(prev => ({
      ...prev,
      [category]: prev[category].map((tag, i) => (i === index ? newTag : tag))
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
            <SectionHeader
              icon={Image}
              title="Main Midjourney Prompt"
              extra={
                <EnhanceButton
                  isEnhancing={isEnhancing}
                  disabled={!prompt}
                  onClick={handleEnhance}
                  variant="enhance"
                  label="Enhance"
                />
              }
            />
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your image in detail..."
              rows={8}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <SectionHeader icon={Wand2} title="Complete Prompt Preview" />
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                {prompt}
                {modifiers.length > 0 && (prompt ? ' ' : '')}
                {modifiers.join(' ')}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Copy and paste this complete prompt into Midjourney Discord
            </p>
          </div>

          {/* No Official API Notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  No Official API Available
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Midjourney does not currently offer a public API. To generate images, copy the prompt above
                  and use it in the Midjourney Discord bot with /imagine command.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 h-full overflow-y-auto pr-2 custom-scrollbar">
          <SectionHeader icon={Sparkles} title="Enhancers & Parameters" />
          {Object.entries(categories).map(([key, tags]) => (
            <TagGroup
              key={key}
              title={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              tags={tags}
              onSelect={addModifier}
              onAdd={(newTag) => handleAddTag(key, newTag)}
              onDelete={(tag, index) => handleDeleteCategory(key, tag, index)}
              onEdit={(oldTag, newTag, index) => handleEditCategory(key, oldTag, newTag, index)}
              onSync={handleSyncTag}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
