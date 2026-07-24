# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PromptCraft Desktop is a Tauri-based desktop application for AI prompt engineering. It supports image generation (DALL-E, Grok, Midjourney, Stable Diffusion) and video generation (Sora, Veo, Runway, Luma, Hailuo) with both cloud and local (ComfyUI/A1111) generation modes.

## Recent Updates (December 2025)

**Major Features Added**:

1. **Job-Based Variations & Sequences** - Iterate on generations directly in history, not scenes
   - New [useJobs.js](src/hooks/useJobs.js) hook for complete job management
   - [CreateJobVariationDialog.jsx](src/components/features/jobs/CreateJobVariationDialog.jsx) - Create variations with optional reference images
   - [CreateJobSequenceDialog.jsx](src/components/features/jobs/CreateJobSequenceDialog.jsx) - Build named sequences with drag-to-reorder
   - Metadata preservation when saving jobs as scenes
   - Purple badges for variations, blue badges for sequences

2. **Multi-Reference Image Support** - Use multiple images as references for generation
   - Backend support in [generation/utils.rs](src-tauri/src/generation/utils.rs)
   - Per-image strength and denoising settings
   - Supported providers: Google Veo, ComfyUI, A1111, InvokeAI

3. **Named Sequences** - Give sequences descriptive names (e.g., "Day to Night Transition")
   - Sequence badges show name and position (e.g., "Day Progression #2/5")
   - Preserved when saving to scenes

**Architecture Changes**:

- **Scene-based variations/sequences marked as deprecated** (still functional for backward compatibility)
- **Recommended workflow**: Generate → Iterate in History → Save to Scenes
- All variation/sequence metadata stored in existing `jobs.data` JSON field (no schema migration needed)
- Enhanced [JobDetailModal.jsx](src/components/features/JobDetailModal.jsx) and [JobHistoryPanel.jsx](src/components/features/JobHistoryPanel.jsx)

**Database Updates**:

- Added `data: Option<serde_json::Value>` to `UpdateJobInput` in [models.rs](src-tauri/src/db/models.rs)
- Enhanced `JobOps::update()` in [operations.rs](src-tauri/src/db/operations.rs)
- No schema migration required - uses existing JSON column

## Development Commands

```bash
# Frontend only (web mode - limited features, no AI enhancement)
pnpm dev

# Full Tauri environment (REQUIRED for AI features)
pnpm tauri:dev

# Build production application
pnpm tauri:build

# Frontend build only
pnpm build
```

**Critical:** AI enhancement features (enhance button, prompt improvement) only work in Tauri mode (`pnpm tauri:dev`). The Rust backend handles API calls to avoid CORS issues.

## Architecture

### Dual-Mode System: Cloud vs Local

The app operates in two distinct modes controlled by `generationMode` state:

1. **Cloud Mode**: Cloud API-based generation (OpenAI, Google, Grok, etc.)
2. **Local Mode**: Local tool generation (ComfyUI, A1111, InvokeAI)

Toggle is in TopNav via `GenerationModeToggle` component.

### Frontend-Backend Communication (Tauri IPC)

**Frontend** (React) invokes **Backend** (Rust) commands via `@tauri-apps/api/core`:

```javascript
import { invoke } from '@tauri-apps/api/core';

// Example: Call AI for prompt enhancement
await invoke('call_ai', { provider, model, prompt, maxTokens, temperature });

// Example: Submit generation job
await invoke('submit_generation', { workflowId, provider, prompt, model, parameters });
```

**Key Rust Commands** (defined in `src-tauri/src/commands.rs`):
- `call_ai` - AI enhancement API calls (routes through Rust to avoid CORS)
- `submit_generation` - Submit generation jobs
- `create_workflow`, `get_workflow`, `list_workflows` - Workflow management
- `create_scene`, `list_scenes` - Scene organization
- `create_job`, `get_job`, `list_jobs` - Job queue operations
- `check_health` - Check local tool connectivity

### State Management: Category-Based Prompt Storage

**Critical Architecture Decision**: Prompts are stored by **category** (image/video), not by model.

`usePromptManager` hook (in `src/lib/promptcraft-ui/hooks/usePromptManager.js`) maintains:
```javascript
{
  image: { main: '', modifiers: [], negative: '', nodes: [], params: {} },
  video: { main: '', modifiers: [], params: {} },
  // Legacy model-specific keys kept for backward compatibility
  sora: { main: '', modifiers: [] },
  dalle: { main: '' },
  // ... etc
}
```

**Why category-based**: Prompts persist when switching models within the same category (e.g., DALL-E → Grok → Midjourney all share `image` prompt).

