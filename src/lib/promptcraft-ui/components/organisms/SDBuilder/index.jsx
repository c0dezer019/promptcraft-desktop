import { useState, useEffect, useRef } from 'react';
import { Palette, X, Layers, Workflow, Plus, Upload, Link2 } from 'lucide-react';
import { TextArea } from '../../atoms';
import { SectionHeader, TagGroup, EnhanceButton, FileDropZone, ImportDialog, URLImportDialog } from '../../molecules';
import { ComfyNode } from './ComfyNode';
import { A1111Params } from './A1111Params';
import { SD_CATEGORIES } from '../../../constants/tagCategories';
import { NODE_TEMPLATES } from '../../../constants/nodeTemplates';
import { callAI } from '../../../utils/aiApi';
import { useWorkflowImport } from '../../../hooks/useWorkflowImport';

/**
 * SDBuilder Component - For Stable Diffusion (A1111 / ComfyUI)
 * @param {string} type - 'comfy' | 'a1111'
 * @param {string} prompt - Positive prompt
 * @param {function} setPrompt - Prompt setter
 * @param {string} negativePrompt - Negative prompt
 * @param {function} setNegativePrompt - Negative prompt setter
 * @param {Array} modifiers - Modifier tags
 * @param {function} setModifiers - Modifiers setter
 * @param {Array} nodes - ComfyUI nodes (optional)
 * @param {function} setNodes - Nodes setter (optional)
 * @param {object} params - A1111 params (optional)
 * @param {function} setParams - Params setter (optional)
 * @param {function} deleteEnhancer - Function to delete an enhancer
 * @param {function} editEnhancer - Function to edit an enhancer
 * @param {function} syncEnhancer - Function to sync enhancer across builders
 */
