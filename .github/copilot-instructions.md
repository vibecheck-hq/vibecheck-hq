<!-- === [1/3] FILE: .github/copilot-instructions.md === -->
# Mandatory Pre-Flight Audit & Shared-Backend Guardrails

## 1. Audit Before Writing Code (Hard Stop)
Before proposing, generating, or editing ANY code, SQL, or workflow file:
1. Inspect the relevant existing files in this repo (`supabase/config.toml`, `.github/workflows/`, `src/lib/hybridClient.ts`, and target `supabase/functions/*`).
2. Output a concise **Pre-Flight Audit Summary** listing:
   - Exact files inspected
   - Existing tables, RPCs, Edge Functions, or workflows touched
   - Any conflicts, destructive risks, or missing env vars
3. Do NOT output edits until the audit confirms zero conflicts with shared services.

## 2. Shared Supabase Project Isolation (`qnnnnvlissdqdwmkgrao`)
- This Supabase project also hosts a separate app (**FeelCue**).
- NEVER delete, overwrite, or prune `spotify-vibe-curate`, `telemetry-api`, `spotify_vibe_feedback`, `mindpaper_sessions`, or `telemetry_logs`.
- Keep all SQL migrations strictly additive (`ADD COLUMN IF NOT EXISTS` with safe defaults). NEVER emit `DROP TABLE`, `TRUNCATE`, or destructive `ALTER` statements without explicit operator approval.
- Prefer new versioned Edge Functions (e.g., `decode-subtext-v2`) over overwriting working endpoints in place.

## 3. Stack, Model & Security Invariants
- **Allowed frontend packages only:** `react`, `react-dom`, `@supabase/supabase-js`, `lucide-react`, `vite`, `tailwindcss`, `typescript`. NEVER install `recharts`, `zustand`, or `@vercel/speed-insights`.
- **Gemini models:** Use `gemini-3.5-flash-lite` (standard, omit `thinkingConfig`) and `gemini-3.8-flash` (deep/multimodal, `thinkingLevel: "LOW"` — NEVER `"MINIMAL"`). Always parse non-thought parts (`!p.thought`) and read `Deno.env.get("GEMINI_API_KEY")?.trim()` inside request handlers.
- **Security:** Enforce null-safe RLS (`auth.uid() IS NOT NULL AND auth.uid() = user_id`), strict `ALLOWED_ORIGINS` CORS (never `*` on production client endpoints), and `verify_jwt = false` ONLY on `stripe-webhook`.