**App.jsx key pattern**:
```javascript
const promptKey = activeCategory; // 'image' or 'video'
const currentPromptData = prompts[promptKey];
```

**Category switching**: `handleCategoryChange` in App.jsx auto-syncs prompts between categories if destination is empty.

### Job-Based Variations & Sequences System

**Critical Architecture Principle**: Variations are **normal generations**, not scenes. This system enables iterative refinement through generation history.

**Key Concepts**:
- **Variations**: Create modified versions of any job, optionally using the parent as a reference image
- **Sequences**: Group related jobs (e.g., "Day to Night Transition") with preserved order
- **Manual Scene Saving**: Users choose which jobs to save as scenes for long-term storage
- **Metadata Preservation**: Variation and sequence relationships persist when saved as scenes

**Job Data Structure**:
```javascript
{
  id: "job-uuid",
  workflow_id: "default",
  type: "generation",
  status: "completed",
  data: {
    provider: "openai",
    model: "gpt-image-1",
    prompt: "modified prompt...",
    parameters: {
      reference_images: [{ data: "base64...", strength: 0.75 }]
    },
    // Variation metadata
    variationOf: "parent-job-id",
    variationNotes: "Changed lighting to sunset",
    // Sequence metadata
    sequenceId: "sequence-uuid",
    sequenceOrder: 1,
    sequenceName: "Day to Night Transition"
  }
}
```

**New Hook: `useJobs`** ([src/hooks/useJobs.js](src/hooks/useJobs.js)):
```javascript
const {
  jobs,
  loading,
  loadJobs,              // Load jobs across workflows
  createJobVariation,    // Create variation with optional reference
  saveJobAsScene,        // Save job as scene with metadata
  deleteJob              // Delete from history
} = useJobs();

// Example: Create variation
await createJobVariation(parentJob, {
  promptModification: "at sunset with warm lighting",
  useAsReference: true,
  variationNotes: "Testing golden hour lighting"
});
```

**New Components**:

- [CreateJobVariationDialog.jsx](src/components/features/jobs/CreateJobVariationDialog.jsx) - Variation creation UI
- [CreateJobSequenceDialog.jsx](src/components/features/jobs/CreateJobSequenceDialog.jsx) - Sequence builder with drag-to-reorder

### Multi-Reference Image Support

**Backend**: [src-tauri/src/generation/utils.rs](src-tauri/src/generation/utils.rs)
```rust
// Supports multiple reference images with per-image settings
extract_reference_images(parameters) -> Vec<ReferenceImage>
```

**Frontend Structure**:
```javascript
parameters: {
  reference_images: [
    { data: "base64...", strength: 0.75, denoisingStrength: 0.7 },
    { data: "base64...", strength: 0.5 }
  ]
}
```

**Supported Providers**: Google Veo, ComfyUI, A1111, InvokeAI

### Component Hierarchy

```
App.jsx (root)
├── TopNav
│   ├── TabBar (Image/Video category selection)
│   ├── ModelSelector (cloud models)
│   ├── GenerationModeToggle (Cloud/Local)
│   ├── LocalModelSelector (local models)
│   └── Generation History Button → JobHistoryPanel
├── ImageBuilder (cloud image)
│   ├── StandardImageBuilder (DALL-E, A1111, ComfyUI)
│   ├── GrokBuilder (Grok/Aurora specific)
│   └── MidjourneyBuilder (Midjourney specific)
├── VideoBuilder (cloud video)
├── LocalImageBuilder (local generation)
├── JobHistoryPanel (Generation History)
│   ├── Job Cards with variation/sequence badges
│   ├── JobDetailModal
│   │   ├── CreateJobVariationDialog
│   │   ├── Save as Scene (preserves metadata)
│   │   └── Variation/Sequence badges
│   └── CreateJobSequenceDialog
├── SceneManager (Legacy - Still Functional)
│   ├── Scene Cards
│   └── SceneDetailModal
│       ├── CreateVariationDialog (deprecated)
│       └── CreateSequenceDialog (deprecated)
└── SettingsModal
    ├── Enhancement tab (AI enhancement settings)
    └── Generation tab (image/video generation providers)
```

### AI Enhancement System

**Two-tier provider system**:
1. **Enhancement providers** (Settings → Enhancement tab): Claude, GPT, Gemini - for prompt improvement
2. **Generation providers** (Settings → Generation tab): OpenAI, Google Veo, Grok - for content creation

**Flow**:
1. User clicks "Enhance" button
2. Frontend calls `callAI()` from `src/utils/aiApi.js`
3. `aiApi.js` invokes Tauri `call_ai` command
4. Rust backend makes actual API call (avoids CORS)
5. Enhanced prompt returned to frontend