export const SDBuilder = ({
  type,
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt,
  modifiers,
  setModifiers,
  nodes,
  setNodes,
  params,
  setParams,
  deleteEnhancer,
  editEnhancer,
  syncEnhancer
}) => {
  const isComfy = type === 'comfy';
  const [activeField, setActiveField] = useState('positive');
  const [isEnhancingPos, setIsEnhancingPos] = useState(false);
  const [isEnhancingNeg, setIsEnhancingNeg] = useState(false);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [categories, setCategories] = useState(SD_CATEGORIES);
  const nodeMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (nodeMenuRef.current && !nodeMenuRef.current.contains(event.target)) {
        setShowNodeMenu(false);
      }
    };

    if (showNodeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNodeMenu]);

  // Workflow Import Hook
  const {
    importDialogOpen,
    urlDialogOpen,
    importData,
    importError,
    importMode,
    handleFileSelect,
    handleURLFetch,
    setUrlDialogOpen,
    resetImport
  } = useWorkflowImport();

  const handleAddTagToCategory = (category, newTag) => {
    setCategories(prev => ({
      ...prev,
      [category]: [...prev[category], newTag]
    }));
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

  const handleSyncTag = (tag) => {
    if (syncEnhancer) {
      syncEnhancer(tag, type);
    }
  };

  const handleEnhanceSD = async (target) => {
    if (target === 'positive') {
      if (!prompt) return;
      setIsEnhancingPos(true);
      const instruction = "You are an expert Stable Diffusion prompt engineer. Rewrite the user's concept into a comma-separated list of high-quality tags. Include art styles, lighting, and camera tags. Use standard Danbooru formatting where possible. e.g. 'masterpiece, best quality, 1girl, ...'. Return ONLY the comma separated tags.";
      const result = await callAI(prompt, instruction);
      setPrompt(result);
      setIsEnhancingPos(false);
    } else {
      if (!prompt) return;
      setIsEnhancingNeg(true);
      const instruction = `You are an expert Stable Diffusion prompt engineer. Based on the following POSITIVE prompt, generate a suitable NEGATIVE prompt (things to avoid). Include standard quality exclusions (low quality, blurry) but also subject-specific exclusions based on the positive prompt. Return ONLY the comma separated negative tags. POSITIVE PROMPT: ${prompt}`;
      const result = await callAI(prompt, instruction);
      setNegativePrompt(result);
      setIsEnhancingNeg(false);
    }
  };

  const addTag = (tag) => {
    if (activeField === 'positive') {
      if (!prompt.includes(tag)) {
        setPrompt(prompt ? `${prompt}, ${tag}` : tag);
      }
    } else {
      if (!negativePrompt.includes(tag)) {
        setNegativePrompt(negativePrompt ? `${negativePrompt}, ${tag}` : tag);
      }
    }
  };

  const wrapWeight = (weight) => {
    if (activeField === 'positive') {
      setPrompt(prompt + ` (${weight}:1.2)`);
    } else {
      setNegativePrompt(negativePrompt + ` (${weight}:1.2)`);
    }
  };

  const insertToken = (token) => {
    if (activeField === 'positive') {
      setPrompt(prompt + token);
    } else {
      setNegativePrompt(negativePrompt + token);
    }
  };

  // A1111 Params Helper
  const updateParam = (key, value) => {
    setParams({ ...params, [key]: value });
  };

  // --- Node Logic ---
  const addNode = (templateKey) => {
    const template = NODE_TEMPLATES[templateKey];
    const newNode = {
      id: Date.now(),
      templateKey,
      title: template.title,
      type: template.type,
      fields: JSON.parse(JSON.stringify(template.fields)) // Deep copy defaults
    };
    setNodes([...nodes, newNode]);
    setShowNodeMenu(false);
  };

  const removeNode = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
  };

  const updateNodeField = (nodeId, fieldKey, value) => {
    setNodes(nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          fields: {
            ...n.fields,
            [fieldKey]: { ...n.fields[fieldKey], value }
          }
        };
      }
      return n;
    }));
  };

  // Custom Node: Add new field
  const addCustomField = (nodeId) => {
    console.log('🔧 Add custom field clicked for node:', nodeId);
    const fieldName = window.prompt("Enter field name (e.g. 'steps', 'model_name'):");
    console.log('🔧 Field name entered:', fieldName);
    if (!fieldName) return;

    setNodes(nodes.map(n => {
      if (n.id === nodeId) {
        console.log('🔧 Adding field to node:', n.title);
        return {
          ...n,
          fields: {
            ...n.fields,
            [fieldName.toLowerCase().replace(/\s/g, '_')]: { type: 'text', value: '', label: fieldName }
          }
        };
      }
      return n;
    }));
  };

  // Handle workflow import
  const handleImport = (action) => {
    console.log('🎯 Import action:', action, 'Data:', importData);
    if (!importData) return;

    if (action === 'replace') {
      console.log('🔄 Replacing workflow...');
      // Replace all fields
      if (importData.prompt !== undefined) {
        console.log('Setting prompt:', importData.prompt);
        setPrompt(importData.prompt);
      }
      if (importData.negativePrompt !== undefined) {
        console.log('Setting negative prompt:', importData.negativePrompt);
        setNegativePrompt(importData.negativePrompt);
      }

      if (type === 'a1111' && importData.params) {
        console.log('Setting A1111 params:', importData.params);
        setParams(importData.params);
      }

      if (type === 'comfy' && importData.nodes) {
        console.log('Setting ComfyUI nodes:', importData.nodes);
        setNodes(importData.nodes);
      }
    } else if (action === 'merge') {
      console.log('🔀 Merging workflow...');
      // Merge with existing
      if (importData.prompt) {
        setPrompt(prompt ? `${prompt}, ${importData.prompt}` : importData.prompt);
      }
      if (importData.negativePrompt) {
        setNegativePrompt(negativePrompt ? `${negativePrompt}, ${importData.negativePrompt}` : importData.negativePrompt);
      }

      if (type === 'a1111' && importData.params) {
        setParams({ ...params, ...importData.params });
      }

      if (type === 'comfy' && importData.nodes) {
        setNodes([...nodes, ...importData.nodes]);
      }
    }

    console.log('✅ Import complete');
    resetImport();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Import Controls */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700">
            <div className="flex items-center gap-2 mb-2">
              <Upload size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
                Import {isComfy ? 'ComfyUI' : 'Automatic1111'} Workflow
              </h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              {isComfy
                ? 'Load a ComfyUI workflow JSON file to populate nodes and prompts'
                : 'Load an A1111 image (PNG) or parameter file (TXT) to populate prompts and settings'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setUrlDialogOpen(true)}
                className="text-xs flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg transition-colors font-medium text-indigo-700 dark:text-indigo-300"
              >
                <Link2 size={14} /> Import from URL
              </button>
              <div className="flex-1">
                <FileDropZone
                  onFileSelect={(file) => handleFileSelect(file, type)}
                  acceptedFormats={type === 'a1111' ? '.png,.txt' : '.json'}
                  className="!p-3 !border-indigo-200 dark:!border-indigo-700 hover:!border-indigo-400 dark:hover:!border-indigo-500 !bg-white dark:!bg-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Positive Prompt */}
          <div
            className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border transition-colors ${
              activeField === 'positive' ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <SectionHeader icon={Palette} title="Positive Prompt" />
              <div className="flex gap-2 items-center">
                <EnhanceButton
                  isEnhancing={isEnhancingPos}
                  disabled={!prompt}
                  onClick={() => handleEnhanceSD('positive')}
                  variant="enhance"
                  label="AI Enhance"
                  className="text-[10px]"
                />
                <div className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex gap-1">
                  <button
                    onClick={() => wrapWeight("emphasis")}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                  >
                    ( )
                  </button>
                  <button
                    onClick={() => insertToken(" [de-emphasize]")}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                  >
                    [ ]
                  </button>
                  <button
                    onClick={() => insertToken(" <lora:filename:1>")}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                  >
                    LoRA
                  </button>
                </div>
              </div>
            </div>
            <TextArea
              value={prompt}
              onFocus={() => setActiveField('positive')}
              onChange={(e) => setPrompt(e.target.value)}
              className="font-mono"
              rows={8}
              placeholder="cat, sitting on a park bench, sunny day, detailed fur..."
            />
          </div>

          {/* Negative Prompt */}
          <div
            className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border transition-colors ${
              activeField === 'negative' ? 'border-red-500 ring-1 ring-red-500/20' : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <SectionHeader icon={X} title="Negative Prompt" />
              <EnhanceButton
                isEnhancing={isEnhancingNeg}
                disabled={!prompt}
                onClick={() => handleEnhanceSD('negative')}
                variant="auto"
                label="Auto-Generate"
                className="text-[10px]"
              />
            </div>
            <TextArea
              value={negativePrompt}
              onFocus={() => setActiveField('negative')}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="font-mono border-red-100 dark:border-red-900/30"
              rows={6}
              placeholder="low quality, ugly, deformed, blurry, watermark, text..."
            />
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() =>
                  setNegativePrompt(
                    "embedding:easynegative, low quality, worst quality, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, jpeg artifacts, signature, watermark, username, blurry"
                  )
                }
                className="whitespace-nowrap text-xs px-2 py-1 text-red-600 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 transition"
              >
                + EasyNegative Universal
              </button>
            </div>
          </div>

          {/* A1111 Generation Parameters */}
          {!isComfy && params && <A1111Params params={params} updateParam={updateParam} />}

          {/* ComfyUI Node Builder */}
          {isComfy && (
            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
              <div className="flex justify-between items-center mb-4 relative">
                <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <Workflow size={16} /> Workflow Nodes
                </h4>

                <div className="relative" ref={nodeMenuRef}>
                  <button
                    onClick={() => setShowNodeMenu(!showNodeMenu)}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm"
                  >
                    <Plus size={14} /> Add Node
                  </button>

                  {showNodeMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                      <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                        Core Nodes
                      </div>
                      {Object.keys(NODE_TEMPLATES)
                        .filter(k => NODE_TEMPLATES[k].type === 'core')
                        .map(key => (
                          <button
                            key={key}
                            onClick={() => addNode(key)}
                            className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600"
                          >
                            {NODE_TEMPLATES[key].title}
                          </button>
                        ))}
                      <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-t border-gray-100 dark:border-gray-700">
                        Custom
                      </div>
                      <button
                        onClick={() => addNode('Custom')}
                        className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600"
                      >
                        Custom Node
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {nodes.map((node, index) => (
                  <ComfyNode
                    key={node.id}
                    node={node}
                    index={index}
                    onRemove={() => removeNode(node.id)}
                    onFieldUpdate={(fieldKey, value) => updateNodeField(node.id, fieldKey, value)}
                    onAddField={() => addCustomField(node.id)}
                  />
                ))}

                {nodes.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <Workflow className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-xs text-gray-400 italic">No Nodes active.</p>
                    <p className="text-[10px] text-gray-400">Click 'Add Node' to start building your workflow.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 h-full overflow-y-auto pr-2 custom-scrollbar">
          <SectionHeader
            icon={Layers}
            title="Styles"
            extra={
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  activeField === 'positive'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}
              >
                To: {activeField === 'positive' ? 'Positive' : 'Negative'}
              </span>
            }
          />
          {Object.entries(categories).map(([key, tags]) => (
            <TagGroup
              key={key}
              title={key.charAt(0).toUpperCase() + key.slice(1)}
              tags={tags}
              onSelect={addTag}
              onAdd={(newTag) => handleAddTagToCategory(key, newTag)}
              onDelete={(tag, index) => handleDeleteCategory(key, tag, index)}
              onEdit={(oldTag, newTag, index) => handleEditCategory(key, oldTag, newTag, index)}
              onSync={handleSyncTag}
            />
          ))}
        </div>
      </div>

      {/* Import Dialogs - Only render when actually open */}
      {importDialogOpen && (
        <ImportDialog
          isOpen={importDialogOpen}
          onClose={resetImport}
          onImport={handleImport}
          importData={importData}
          error={importError}
        />
      )}

      {urlDialogOpen && (
        <URLImportDialog
          isOpen={urlDialogOpen}
          onClose={() => setUrlDialogOpen(false)}
          onFetch={(url) => handleURLFetch(url, type)}
        />
      )}
    </div>
  );
};
