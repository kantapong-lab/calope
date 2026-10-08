# AC: food-photo-calories

Date: 2026-10-08. Source: brief.md (researcher r1). Scope: first slice only, calories from a food photo.

## User stories
- US-1: As a user, I take or pick a food photo and get an estimated calorie range with the dishes found, so I can log a meal fast.
- US-2: As a user, I can correct the dish and portion and see kcal update, because the estimate can be wrong.
- US-3: As a user, I give explicit consent that names the overseas processor, can withdraw it, and can delete my data (PDPA).

## Acceptance criteria
Thresholds marked (T) are PM-set values from the brief's suggestions; changeable only by PM.

### Capture and upload
- AC-1: Given a JPEG, PNG or WebP photo of at most 10 MB, when the user submits it, then it is accepted. Given another type or a larger file, then it is rejected before any provider call with a Thai message stating the limit.
- AC-2: Given a photo with EXIF/GPS/device metadata, when it is uploaded, then the bytes sent to the provider and anything stored contain no EXIF/GPS (verified by inspecting the outgoing payload in test).
- AC-3: Given the client resizes photos, when a photo is submitted, then the long edge sent is at most 1024 px.

### Result and display
- AC-4: Given a food photo, when analysis succeeds, then the result lists each dish with Thai and English name, grams, kcal low and high, a confidence value and stated assumptions (e.g. oil, sauce).
- AC-5: Given any result, when it is shown, then calories appear as a range (low to high) with confidence and assumptions, and no screen shows a single precise kcal number as the estimate.
- AC-6: Given any screen showing an estimate, when it renders, then a Thai not-medical-advice disclaimer is visible on it or one tap away on the same screen.
- AC-7: Given the provider returns is_food=false, when the result is handled, then no kcal is shown, the user sees a "not food" message, and the manual-entry option is offered.

### Edit and save
- AC-8: Given a result, when the user changes a dish name (free text or pick), then the dish is updated and the user can re-estimate or enter kcal manually.
- AC-9: Given a result, when the user changes portion (grams or serving count), then kcal low and high recalculate proportionally on-screen without a new provider call.
- AC-10: Given an edited or unedited result, when the user saves, then the meal log stores the final dish, portion, kcal range, a flag whether the user edited it, and timestamp.

### Failure handling
- AC-11: Given provider error, timeout or overload, when analysis fails, then the system retries once for retryable errors, then shows a Thai error and the manual-entry form (dish, grams, kcal) so the user can still save the meal.
- AC-12: Given malformed provider JSON, when validated server-side, then one retry is made; if still invalid, behave as AC-11.
- AC-13: Given a user exceeds the per-user rate limit, when they submit again, then the request is rejected with a Thai message and no provider call (limit value set by architect, default proposal 20 analyses per user per hour).

### Privacy and PDPA
- AC-14: Given a user who has not consented, when they try to analyse a photo, then the upload is blocked and a consent screen is shown first; no photo leaves the device before consent.
- AC-15: Given the consent screen, when it renders, then it names the processor (Anthropic), states the photo is sent outside Thailand (USA), states purpose, retention (see ADR 0002) and the right to withdraw, in Thai, with an unchecked explicit action (no pre-ticked box, not bundled with other terms).
- AC-16: Given a user who consented, when they withdraw consent in settings, then further analysis is blocked until re-consent, and withdrawal is recorded with timestamp.
- AC-17: Given a user, when they request deletion of a meal or all food data, then the stored meal logs (and any stored photo) are deleted and no longer returned by the API.
- AC-18: Given consent was given, when recorded, then consent version, timestamp and user id are stored so it is auditable.

### Security and ops
- AC-19: Given the client bundle and network traces, when inspected, then the provider API key is absent; calls to the provider happen only from the backend.
- AC-20: Given any log output at any level, when a photo is processed, then no image bytes or base64 appear in logs.
- AC-21: Given config, when the backend starts, then the model comes from FOOD_VISION_MODEL as an exact ID (default claude-sonnet-5-5), and the request never sends temperature, top_p, top_k, thinking disabled or assistant prefill.

### Localisation and licence
- AC-22: Given Thai locale, when any screen of this feature renders, then all UI text is Thai, and dish names show Thai plus English.
- AC-23: Given the repo and built product, when audited, then no Thai FCD or THFOOD data is embedded or shipped (internal evaluation data stays outside the product).

### Quality gate
- AC-24: Given the spike set (30 or more common Thai dishes, weighed portions, 3 runs each at effort low), when evaluated, then: median absolute kcal error <= 30% (T); dish named correctly >= 80% (T); reference kcal inside returned range >= 70% (T); p95 latency <= 10 s (T); cost <= $0.01 per request (T). Haiku 5.5 replaces Sonnet 5.5 only if within 5 points of Sonnet on these. Also record Haiku 5.5 image token usage on a 2000x1500 test image.

## Traceability
Contract section and QA test columns are filled by architect (contract) and qa-tester (tests); ids reserved here.

| Brief item | AC ids | Contract section | QA test |
|---|---|---|---|
| Must 1: edit dish and portion, recalc | AC-8, AC-9, AC-10 | architect fills | qa fills |
| Must 2: range + confidence + assumptions | AC-4, AC-5 | architect fills | qa fills |
| Must 3: not-medical-advice disclaimer | AC-6 | architect fills | qa fills |
| Must 4: strip EXIF, size/type limit, non-food | AC-1, AC-2, AC-3, AC-7 | architect fills | qa fills |
| Must 5: PDPA consent, overseas transfer, withdraw, delete, retention | AC-14, AC-15, AC-16, AC-17, AC-18 (retention in ADR 0002) | architect fills | qa fills |
| Must 6: key server-side, rate limit, no image logs | AC-13, AC-19, AC-20 | architect fills | qa fills |
| Must 7: error handling, manual fallback | AC-11, AC-12 (AC-7 non-food) | architect fills | qa fills |
| Must 8: Thai UI, Thai + English names | AC-22, AC-4 | architect fills | qa fills |
| Must 9: no Thai FCD/THFOOD embedded | AC-23 | architect fills | qa fills |
| Runtime pin (model config, forbidden params) | AC-21 | architect fills | qa fills |
| Spike L3 (accuracy, latency, cost, Haiku) | AC-24 | architect fills | qa fills |
| Open Q: accuracy target | AC-24 thresholds (PM-set, T) | n/a | qa fills |

## Out of scope
- Workout scheduling, goal-based exercise recommendations, personal trainer, general nutrition management: other features, later tasks.
- Licensed Thai nutrition database (INMU Thai FCD) and any use of THFOOD data in product.
- On-device classifier and offline mode; dedicated food APIs (ADR 0001 alternatives).
- Barcode scanning, text-only meal search, macro goals and daily totals dashboards.
- Storing photos long term, sharing, social features.
- Deploy target and client platform choice (devops/architect, open blocker).
- Bedrock APAC deployment (kept as fallback in ADR 0001).

## Open questions for user
1. Confirm provider: Anthropic direct API, Sonnet 5.5 primary (working assumption, ADR 0001 Proposed).
2. Legal: is 30-day Anthropic default retention plus USA transfer acceptable under PDPA, or require Bedrock APAC?
3. Confirm accuracy thresholds in AC-24.
4. Deploy target and client platform (mobile vs web).
