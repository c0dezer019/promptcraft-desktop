# CLAUDE.md

Guidance for Claude Code working in this repo.

## Project

PromptCraft Desktop — Tauri desktop app for AI prompt engineering. Image (DALL-E, Grok, Midjourney, Stable Diffusion) and video (Sora, Veo, Runway, Luma, Hailuo) generation. Cloud and local (ComfyUI/A1111/InvokeAI) modes.

## Commands

```bash
pnpm dev          # frontend only — no AI enhancement (CORS)
pnpm tauri:dev    # full app — required for AI enhancement/enhance button
pnpm tauri:build  # production build
pnpm build        # frontend build only
```

## Guidelines

- Do not refactor adjacent code, scope to task.
- Perform new feature integrations in new branches and create worktrees as needed.
- Open PR to merge to current branch. For example, if we are integrating a node feature in the workflows branch, you'd create a branch called workflows/nodes,
  implement feature and PR back into workflows base branch.


## Architecture Decisions

- Prompts stored by **category** (`image`/`video`), not by model — DALL-E/Grok/Midjourney share one `image` prompt so switching models keeps it. Key off `activeCategory`, never a model id. Legacy model-specific keys (`sora`, `dalle`, ...) kept only for back-compat.
- Current pattern: job-based variations/sequences, created from Generation History (`useJobs` hook), not scenes. Flow: Generate → iterate in History → save to Scenes. Scene-based variation/sequence (`components/features/scenes/`) is deprecated but still functional — don't extend it, extend `components/features/jobs/` instead.
- Variation/sequence metadata lives in the existing `jobs.data` JSON column — no schema migration needed. Fields: `variationOf`, `variationNotes`, `sequenceId`, `sequenceOrder`, `sequenceName`. When updating, write the whole `data` object — partial merges lose sibling fields.
- Multi-reference images (`parameters.reference_images[]`, per-image `strength`/`denoisingStrength`) only supported by Google Veo, ComfyUI, A1111, InvokeAI.
- `src/lib/promptcraft-ui/` is a vendored copy of `@promptcraft/ui`. Edits here don't sync upstream.

## Runtime Gotchas

- AI enhancement only works under `pnpm tauri:dev` — Rust backend (`call_ai`) makes the API call to dodge CORS; `pnpm dev` can't enhance.
- Sequence badge needs all three of `sequenceId`+`sequenceOrder`+`sequenceName`; variation badge needs `variationOf`.
- Local models missing: check localStorage `local_tool_config`, tool running, `enabled: true`.
- SQLite DB at `~/.local/share/com.brian.desktop/` (Linux).

## Repo Management

- When given an execution plan, or when an issue is found, use github-manager agent and assign it the duty of drafting and creating issues and tasks.
- Use github-manager for most github-related tasks (like creating PRs). 
- You perform git commands, github-manager performs gh commands.
