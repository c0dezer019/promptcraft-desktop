# Scene Manager - Documentation

## Overview

The Scene Manager is a comprehensive system for managing AI generation scenes in PromptCraft Desktop. It provides a CivitAI-style interface for browsing, organizing, and managing your generation history with support for variations, sequences, and detailed metadata.

## Features

### 1. **Tiled Grid View**

- Beautiful grid layout displaying scene thumbnails
- Overlay information: title, model, size, generation count
- Hover effects showing tags and creation date
- Responsive design with multiple column layouts

### 2. **Advanced Search & Filtering**

- Full-text search across scene names, prompts, and tags
- Filter by category (Images/Videos)
- Filter by AI model
- Filter by tags (multiple selection)
- Clear active filters with one click

### 3. **Detailed Scene View (CivitAI-style)**

- Full-size image/video display
- Complete prompt information (main, negative, enhancers)
- Generation settings and parameters
- ComfyUI/A1111 sampler settings
- Custom notes and tags
- Multiple generations per scene with navigation

### 4. **Variations & Sequences**

- **Variations**: Create alternative versions of a scene
- **Sequences**: Organize scenes into timelines (before/after shots)
- Visual relationship display in detail modal
- Easy navigation between related scenes

### 5. **Scene Actions**

- **Load Scene**: Restore prompt and settings to builder
- **Delete Scene**: Remove scene from database
- **Copy Prompts**: Copy individual prompt fields to clipboard
- **Download**: Save generated images/videos

## Data Structure

### Scene Schema

```javascript
{
  id: "uuid",                    // Unique scene identifier
  workflow_id: "default",        // Workflow association
  name: "Epic Battle Scene",     // Scene title
  created_at: "2025-12-05T...",  // ISO timestamp
  thumbnail: "base64..." | "url", // Scene preview image

  data: {
    // Basic Info
    category: "image" | "video",
    model: "gpt-image-1",

    // Prompt Data
    prompt: {
      main: "A dramatic battle scene...",
      negative: "blurry, low quality",
      modifiers: ["cinematic", "4k"],
      params: {
        size: "1024x1024",
        steps: 30,
        cfg_scale: 7.5,
        seed: 12345
      },
      nodes: [...]  // ComfyUI nodes
    },

    // Metadata
    metadata: {
      tags: ["action", "fantasy", "dramatic"],
      notes: "User notes about this scene",

      // Variations
      variationOf: "parent-scene-id",  // If this is a variation

      // Sequences
      sequenceId: "sequence-uuid",     // Group ID for sequence
      sequenceOrder: 1                 // Position in sequence (0-based)
    },

    // Associated Jobs
    jobs: ["job-id-1", "job-id-2"]
  }
}
```

### Creating Variations

To create a variation of an existing scene:

```javascript
const variation = await createScene(
  "Battle Scene - Variation 1",
  {
    ...originalScene.data,
    prompt: {
      ...originalScene.data.prompt,
      main: "Modified prompt..."
    },
    metadata: {
      ...originalScene.data.metadata,
      variationOf: originalScene.id,
      tags: [...originalScene.data.metadata.tags, "variation"]
    }
  },
  thumbnailBase64
);
```

### Creating Sequences

To create a sequence of related scenes:

```javascript
const sequenceId = crypto.randomUUID();

// Scene 1 (beginning)
await createScene("Battle - Opening Shot", {
  category: "image",
  model: "gpt-image-1",
  prompt: { main: "Characters approaching..." },
  metadata: {
    sequenceId,
    sequenceOrder: 0,
    tags: ["sequence", "opening"]
  }
}, thumbnail1);

// Scene 2 (middle)
await createScene("Battle - Combat", {
  category: "image",
  model: "gpt-image-1",
  prompt: { main: "Intense fighting..." },
  metadata: {
    sequenceId,
    sequenceOrder: 1,
    tags: ["sequence", "action"]
  }
}, thumbnail2);

// Scene 3 (end)
await createScene("Battle - Aftermath", {
  category: "image",
  model: "gpt-image-1",
  prompt: { main: "Smoke clearing..." },
  metadata: {
    sequenceId,
    sequenceOrder: 2,
    tags: ["sequence", "conclusion"]
  }
}, thumbnail3);
```

## Component Architecture

