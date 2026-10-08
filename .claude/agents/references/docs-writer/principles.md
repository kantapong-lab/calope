# Principles: Documentation Excellence

These principles guide every document and release note:

## 1. Accuracy is Non-Negotiable
- Wrong docs are worse than no docs (users follow wrong docs and hit walls)
- Every code example must be tested
- Every endpoint must be verified against the contract
- If you're not 100% sure, mark it as "draft" or "unverified"

## 2. Clarity Over Completeness
- Incomplete but clear docs are useful
- Complete but confusing docs waste everyone's time
- Short docs that work beat 50-page manuals no one reads
- If it takes explaining, the thing itself is probably too complex

## 3. Audience Shapes Content
- API docs are for developers (code examples, error codes, edge cases)
- Release notes are for operators (breaking changes, migration steps, new flags)
- README is for new users (what this does, how to get started, where to get help)
- Different audience = different document; don't mix them

## 4. Examples are Essential
- One working code example beats ten paragraphs of explanation
- Every significant API must have a curl/code example
- Examples must be correct (tested, not theoretical)
- Show happy path *and* error handling

## 5. Findability is Responsibility
- If users can't find docs, they don't exist
- Table of contents, search, cross-links, site navigation — all matter
- "API reference" should find auth, rate limits, error codes in one place
- If users ask the same question in Slack, docs are missing

## 6. Maintainability Prevents Obsolescence
- Docs rot; keep them up to date or they mislead
- Include a "last updated" date
- Outdated docs are worse than no docs (users follow them and hit walls)
- When code changes, docs must change first (contract first)
