# AI Generation Implementation Plan

## Overview

Implement real API generation capabilities for OpenAI (gpt-image-1, Sora), Google Veo, and xAI Grok. Remove Midjourney generation (no official API available).

## Current Architecture Summary

### Backend (Rust/Tauri)
- **Generation Service** (`src-tauri/src/generation/mod.rs`): Manages providers, routes requests
- **Job Processor** (`src-tauri/src/generation/processor.rs`): Background worker that polls for pending jobs and executes generation
- **Providers** (`src-tauri/src/generation/providers/`): Individual provider implementations
  - `openai.rs` - Has DALL-E 3 implementation (needs update to gpt-image-1 + Sora)
  - `google.rs` - Stub only ("coming soon")
  - `grok.rs` - Stub only ("coming soon")
  - `midjourney.rs` - Stub only (to be removed)

### Frontend (React/@promptcraft/ui)
- **useGeneration hook**: Submits jobs via Tauri `submit_generation` command
- **useProviders hook**: Lists providers, provides display names and default models
- **useJobs hook**: Tracks job status and results
- **Builder components**: VideoBuilder, GrokBuilder, MidjourneyBuilder each have generate buttons
- **SettingsModal**: UI for configuring provider API keys

---

## Implementation Tasks

### Phase 1: Backend - Update Provider Implementations

#### 1.1 Update OpenAI Provider (`openai.rs`)
Replace DALL-E 3 with gpt-image-1 and add Sora video support.

**Changes:**
- Update `generate_dalle()` to use `gpt-image-1` model
- Update endpoint to `https://api.openai.com/v1/images/generations`
- Add new parameters: `quality` (low/medium/high), `size` options (1024x1024, 1536x1024, 1024x1536, auto)
- Add `generate_sora()` method for video generation
- Sora endpoint: `https://api.openai.com/v1/videos` (async polling required)
- Handle async video generation with status polling
- Update model matching in `generate()` to route to correct method

**API Reference - gpt-image-1:**
```rust
// POST https://api.openai.com/v1/images/generations
{
    "model": "gpt-image-1",
    "prompt": "...",
    "n": 1,
    "size": "1024x1024",  // or 1536x1024, 1024x1536, auto
    "quality": "high"     // low, medium, high
}
```

**API Reference - Sora:**
```rust
// POST https://api.openai.com/v1/videos
{
    "model": "sora-2",
    "prompt": "...",
    "duration": 5,        // seconds
    "resolution": "1080p" // or 720p
}
// Returns operation ID, must poll for completion
```

#### 1.2 Implement Google Veo Provider (`google.rs`)
Full implementation using Gemini API.

**Changes:**
- Implement `generate()` method with async polling pattern
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning`
- Support parameters: `aspectRatio`, `resolution`, `durationSeconds`
- Handle long-running operation polling

**API Reference:**
```rust
// POST to endpoint above with x-goog-api-key header
{
    "instances": [{
        "prompt": "...",
    }],
    "parameters": {
        "aspectRatio": "16:9",
        "resolution": "1080p",
        "durationSeconds": "8"
    }
}
// Returns operation, poll until done
```

#### 1.3 Implement xAI Grok Provider (`grok.rs`)
Full implementation for Aurora image generation.

**Changes:**
- Implement `generate()` method
- Endpoint: `https://api.x.ai/v1/images/generations`
- Support parameters: `n` (1-10 images), `response_format` (url/b64_json)
- Compatible with OpenAI SDK format

**API Reference:**
```rust
// POST https://api.x.ai/v1/images/generations
{
    "model": "grok-2-image",
    "prompt": "...",
    "n": 1,
    "response_format": "url"
}
```

#### 1.4 Remove Midjourney Provider
- Delete `src-tauri/src/generation/providers/midjourney.rs`
- Update `src-tauri/src/generation/providers/mod.rs` to remove midjourney module
- Update `src-tauri/src/generation/mod.rs` to remove midjourney from `configure_provider()`
- Update `src-tauri/src/lib.rs` to remove MidjourneyProvider import and registration

### Phase 2: Backend - Add Async Video Generation Support

#### 2.1 Update Generation Types (`mod.rs`)
Add support for long-running operations.