**Configuration**: Stored in `localStorage` as `promptcraft_ai_settings` with structure:
```json
{ "provider": "anthropic", "key": "sk-...", "model": "claude-3-5-sonnet-20241022", "baseUrl": "" }
```

### Model Configuration System

Models defined in `src/constants/models.js`:

**Structure**:
```javascript
{
  id: 'gpt-image-1-mini',
  name: 'GPT Image Mini',
  provider: 'openai',
  category: 'image', // or 'video'
  tier: 'standard',  // or 'highQuality', 'premium', 'local'
  parameters: { /* model-specific params */ }
}
```

**Helpers**:
- `getModelById(id)` - Get model config
- `getModelProvider(id)` - Get provider name
- `DEFAULT_MODELS.image`, `DEFAULT_MODELS.video` - Default selections

### Local Tool Integration

**Configuration**: `src/utils/localToolConfig.js` stores local tool settings in localStorage:
```javascript
{
  comfyui: { enabled: true, apiUrl: 'http://127.0.0.1:8188' },
  a1111: { enabled: false, apiUrl: 'http://127.0.0.1:7860' },
  invokeai: { enabled: false, apiUrl: 'http://127.0.0.1:9090' }
}
```

**Model Discovery**: `src/utils/localModelDiscovery.js` - Fetches available models from local tools via API.

### Database Schema (SQLite)

Located in `src-tauri/src/db/`:

**Tables**:
- `providers` - API provider configurations (keys, settings)
- `jobs` - Generation job queue (status, results, errors, **variation/sequence metadata in `data` JSON field**)
- `workflows` - Saved workflow templates
- `scenes` - Scene organization (project grouping)

**Rust modules**:
- `schema.rs` - Table definitions
- `models.rs` - Struct definitions (includes `UpdateJobInput` with `data` field)
- `operations.rs` - CRUD operations (enhanced `JobOps::update()` for metadata)

**Recent Changes**:

- Added `data: Option<serde_json::Value>` to `UpdateJobInput` struct in [models.rs](src-tauri/src/db/models.rs)
- Enhanced `JobOps::update()` in [operations.rs](src-tauri/src/db/operations.rs) to handle JSON metadata updates
- **No schema migration required** - existing `jobs.data` TEXT column stores all variation/sequence metadata

### Embedded UI Library