```text
SceneManager (src/components/features/SceneManager.jsx)
├── useScenes hook (src/hooks/useScenes.js)
├── SceneCard (src/components/features/scenes/SceneCard.jsx)
├── SceneDetailModal (src/components/features/scenes/SceneDetailModal.jsx)
│   └── SceneRelations (src/components/features/scenes/SceneRelations.jsx)
└── TopNav integration (Scene Manager button)
```

## Usage Examples

### Opening Scene Manager

Click the grid icon in the top navigation bar, or programmatically:

```javascript
setShowSceneManager(true);
```

### Creating a Scene Programmatically

```javascript
import { useScenes } from './hooks/useScenes';

function MyComponent() {
  const { createScene } = useScenes();

  const saveCurrentGeneration = async () => {
    await createScene(
      "My Amazing Generation",
      {
        category: "image",
        model: currentModel,
        prompt: {
          main: promptText,
          negative: negativePrompt,
          modifiers: enhancers,
          params: { size: "1024x1024" }
        },
        metadata: {
          tags: ["fantasy", "landscape"],
          notes: "Generated for portfolio"
        }
      },
      generatedImageUrl
    );
  };
}
```

### Loading a Scene

When a user clicks "Load Scene" in the detail modal, the scene's prompt and settings are restored to the builder:

```javascript
const handleLoadScene = (scene) => {
  const { category, model, prompt } = scene.data;

  // Switch to correct tab
  setActiveCategory(category);

  // Set model
  setSelectedModel(model);

  // Restore prompt
  updatePrompt('main', prompt.main);
  updatePrompt('negative', prompt.negative);
  updatePrompt('modifiers', prompt.modifiers);
  updatePrompt('params', prompt.params);
};
```

### Filtering Scenes

```javascript
const { filterScenes } = useScenes();

// Search by text
const results = filterScenes({ search: "battle" });

// Filter by model
const dalleScenes = filterScenes({ model: "gpt-image-1" });

// Filter by tags
const fantasyScenes = filterScenes({ tags: ["fantasy"] });

// Combined filters
const filtered = filterScenes({
  search: "epic",
  category: "image",
  model: "gpt-image-1",
  tags: ["fantasy", "4k"]
});
```

## Database Integration

The Scene Manager uses the existing Tauri SQLite database. The `scenes` table schema:

```sql
CREATE TABLE scenes (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  name TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON blob
  thumbnail TEXT,      -- base64 or URL
  created_at TEXT NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);
```

Tauri commands used:

- `create_scene` - Create new scene
- `list_scenes` - Load all scenes for workflow
- `delete_scene` - Delete scene by ID
- `list_jobs` - Get generations for a scene

## Future Enhancements

### Planned Features

1. **Auto-save**: Automatically create scenes from successful generations
2. **Scene Collections**: Group scenes into folders/projects
3. **Batch Operations**: Select and delete multiple scenes
4. **Export/Import**: Share scene libraries
5. **Scene Comparison**: Side-by-side view of variations
6. **Smart Tags**: AI-powered tag suggestions
7. **Version Control**: Track prompt iterations

### Backend Additions Needed

1. `update_scene` Tauri command for editing scenes
2. Scene search indexing for better performance
3. Thumbnail generation pipeline
4. Scene analytics (most used models, tags, etc.)

## Keyboard Shortcuts (Planned)

- `Cmd/Ctrl + K` - Open Scene Manager
- `Esc` - Close modals
- `Arrow Keys` - Navigate scenes in detail view
- `Cmd/Ctrl + C` - Copy prompt
- `Cmd/Ctrl + S` - Save current state as scene
- `/` - Focus search bar

## Styling

The Scene Manager follows PromptCraft's design system:

- **Colors**: Indigo/Purple gradients for primary actions
- **Dark Mode**: Full support with tailwind dark: classes
- **Responsive**: Mobile-first design with breakpoints
- **Animations**: Smooth transitions and hover effects
- **Accessibility**: Keyboard navigation and ARIA labels

## Contributing

To add new features to the Scene Manager:

1. **Add state** to `useScenes` hook if needed
2. **Update data schema** in this document
3. **Add UI components** to `src/components/features/scenes/`
4. **Test** with both light and dark modes
5. **Document** new features in this file

---

Built with ❤️ for PromptCraft Desktop
