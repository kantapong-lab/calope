# Brief: food-photo-calories (researcher, round 1, verification pass 2)

Date: 2026-10-08. Level reached: **L3** (see end).

## Context (codebase)
- Repo is empty except `.claude/`; no stack, pattern, auth or config (`E:\projects\calope\.team\food-photo-calories\checkpoint.md:12`). L0 gives nothing; all choices are greenfield.
- Scope: first slice only = calories from a food photo (`checkpoint.md:7-9`).

## From the second brain
- [[Projects/calope/project]]: no Lessons yet. Open issue line 11: "Vision API provider/key and deploy target not chosen yet (needed before run-profile step 3d)". This brief answers the provider half; deploy target stays open.
- No overlapping project, no ADR in repo.

## Claude fact verification (runtime model, not agent tiers)
Method limits: the `claude-api` skill could NOT be loaded (this agent has no Skill tool; skill not present under repo `.claude` or user `.claude`), and WebFetch is blocked by a hook. Facts below come from the official `platform.claude.com` docs pages as returned by web search (page-level summaries), the closest available. Status per item:

| # | Fact | Status | Source |
|---|---|---|---|
| 1a | `claude-sonnet-5-5`: released 2026-09-28; $2 in / $10 out per MTok; 1M context; 128K output; text+image in | verified (docs search) | https://platform.claude.com/docs/en/models/sonnet-5-5/overview |
| 1b | `claude-haiku-5-5`: released 2026-10-07; $0.10 / $0.50 per MTok for prompts <=100K ($0.50 / $2.50 above); 1M context; 128K output; tokenizer ~30% more tokens than Haiku 4.5 | verified (docs search) | https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://platform.claude.com/docs/en/about-claude/pricing |
| 1c | Image token cost = ceil(w/28) x ceil(h/28); Sonnet 5.5 uses high-res tier (2576 px long edge, up to 4,784 tokens); 2000x1500 image ~2.5x tokens vs older models; limits 8000x8000 px, 10 MB base64 (5 MB Bedrock/Vertex) | verified (docs search) | https://platform.claude.com/docs/en/build-with-claude/vision ; https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide |
| 2a | `output_config.effort` (top-level, no beta header) supported on Sonnet 5.5; levels low/medium/high/xhigh/max; API default `high` (Haiku 5.5 default `medium`) | verified (docs search) | https://platform.claude.com/docs/en/build-with-claude/effort |
| 2b | Structured outputs via `output_config.format = {type: json_schema, schema}`; Sonnet 5.5 and Haiku 5.5 are on the supported list on the Claude API; old `output_format` is deprecated. **Not available on Amazon Bedrock for Sonnet 5.5**, so a Bedrock deployment needs prompt-described JSON + server validation | verified (docs search) | https://platform.claude.com/docs/en/build-with-claude/structured-outputs ; migration guides |
| 2c | Sonnet 5.5: non-default `temperature`/`top_p`/`top_k` returns HTTP 400 on every request. Haiku 5.5: also 400 on non-default; docs search says temperature, if sent, must be 1. Simplest rule: never send them | verified (docs search) | https://platform.claude.com/docs/en/models/sonnet-5-5/overview ; https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide |
| 2d | Sonnet 5.5 rejects thinking `disabled`; lowest setting is `thinking: {type: "between_tools"}`; so keep effort low and budget output tokens | verified (docs search) | https://platform.claude.com/docs/en/build-with-claude/thinking |
| 3a | Haiku 5.5 retirement: not sooner than **2027-10-07** | verified (docs search) | Haiku 5.5 overview + models overview |
| 3b | Haiku 5.5 image tier: not stated explicitly in any result; it is a later generation than Opus 4.7 so high-res tier is expected, but unconfirmed | **[re-verify]** reason: no Haiku-5.5-specific image limit found; smoke build should send a 2000x1500 test image and read `usage.input_tokens` on both models | vision docs |
| 4 | Sonnet 5.5 retirement: not earlier than **2027-09-28** (confirmed, unchanged) | verified (docs search) | Sonnet 5.5 overview |
| 5 | Bedrock regional availability of Sonnet 5.5 (APAC/Thailand) | **[re-verify]** reason: Sonnet 5.5 Bedrock model card not found; only the Sonnet 5 card (APAC routing incl. Thailand, Singapore, Tokyo) | https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5.html |
| 6 | Non-Claude vendor prices (Google Vision, Nutritionix, Clarifai, LogMeal) | **[re-verify]** reason: only Google list price found (cached page); others not public. They are not on the recommended path | vendor sites |

Correction vs earlier draft: structured outputs ARE confirmed on the Claude API for both models (earlier marked unverified); they are NOT available on Bedrock for Sonnet 5.5.

