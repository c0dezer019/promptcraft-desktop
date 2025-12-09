# Troubleshooting Guide

## AI Enhancement Features Not Working

If the enhance button isn't working, check these common issues:

### 1. Not Running in Tauri Mode

**Error:** `AI enhancement requires Tauri desktop mode. Run: npm run tauri:dev`

**Solution:** You must run the app in Tauri mode for AI features to work:

```bash
# Wrong - only frontend, no backend
pnpm run dev

# Correct - full Tauri environment
pnpm run tauri:dev
```

The frontend-only dev server (`pnpm run dev`) doesn't include the Rust backend, so AI API calls won't work.

### 2. No API Key Configured

**Error:** `No API key configured for anthropic. Please configure it in Settings → Enhancement tab.`

**Solution:**

1. Open Settings (gear icon)
2. Go to **Enhancement** tab (not Generation)
3. Select your provider (e.g., Anthropic)
4. Enter your API key
5. Click Save

The app will automatically:
- Save the key to localStorage
- Configure it in the Tauri backend
- Use it for all enhance button calls

### 3. Wrong Provider Selected

The enhance button uses whichever provider is **currently selected in Settings → Enhancement tab**.

If you have an Anthropic API key but selected "Gemini" as the provider, it will try to use Gemini (and fail if you don't have a Gemini key).

**Solution:** Make sure the correct provider is selected in Settings.

### 4. Provider Configuration Failed

**Error in console:** `Failed to configure Anthropic provider: ...`

This means the Tauri backend couldn't configure the provider. Common causes:

- Invalid API key format
- Network issues
- Backend not running

**Solution:**
1. Check the Tauri console output for backend errors
2. Verify your API key is valid
3. Restart the app: `pnpm run tauri:dev`

### 5. API Call Failed

**Error:** `AI call failed: Provider not found: anthropic`

This means the provider isn't registered in the backend.

**Solution:**
1. Make sure you've rebuilt the Rust backend: `cd src-tauri && cargo build`
2. Restart the app
3. Re-save your API key in Settings

**Error:** `AI call failed: Anthropic API error (401): ...`

This means the API key is invalid or missing.

**Solution:**
1. Verify your API key is correct
2. Check your API key has credits/quota remaining
3. Re-enter the key in Settings

## Console Debugging

When you click the enhance button, look for these console messages:

### Success Flow
```
[aiApi] Calling Tauri backend: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
[aiApi] Success! Received response
```

### Provider Detection Issues
```
[aiApi] window.__TAURI__ not available: { windowExists: true, tauriExists: false }
```
→ You're not running in Tauri mode. Use `pnpm run tauri:dev`

### API Key Issues
```
Error: No API key configured for anthropic. Please configure it in Settings → Enhancement tab.
```
→ Configure your API key in Settings

### Backend Error
```
[aiApi] Tauri AI call failed: Provider not found: anthropic
```
→ Rebuild the backend: `cd src-tauri && cargo build`

## Provider-Specific Issues

### Anthropic (Claude)

- **Model:** `claude-3-5-sonnet-20241022` (default)
- **Location:** Settings → Enhancement tab
- **Common errors:**
  - `401 Unauthorized` - Invalid API key
  - `429 Too Many Requests` - Rate limit exceeded
  - `400 Bad Request` - Malformed request (check prompt length)

### OpenAI (GPT)

- **Model:** `gpt-4o` (default)
- **Location:** Settings → Enhancement tab
- **Common errors:**
  - `401 Unauthorized` - Invalid API key
  - `insufficient_quota` - No credits remaining

### Google (Gemini)

- **Model:** `gemini-2.0-flash-exp` (default)
- **Location:** Settings → Enhancement tab
- **Common errors:**
  - `API_KEY_INVALID` - Invalid API key
  - `RESOURCE_EXHAUSTED` - Quota exceeded

## Still Having Issues?

1. **Check browser console** - Press F12 and look for errors
2. **Check Tauri console** - Look at the terminal where you ran `pnpm run tauri:dev`
3. **Verify API key** - Test it directly with curl/Postman
4. **Rebuild everything:**
   ```bash
   # Clean build
   rm -rf node_modules/.vite
   cd src-tauri && cargo clean && cargo build
   cd .. && pnpm run tauri:dev
   ```

5. **Check the documentation:**
   - [ANTHROPIC_INTEGRATION.md](ANTHROPIC_INTEGRATION.md) - Anthropic setup details
   - [README.md](README.md) - General setup and usage

## Reporting Issues

If you're still stuck, please report an issue with:

1. Error messages from browser console
2. Error messages from Tauri console
3. Which provider you're trying to use
4. Steps to reproduce the issue
5. Your OS and Node.js version
