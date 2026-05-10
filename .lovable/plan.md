The app is not “broken” in the sense of a crash — it is trapped in an over-aggressive quality loop.

What’s happening:
- DeepSeek generated a huge article, hit `finish_reason=length`, then the engine stitched a continuation.
- The article reached Phase 11, but the checklist scored `72/100` with `5 mandatory failures`.
- Instead of finishing with warnings or doing a tiny targeted repair, Phase 11 launches another full article generation.
- Because DeepSeek/OpenRouter is configured as a slow model with long timeout/resume behavior, that second full rewrite can run for many more minutes.
- Phase 7 also has a hardcoded self-critique path that can perform up to 6 full rewrite passes, ignoring the UI’s intended performance controls.

Plan:

1. Add enterprise runtime budgets
- Add a global generation deadline so a single article cannot silently run for 30+ minutes.
- Add per-phase timing logs: generation, critique, fact-check, media, references, checklist, repair.
- If the budget is near exhaustion, finalize the best current article with checklist warnings instead of launching another massive LLM call.

2. Stop full-article rewrite loops
- Change Phase 11 checklist auto-retry from “generate the entire article again” to “generate/patch only the missing sections”.
- Limit checklist repair to one short bounded attempt.
- If mandatory failures remain, save the generated article and surface the checklist failures clearly in Review & Export instead of continuing indefinitely.

3. Respect Strategy performance toggles
- Make `enableSelfCritique` and `maxCritiquePasses` actually control Phase 7.
- Default self-critique to 1 pass for speed/reliability.
- Remove the hidden aggressive second 3-pass critique unless the user explicitly chooses a max-quality mode.

4. Make slow model handling sane
- Reduce DeepSeek/OpenRouter slow-model ceilings to practical enterprise limits.
- Lower continuation count for OpenRouter/DeepSeek so one model cannot monopolize the whole job.
- Add fail-fast logic when a stream restarts with zero tokens after keepalives.

5. Preserve quality without burning time
- Keep deterministic post-processing: visual breaks, references, internal links, schema, media, anti-AI phrase cleanup.
- Use LLM calls only where they materially improve the result.
- Prefer partial targeted repair over repeated full rewrites.

6. Improve progress credibility
- Update progress copy so the UI shows the real current phase and when it is doing a retry/repair.
- Surface “continuation”, “repair”, and “finalizing with warnings” states instead of looking like it is stuck.

Technical files to update:
- `src/lib/sota/SOTAContentGenerationEngine.ts`
- `src/lib/sota/EnterpriseContentOrchestrator.ts`
- `src/lib/sota/HumanQualityRefiner.ts`
- Possibly `src/components/optimizer/steps/ContentStrategy.tsx` if the Strategy UI needs clearer speed/quality defaults.

Expected outcome:
- No single article should run indefinitely or for 30+ minutes by default.
- DeepSeek/OpenRouter can still be used, but with hard safety rails.
- Failed checklist items become visible actionable warnings, not a hidden full-regeneration loop.
- Output remains high quality, but the pipeline becomes much faster, more predictable, and more enterprise-grade.