## The core problem (all options)
1. Dish recognition is the easy half; portion size is the hard half. A single 2D photo has no scale/depth. GPT-4V study: portion MAE 54.6 g vs human 43.6 g, using surrounding objects as scale cues (https://arxiv.org/abs/2312.08592). Volume-aware work (CalorieVoL, CalorieLLaVA) reports general LMMs struggle with volume. No source gives a trustworthy % error for any option on Thai dishes. UX must show a range and let the user correct dish + portion.
2. Hidden calories (oil, coconut milk, sugar, sauces) are invisible; Thai curries, stir-fries and desserts suffer most.
3. Thai ground truth: INMU Thai FCD v3 (Aug 2025) exists but commercial use needs INMU permission/fee (non-commercial free with attribution). Thai image sets: THFOOD-100 (53,459 images, 100 classes) is "for research purposes", licence not found; THFOOD-50 derivatives are non-commercial only. No published image-label to Thai FCD crosswalk.

## Options

### A. Multimodal LLM vision (Claude, Anthropic API), single call returns structured JSON
Backend receives resized photo, calls Claude (image + system prompt + JSON schema), returns dishes[], grams, kcal + macros, low/high range, confidence, assumptions, is_food; user edits; saved.
- Accuracy: open vocabulary so Thai dishes work without a trained label set; uses size cues; unvalidated on Thai food; portion error dominant; counting small objects approximate (vision docs).
- Cost: ~$0.008/request Sonnet 5.5, ~$0.0004 Haiku 5.5 (arithmetic below).
- Privacy: photo goes to Anthropic. API default: inputs/outputs deleted within 30 days, not used for training without permission; ZDR opt-in via sales (https://platform.claude.com/docs/en/manage-claude/api-and-data-retention).
- Complexity lowest; no Thai nutrition DB licence needed at MVP (model supplies kcal, output is an editable estimate).
- Vendor risk: model retirement dates above.

### B. Dedicated food-recognition / nutrition APIs
- Nutritionix: text natural-language nutrition lookup; no image endpoint found; pricing by quote; US/branded-food bias.
- Clarifai food-item-recognition: classifier, >500 food items; no portion, no nutrition; price not found.
- LogMeal: image recognition + nutrition, closest all-in-one; price unconfirmed; Thai coverage unknown.
- Google Cloud Vision label detection: $1.50 per 1,000 units after 1,000 free/month; generic labels (dish specificity unverified); needs separate nutrition DB (USDA FoodData Central free but weak on Thai; Thai FCD needs licence) plus a mapping and portion model we would build.
- Trade-offs: closed label sets, no portion estimate, multiple vendors and privacy reviews, DB mapping work.

### C. On-device (TFLite / Core ML classifier)
- Best privacy, zero per-request cost, offline.
- Classifier outputs a dish label only; no portion size; still needs nutrition table.
- Licence blocker: THFOOD data is research-only/unclear; commercial training needs author permission. Published NU-ResNet 83.07% top-1 is a closed-set research benchmark (https://jtec.utem.edu.my/jtec/article/view/3572).
- Needs ML pipeline and a client stack not yet chosen; highest build cost, lowest MVP coverage.

| Criterion | A. Claude vision | B. Food APIs | C. On-device |
|---|---|---|---|
| Thai dish coverage | open vocab, unvalidated | closed, mostly Western | only what we can legally train |
| Portion estimate | yes (weak) | none | none |
| Cost / request | ~$0.0004 to ~$0.008 | unknown | ~0 |
| Privacy | cloud, 30-day default retention | cloud, extra vendors | best |
| Build effort | lowest | medium-high | highest |
| Thai nutrition DB licence | not at MVP | yes | yes |

## Recommendation: Option A
- **Primary `claude-sonnet-5-5`** (portion/volume reasoning is the weak point, so start with the stronger vision model).
- **Spike fallback `claude-haiku-5-5`** (~20x cheaper); switch via config if the spike shows no material accuracy loss.
- Direct Anthropic API for MVP; Bedrock APAC is the PDPA-driven alternative (loses structured outputs on Sonnet 5.5; needs prompt JSON + validation).
- Not now: B (no portion, closed labels, extra vendors), C (licence blocker, no portion). Revisit C later as pre-filter/offline mode.

### Cost estimate (my arithmetic)
- Client resizes to 1024 px long edge (1024x768 -> 37 x 28 = 1,036 visual tokens). Assume ~400 text tokens in, ~500 out at low effort.
- Sonnet 5.5: (1,436 x $2 + 500 x $10)/1e6 = ~$0.008 (~$8 per 1,000 photos). Thinking bills as output, so keep effort low and cap max_tokens.
- Haiku 5.5: ~$0.0004; real figure may be a bit higher (tokenizer +30% vs Haiku 4.5).
- Batch (50% off) not useful for interactive logging. System prompt is below Sonnet 5.5's 512-token cache minimum unless padded, so skip caching in MVP (cache-read price discrepancy between pages is irrelevant).

### Runtime pin for devops
- Provider: Anthropic API direct, `https://api.anthropic.com`; key in env `ANTHROPIC_API_KEY`, server-side only, never in the client. Deploy target open (project.md:11).
- Model: `claude-sonnet-5-5` exact ID, no alias; config `FOOD_VISION_MODEL`; spike candidate `claude-haiku-5-5`.
- Request: `output_config.effort = "low"`; `output_config.format` json_schema for the result; `max_tokens` >= 1500; do not send temperature/top_p/top_k; do not send thinking `disabled` (rejected on Sonnet 5.5); no assistant prefill (errors on Haiku 5.5, end with a user turn); validate JSON server-side with one retry.
- Images: JPEG/PNG/WebP; resize client-side to 1024 px long edge; strip EXIF (GPS/device) before upload.
- Retirement watch: Sonnet 5.5 >= 2027-09-28; Haiku 5.5 >= 2027-10-07; set an alert.

## Must-not-miss requirements (for PM acceptance criteria)
1. User can edit dish AND portion (grams or serving) before saving; edits recalc kcal.
2. Show calories as a range plus confidence plus stated assumptions, never a single precise number.
3. Not-medical-advice disclaimer.
4. Strip EXIF/GPS; limit upload size/type; handle non-food images (`is_food=false`).
5. PDPA: food photos linked to fitness goals are likely health (sensitive) data needing explicit consent; consent names the third-party processor and overseas transfer, is withdrawable, photos deletable; retention policy decided by PM (secondary sources, legal review needed).
6. API key server-side only; per-user rate limit; never log image bytes.
7. Error/timeout/overload handling with retry and manual-entry fallback.
8. Thai UI; model returns Thai + English dish names.
9. Do not embed Thai FCD or THFOOD data in the product without INMU/author permission.

## Open questions (owner)
- PM/legal: photos to Anthropic API (30-day default retention) acceptable, or Bedrock APAC?
- PM: accuracy target (MAPE) and acceptance of range display.
- PM: licensed Thai nutrition data later? (INMU commercial terms, THFOOD authors.)
- Architect/devops: deploy target and client platform (mobile vs web).

## Required spike (L3): Thai-dish accuracy
- Question: acceptable kcal error on Thai dishes; does Haiku 5.5 match Sonnet 5.5? Also confirm Haiku 5.5 image tier (item 3b).
- Method: >= 30 common Thai dishes (pad thai, som tam, green curry, khao man gai, mango sticky rice, krapow rice...), typical plates, weighed portions, reference kcal from Thai FCD for internal evaluation only (confirm with INMU) cross-checked with USDA; 3 runs each at effort low.
- Pass criteria (PM sets final): median absolute % kcal error <= PM threshold (suggest 30%); >= 80% dishes correctly named; reference within returned range >= 70%; p95 latency <= PM budget (suggest 10 s); cost <= $0.01/request. Haiku adopted only if within 5 points of Sonnet.
- Owner: devops/architect smoke build, then qa.

## References
- https://platform.claude.com/docs/en/models/sonnet-5-5/overview
- https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide
- https://platform.claude.com/docs/en/models/haiku-5-5/overview
- https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide
- https://platform.claude.com/docs/en/about-claude/pricing
- https://platform.claude.com/docs/en/build-with-claude/vision
- https://platform.claude.com/docs/en/build-with-claude/effort
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/build-with-claude/thinking
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5
- https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data
- https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5.html
- https://arxiv.org/abs/2312.08592 ; https://arxiv.org/pdf/2507.07048
- https://cloud.google.com/vision/pricing ; https://docs.cloud.google.com/vision/docs/labels
- https://docs.clarifai.com/api-guide/model/clarifai-models
- https://docx.syndigo.com/developers/docs/nutritionix-api-guide
- https://apis.io/providers/logmeal/
- https://inmu.mahidol.ac.th/thaifcd/
- https://eden.computing.psu.ac.th/files/%5BIEEE%20Access%2024%5D%20Thai%20Food%20Recognition%20Using%20Deep%20Learning%20With%20Cyclical%20Learning%20Rates.pdf
- https://www.cookieyes.com/blog/thailand-personal-data-protection-act-pdpa/ ; https://hlc.com/en/publications/thailand-pdpc-consults-on-first-healthcarespecific-data-protection-guideline

## Level reached
**L3.** Stopped because three options are compared on the same criteria, the hard-to-reverse choice (vendor/model) has official-docs evidence, and remaining risks are a spike or owned open questions. Not fully met: the requested `claude-api` skill could not be loaded by this agent, so Claude facts are verified from official docs via search only; two items stay [re-verify] (3b Haiku image tier, 5 Bedrock Sonnet 5.5 card) plus non-Claude vendor prices (6). None of these changes the recommendation.