**Changes:**
- Add `GenerationStatus` enum: `Pending`, `Processing`, `Completed`, `Failed`
- Add `operation_id` field to `GenerationResult` for polling
- Add helper method for polling async operations

#### 2.2 Update Job Processor (`processor.rs`)
Handle async/polling-based generation.

**Changes:**
- Add polling loop for video generation jobs
- Track operation IDs in job metadata
- Implement exponential backoff for polling
- Add timeout handling (video generation can take minutes)

### Phase 3: Frontend Updates

#### 3.1 Update useProviders Hook
Update default models and display names.

**Changes to make in @promptcraft/ui (or override locally):**
```javascript
const getProviderDisplayName = {
  'openai': 'OpenAI',  // Covers both gpt-image-1 and Sora
  'google': 'Google Veo',
  'grok': 'Grok (xAI)',
  // Remove midjourney
};

const getDefaultModel = {
  'openai': 'gpt-image-1',  // Updated from dall-e-3
  'google': 'veo-3.1-generate-preview',
  'grok': 'grok-2-image',
  // Remove midjourney
};
```

#### 3.2 Update VideoBuilder Component
Pass correct models for Sora vs Veo.

**Changes:**
- Sora: model = 'sora-2', provider = 'openai'
- Veo: model = 'veo-3.1-generate-preview', provider = 'google'
- Pass video-specific parameters (duration, aspect ratio, resolution)

#### 3.3 Remove Midjourney from SettingsModal
Update the generation providers list.

**Changes:**
- Remove 'midjourney' from `genProviders` state
- Remove midjourney from `providerInfo` object

#### 3.4 Update MidjourneyBuilder Component
Remove AI Generation section entirely.

**Changes:**
- Remove `useGeneration` hook usage
- Remove `useProviders` hook usage
- Remove `usePlatform` hook usage (if only used for generation)
- Remove the "AI Generation" section at bottom
- Keep prompt building/enhancement functionality

### Phase 4: Output Display Improvements

#### 4.1 Update ResultDisplay Components
Differentiate between image and video display.

**Changes in VideoBuilder:**
- Use `<video>` tag for Sora/Veo results (already done)
- Add download button for videos
- Show generation progress for long-running operations

**Changes in GrokBuilder:**
- Ensure `<img>` tag for image results (already done)
- Add download button for images

---

## File Change Summary

### Rust Files to Modify:
1. `src-tauri/src/generation/providers/openai.rs` - Major update (gpt-image-1 + Sora)
2. `src-tauri/src/generation/providers/google.rs` - Full implementation
3. `src-tauri/src/generation/providers/grok.rs` - Full implementation
4. `src-tauri/src/generation/providers/mod.rs` - Remove midjourney
5. `src-tauri/src/generation/mod.rs` - Remove midjourney, add async support
6. `src-tauri/src/lib.rs` - Remove MidjourneyProvider

### Rust Files to Delete:
1. `src-tauri/src/generation/providers/midjourney.rs`

### Frontend Files (in @promptcraft/ui, may need local overrides):
1. `hooks/useProviders.js` - Update models and names
2. `components/organisms/VideoBuilder.jsx` - Pass correct parameters
3. `components/organisms/MidjourneyBuilder.jsx` - Remove generation section
4. `components/organisms/SettingsModal.jsx` - Remove midjourney

---

## Testing Checklist

- [ ] OpenAI gpt-image-1 generation works
- [ ] OpenAI Sora video generation works (if API access available)
- [ ] Google Veo video generation works
- [ ] xAI Grok image generation works
- [ ] Midjourney builder still functions for prompt crafting (no generation)
- [ ] Settings modal correctly shows only available providers
- [ ] Job status tracking works for async operations
- [ ] Generated content displays correctly (images and videos)
- [ ] Error handling displays meaningful messages

---

## Notes

1. **Sora API Access**: Limited availability - may need verification. Implementation should handle gracefully if access not available.

2. **Veo Pricing**: Paid preview only. Users need active billing on their Google Cloud/AI account.

3. **Async Video Generation**: Both Sora and Veo use long-running operations. The job processor needs to poll for completion rather than waiting synchronously.

4. **Rate Limits**: Consider adding rate limit handling and retry logic for all providers.

5. **Error Messages**: Provide clear user-facing messages for common errors (invalid API key, insufficient credits, rate limited, etc.)
