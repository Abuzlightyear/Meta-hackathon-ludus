# Meta Models, Art Pipeline, Credits, Security

## Relevant capabilities (to verify in current official portal)
- **Muse Wonder** runs as coding agent in existing terminal; changing its model does not select the model used by Professor D's app.
- **Meta Model API** credentials already saved via GitHub Codespaces secret `META_AI_API_KEY`; actual access and model endpoint availability must be verified with safe API use.
- **Muse Image** may support still image generation / editing in the portal, subject to API permission, credits and applicable terms. Do not hardcode an endpoint without verifying current official documentation. If approved, use it for Professor D master, expressions, academy environment and subject visuals.
- **Segmentation/masks (e.g. SAM family)** may be useful for separating art layers where available through a permitted route; availability and terms must be checked, do not assume it is connected simply because Muse Code is installed.
- **Voice** later: browser speechSynthesis as no-cost first prototype, selection and play/stop, deep distinguished British professor tone if installed; preserve coherent audio/captions. Browser voice quality varies. Any paid voice service requires permission.

## Credit handling — hard gate
Founder reports **$140 promotional/free Muse credits**. This is unverified by this packet. Before any billable call:
1. Locate exact current credit balance, expiry, what products it covers, spending mechanics, overage policy, and model prices in provider UI / official docs. Be clear whether Muse Code credits and Meta Model API credits are separate wallets.
2. Report proposed stage and projected maximum usage in credits/dollars; request founder approval of explicit *stage-specific allowance*, not the entire balance by default.
3. Implement usage tracking, per-request cap, retry cap, cache and stopping conditions. Never exceed a granted allowance; avoid infinite asset-generation loops.
4. Preserve remaining credit reserve for live AI teaching demo, QA and revisions. Spend on master assets first after approval rather than masses of disposable scenes.
5. Stop and ask if a model's credit eligibility, overage handling, or total charge cannot be reliably established. Credits are not blanket approval to spend outside the free grant.

## Security
- Keep keys server-side only. No key in browser JavaScript, tracked files, command lines/process arguments, screenshots, console output or AI agent messages.
- Prefer environment injection by Codespaces. Do not print credentials to verify; test presence as boolean, and use safe subprocess transport for authorized API calls.
- Repository is public or may be: never automatically commit/push proprietary specs or image assets unless founder explicitly approves visibility; `.env` and other secret files ignored.
- Images: maintain license/rights and creator/asset provenance for release; avoid imitating third-party copyrighted characters or artwork exactly.
