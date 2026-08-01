# MASTER PROMPT INDEX — Tracking & Metrilytics Enhancement
**Date:** 2026-08-01 | **Total Prompts:** 20 (10 Tracking + 10 Metrilytics) | **Agents:** 2x KIMI K3 + AdaL

---

## WORKFLOW
1. Copy prompt content from file
2. Send to Agent 1 (KIMI K3 in CLI 1) or Agent 2 (KIMI K3 in CLI 2)
3. Agent implements, tests, verifies
4. Repeat for all 20 prompts
5. Final integration & testing

---

## TRACKING PAGE PROMPTS (10)

| # | File | Feature | Complexity | Est. Time |
|---|------|---------|------------|-----------|
| 01 | `prompts_tracking_01.md` | Exchange Netflow Aggregates Panel | Medium | 2-3h |
| 02 | `prompts_tracking_02.md` | Smart Money Analytics Panel | High | 3-4h |
| 03 | `prompts_tracking_03.md` | Address Risk Scoring & Counterparty Graph | High | 3-4h |
| 04 | `prompts_tracking_04.md` | Enhanced Weekly Volume Chart | Medium | 2-3h |
| 05 | `prompts_tracking_05.md` | Stablecoin Flow Monitor Panel | Medium | 2-3h |
| 06 | `prompts_tracking_06.md` | Cross-Chain Entity Resolution | High | 4-5h |
| 07 | `prompts_tracking_07.md` | Real-Time Alert System | High | 3-4h |
| 08 | `prompts_tracking_08.md` | Advanced Search & Filter System | High | 3-4h |
| 09 | `prompts_tracking_09.md` | Token-Level Drill-Down | Medium | 2-3h |
| 10 | `prompts_tracking_10.md` | Entity Intelligence Report | High | 4-5h |

**Tracking Total Est:** 28-38 hours

---

## METRILYTICS PAGE PROMPTS (10)

| # | File | Feature | Complexity | Est. Time |
|---|------|---------|------------|-----------|
| 01 | `prompts_metrilytics_01.md` | Real Liquidations Panel | High | 3-4h |
| 02 | `prompts_metrilytics_02.md` | ETF Flows & Institutional Holdings | Medium | 2-3h |
| 03 | `prompts_metrilytics_03.md` | Protocol Comparison Tool | Medium | 2-3h |
| 04 | `prompts_metrilytics_04.md` | Enhanced Yield Screen | Medium | 2-3h |
| 05 | `prompts_metrilytics_05.md` | Correlation Matrix | Medium | 2-3h |
| 06 | `prompts_metrilytics_06.md` | Options Flow & Greeks | High | 4-5h |
| 07 | `prompts_metrilytics_07.md` | Perp DEX Analytics | High | 3-4h |
| 08 | `prompts_metrilytics_08.md` | Stablecoin Deep Dive | Medium | 2-3h |
| 09 | `prompts_metrilytics_09.md` | Governance Monitor | High | 3-4h |
| 10 | `prompts_metrilytics_10.md` | MEV & Sandwich Analytics | High | 4-5h |

**Metrilytics Total Est:** 27-37 hours

---

## RECOMMENDED EXECUTION ORDER

### Phase 1: Foundation (Prompts 01-04)
**Agent 1 (Tracking):** 01 → 02 → 03 → 04
**Agent 2 (Metrilytics):** 01 → 02 → 03 → 04

These build core infrastructure and are independent.

### Phase 2: Advanced Features (Prompts 05-07)
**Agent 1 (Tracking):** 05 → 06 → 07
**Agent 2 (Metrilytics):** 05 → 06 → 07

These require Phase 1 components but add significant value.

### Phase 3: Polish & Integration (Prompts 08-10)
**Agent 1 (Tracking):** 08 → 09 → 10
**Agent 2 (Metrilytics):** 08 → 09 → 10

These are complex integrations requiring solid foundation.

---

## AGENT INSTRUCTIONS

### For KIMI K3 Agents:
1. **Read the prompt file completely** before starting
2. **Follow the role:** You are a senior on-chain engineer with 20 years experience
3. **Implement exactly as specified** — don't skip sections
4. **Test your changes:** Run `pnpm run dev` and verify the feature works
5. **Check for regressions:** Ensure existing features still work
6. **Report completion:** Summarize what was built, files changed, any issues

### Quality Checklist:
- [ ] Code follows existing patterns (Tailwind, recharts, terminal aesthetic)
- [ ] No console.log in final code
- [ ] Edge cases handled (empty states, loading, errors)
- [ ] Responsive within desktop-only constraint
- [ ] No new npm dependencies unless specified
- [ ] API endpoints return proper TypeScript types
- [ ] DB migrations are reversible (if any)

---

## SHARED CONTEXT FOR ALL AGENTS

**Project:** Novrix — On-chain intelligence terminal
**Stack:** Next.js 16, Cloudflare Pages/Workers/D1, Tailwind v4, Recharts, Framer Motion
**Design:** Terminal aesthetic, JetBrains Mono font, amber/blue/green/red color scheme
**Constraint:** Desktop-only (no mobile responsive work)

**Key Files:**
- `components/tracking/TrackingBody.tsx` (2429 lines)
- `components/metrilytics/MetrilyticsBody.tsx` (3177 lines)
- `functions/api/tracking/*.ts`
- `functions/api/metrilytics/*.ts`
- `workers/tracking-cron/index.ts`
- `workers/metrilytics-cron/index.ts`

**Color Palette:**
- Primary: `#E8960C` (amber)
- Secondary: `#38BDF8` (blue)
- Success: `#22C55E` (green)
- Danger: `#C2344D` (red)
- Text: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-ghost)`

---

## COMPLETION TRACKING

| Prompt | Agent | Status | Completed | Notes |
|--------|-------|--------|-----------|-------|
| T-01 | | ⬜ | | |
| T-02 | | ⬜ | | |
| T-03 | | ⬜ | | |
| T-04 | | ⬜ | | |
| T-05 | | ⬜ | | |
| T-06 | | ⬜ | | |
| T-07 | | ⬜ | | |
| T-08 | | ⬜ | | |
| T-09 | | ⬜ | | |
| T-10 | | ⬜ | | |
| M-01 | | ⬜ | | |
| M-02 | | ⬜ | | |
| M-03 | | ⬜ | | |
| M-04 | | ⬜ | | |
| M-05 | | ⬜ | | |
| M-06 | | ⬜ | | |
| M-07 | | ⬜ | | |
| M-08 | | ⬜ | | |
| M-09 | | ⬜ | | |
| M-10 | | ⬜ | | |

---

**Next Step:** Copy prompt content and send to agents. Start with Phase 1 prompts.