`src/lib/promptcraft-ui/` is a **vendored copy** of [@promptcraft/ui](https://github.com/c0dezer019/promptcraft-ui) merged directly into this repo for easier maintenance.

**Structure**:
- `components/` - Reusable UI components (atoms, molecules, organisms)
- `hooks/` - Shared hooks (`usePromptManager`, `useGeneration`, `usePlatform`)
- `constants/` - Tag categories, node templates, samplers
- `utils/` - Export helpers, workflow parsers

**When editing**: Modifications here won't sync back to upstream @promptcraft/ui.

## Important Patterns

### Adding a New Model

1. Add to `src/constants/models.js` in appropriate tier array
2. Update `getModelById` and `getModelProvider` if needed
3. If model needs custom UI, create specialized builder (like GrokBuilder.jsx)
4. Add provider support in Rust (`src-tauri/src/generation/providers/`)

### Adding AI Provider Support

1. **Frontend**: Update `src/utils/aiApi.js` default models
2. **Backend**: Add provider module in `src-tauri/src/generation/providers/`
3. **Settings**: Update SettingsModal provider list
4. **Docs**: Update enhancement provider list in README

### Working with Jobs Pattern

Use the `useJobs` hook for all job-related operations:

```javascript
import { useJobs } from '../hooks/useJobs';

const MyComponent = () => {
  const { jobs, loading, createJobVariation, saveJobAsScene } = useJobs();

  // Load jobs on mount
  useEffect(() => {
    loadJobs('default'); // or specific workflow ID
  }, []);

  // Create variation from a job
  const handleCreateVariation = async (parentJob) => {
    await createJobVariation(parentJob, {
      promptModification: "at sunset with warm lighting",
      useAsReference: true,
      variationNotes: "Testing golden hour lighting"
    });
  };

  // Save job as scene
  const handleSaveAsScene = async (job) => {
    await saveJobAsScene(job, "My Scene Name");
  };
};
```

**Job Metadata Structure**:

```javascript
// Variation metadata
job.data.variationOf = "parent-job-id";
job.data.variationNotes = "User notes";

// Sequence metadata
job.data.sequenceId = "sequence-uuid";
job.data.sequenceOrder = 1;
job.data.sequenceName = "Day to Night Transition";
```

### Prompt Flow Pattern

All builders follow this pattern:
```javascript
// Receive prompt as prop from App.jsx
const MyBuilder = ({ prompt, setPrompt, modifiers, setModifiers }) => {
  // Local enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhance = async () => {
    const result = await callAI(prompt, systemPrompt);
    setPrompt(result); // Updates parent via prop
  };

  // Render prompt textarea, enhance button, modifiers, etc.
};
```

### Platform Detection

Use `usePlatform` hook to detect environment:

```javascript
const { platform, isDesktop, isWeb } = usePlatform();
// platform: 'tauri' | 'web'
// isDesktop: true if Tauri
// isWeb: true if browser
```

Tauri features (API calls, file system) only work when `isDesktop === true`.

## Job-Based Workflow (New Architecture)

**Recommended Workflow**:

1. **Generate** - Create image/video with any provider
2. **Iterate** - Create variations from Generation History (JobHistoryPanel)
3. **Sequence** - Group related generations into named sequences
4. **Save** - Save completed jobs as scenes for long-term storage

**Why Job-Based**:

- Variations don't clutter scene library
- Natural workflow: iterate in history, save when satisfied
- Metadata preservation (variation relationships, sequence info)
- No artificial scene creation for every variation

**Legacy Scene-Based Workflow** (Still functional but deprecated):

- Create scenes manually
- Create variations from scenes
- Scene-based sequences

## Testing Job Features

Test the new job-based variation and sequence system:

```bash
# Start Tauri dev environment
pnpm tauri:dev
```

**Test Job Variations**:

1. Generate an image with any provider
2. Open Generation History panel (clock icon in TopNav)
3. Click on a completed generation
4. Click "Create Variation" (purple button)
5. Modify prompt and optionally use parent as reference
6. Verify new job appears in history with purple "Variation" badge

**Test Named Sequences**:

1. Generate 3+ related images (e.g., "forest at dawn", "forest at noon", "forest at sunset")
2. Open Generation History
3. Click "Create Sequence" button
4. Drag jobs from left panel to right panel
5. Reorder using drag-and-drop or up/down buttons
6. Enter sequence name (e.g., "Day Progression")
7. Verify all jobs show blue sequence badges with name and position

**Test Save as Scene**:

1. View a variation or sequence item in JobDetailModal
2. Click "Save as Scene"
3. Enter scene name
4. Verify scene appears in Scene Manager
5. Verify metadata (variation/sequence info) is preserved

## Common Gotchas

1. **Prompt not persisting**: Ensure you're using `activeCategory` as the prompt key, not model-specific keys
2. **AI enhancement not working**: Must run `pnpm tauri:dev`, not `pnpm dev`
3. **CORS errors**: AI calls must route through Rust backend (`src/utils/aiApi.js` → `invoke('call_ai')`)
4. **Local models not showing**: Check localStorage `local_tool_config`, ensure tool is running and `enabled: true`
5. **Modal dialogs**: Always check `isOpen` prop and `onClose` handler
6. **Job metadata not saving**: Ensure you're updating the entire `data` object when modifying variation/sequence metadata
7. **Variations showing as regular jobs**: Check that `variationOf` field is set in `job.data`
8. **Sequence badges not showing**: Verify all three fields are present: `sequenceId`, `sequenceOrder`, `sequenceName` (optional but recommended)

## Testing Local Features

Since this is a desktop app, most features require Tauri:

1. **Start Tauri dev**: `pnpm tauri:dev`
2. **Open DevTools**: Right-click → Inspect Element
3. **Check Tauri invoke calls**: Console will show `[aiApi]` logs
4. **Test local tools**: Start ComfyUI/A1111 locally first
5. **Database inspection**: SQLite DB at `~/.local/share/com.brian.desktop/` (Linux)

## File Organization Logic

- `src/components/builders/` - Core builder components (ImageBuilder, LocalImageBuilder)
- `src/components/features/` - Feature-specific UI (ImageAnalysis, SceneManager, LocalToolSetup, JobHistoryPanel, JobDetailModal)
- `src/components/features/jobs/` - **Job-based features** (CreateJobVariationDialog, CreateJobSequenceDialog)
- `src/components/features/scenes/` - **Legacy scene features** (CreateVariationDialog, CreateSequenceDialog - deprecated)
- `src/components/navigation/` - Navigation components (TopNav, TabBar, selectors)
- `src/hooks/` - App-specific hooks (useProviders, useLocalModels, **useScenes**, **useJobs**)
- `src/utils/` - App-specific utilities (aiApi, localToolConfig, localModelDiscovery)
- `src/constants/` - Configuration (models.js)
- `src-tauri/src/` - Rust backend (commands, database, generation providers)
- `src-tauri/src/generation/utils.rs` - **Multi-reference image extraction** (extract_reference_images)
