# 0001. Vision model and provider for food-photo calories

Status: Accepted (user confirmed 2026-10-08: Anthropic direct API + claude-sonnet-5-5; Bedrock APAC kept only as fallback if ADR 0002 legal review fails)
Date: 2026-10-08

## Context
Need dish recognition and portion/kcal estimate from one photo. Repo is greenfield. Portion size is the hard part; no source gives a trustworthy error for Thai dishes. Brief recommends option A (multimodal LLM). Provider/key is an open blocker in project.md and checkpoint.md. Model retirement not earlier than 2027-09-28 (Sonnet 5.5) and 2027-10-07 (Haiku 5.5).

## Decision
- Use Claude vision through the Anthropic direct API (api.anthropic.com), single call returning structured JSON (dishes, grams, kcal low/high, confidence, assumptions, is_food).
- Primary model `claude-sonnet-5-5` (exact ID, config FOOD_VISION_MODEL). Spike fallback `claude-haiku-5-5`, adopted only if within 5 points of Sonnet on the AC-24 gate.
- Key server-side only. Request rules in AC-21.
- Provider choice is reversible only with rework of the prompt, schema and consent text, so it is recorded here. Needs user confirmation before step 3d.
- Cost call: Sonnet 5.5 about $0.008 per request vs Haiku about $0.0004. The claude-api skill defaults to a pricier model; Sonnet needs user sign-off.

## Consequences
- Lowest build effort, open vocabulary for Thai dishes, no Thai nutrition DB licence at MVP.
- Photos leave Thailand to the USA processor: drives ADR 0002 consent and legal review.
- Accuracy on Thai food unvalidated: spike (AC-24) gates release.
- Retirement dates need an alert; model config avoids code change on swap.
- If Bedrock APAC is chosen instead: structured outputs unavailable on Sonnet 5.5, so prompt JSON plus server validation (AC-12 already covers); this ADR would be superseded.

## Alternatives considered
- B. Dedicated food APIs (Nutritionix, Clarifai, LogMeal, Google Vision plus nutrition DB): no portion estimate, closed labels, more vendors. Rejected for MVP.
- C. On-device classifier: best privacy, but THFOOD licence blocker and no portion. Revisit later as pre-filter or offline mode.
- Bedrock APAC: PDPA-friendlier region; kept as fallback pending legal answer. Sonnet 5.5 availability there is [re-verify].
