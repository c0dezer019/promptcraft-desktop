# Anthropic API Integration Fix

This document explains how the Anthropic API integration was fixed to resolve CORS errors in the Tauri desktop application.

## Problem

The application was experiencing CORS errors when trying to call the Anthropic API from the browser:

```
[Error] Preflight response is not successful. Status code: 400
[Error] Fetch API cannot load https://api.anthropic.com/v1/messages due to access control checks.
```

This occurred because the `@promptcraft/ui` library was attempting to make direct API calls from the browser to the Anthropic API, which doesn't allow cross-origin requests from web applications.

## Solution

The solution routes all Anthropic API calls through the Tauri Rust backend, which doesn't have CORS restrictions since it's server-side code.

### Changes Made

#### 1. Backend (Rust) Changes

**New Files:**
- [`src-tauri/src/generation/providers/anthropic.rs`](src-tauri/src/generation/providers/anthropic.rs) - Anthropic provider implementation

**Modified Files:**
- [`src-tauri/src/generation/providers/mod.rs`](src-tauri/src/generation/providers/mod.rs:1) - Added Anthropic module
- [`src-tauri/src/generation/mod.rs`](src-tauri/src/generation/mod.rs:86-90) - Added Anthropic to provider configuration
- [`src-tauri/src/commands.rs`](src-tauri/src/commands.rs:210-244) - Added `call_ai` Tauri command
- [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs:9-12) - Imported and registered Anthropic provider

#### 2. Frontend (JavaScript) Changes

**New Files:**
- [`src/utils/aiApi.js`](src/utils/aiApi.js) - Tauri-compatible wrapper for AI API calls

**Modified Files:**
- [`src/components/MidjourneyBuilder.jsx`](src/components/MidjourneyBuilder.jsx:8) - Updated import to use local wrapper
- [`src/components/VideoBuilder.jsx`](src/components/VideoBuilder.jsx:8) - Updated import to use local wrapper
- [`src/components/builders/ImageBuilder.jsx`](src/components/builders/ImageBuilder.jsx:8) - Updated import to use local wrapper
- [`src/components/GrokBuilder.jsx`](src/components/GrokBuilder.jsx:7) - Updated import to use local wrapper
- [`src/components/features/ImageAnalysis.jsx`](src/components/features/ImageAnalysis.jsx:3) - Updated import to use local wrapper

### How It Works

1. **Frontend calls `callAI()`** - The enhance button and other features call the local `callAI` function from `src/utils/aiApi.js`

2. **Wrapper invokes Tauri command** - The wrapper checks if running in Tauri and calls the `call_ai` Tauri command

3. **Backend makes API request** - The Rust backend receives the command and makes the HTTP request to Anthropic's API

4. **Response returned to frontend** - The backend returns the generated text back to the frontend

### Configuration Required

Before using the enhance feature, you need to configure your Anthropic API key:

1. Open Settings in the application
2. Go to the **Enhancement** tab (not Generation)
3. Select "Anthropic" as the provider from the dropdown
4. Enter your Anthropic API key in the API Key field
5. Click Save

**Important:** Anthropic/Claude only appears in the **Enhancement** section because it's used for prompt enhancement (text-to-text generation), not for image or video generation. The **Generation** tab is only for providers that create images or videos (OpenAI, Google, Grok, etc.).

When you save your Anthropic API key in the Enhancement tab, the Settings modal automatically configures it in the Tauri backend through the `configure_provider` command ([SettingsModal.jsx:102-112](src/components/SettingsModal.jsx#L102-L112)), making it available for all enhance button features throughout the app.

### Supported Models

The Anthropic provider supports all Claude models:
- `claude-3-5-sonnet-20241022` (default)
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`
- And other Claude models

### API Parameters

The `call_ai` command accepts these parameters:

- `provider` - AI provider name (e.g., 'anthropic')
- `model` - Model identifier
- `prompt` - The full prompt text
- `max_tokens` - Maximum tokens to generate (optional, default: 4096)
- `temperature` - Temperature for generation (optional, default: 1.0)

### Testing

To test the integration:

1. Build and run the application
2. Configure your Anthropic API key in settings
3. Try using the enhance button on any prompt
4. The enhanced text should be generated without CORS errors

### Fallback Behavior

If running in a non-Tauri environment (web mode), the `callAI` function will throw an error indicating that a Tauri environment or proxy server is required. This ensures developers are aware that direct API calls won't work in the browser.

## Benefits

1. **No CORS issues** - Backend calls bypass browser CORS restrictions
2. **Secure API keys** - Keys stored in backend, not exposed to browser
3. **Consistent pattern** - Can extend to other AI providers (OpenAI, Google, etc.)
4. **Future-proof** - Easy to add middleware, rate limiting, caching, etc.

## Future Improvements

- Add response streaming support for real-time generation feedback
- Implement request caching to reduce API costs
- Add rate limiting and request queuing
- Support for vision/image analysis with Claude
