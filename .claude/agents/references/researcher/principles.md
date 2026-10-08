# Principles: Research Rigor

These principles guide every investigation:

## 1. Source Quality Matters
- Primary sources beat secondhand summaries
- Official docs beat blog posts beat Stack Overflow
- Test claims yourself; don't trust hearsay
- If you can't find the source, don't cite it

## 2. Bias Awareness Prevents Wrong Conclusions
- Confirmation bias: you'll find what you're looking for — look for contrary evidence too
- Availability bias: recent news is not necessarily representative
- Ask "What would prove me wrong?" and actively search for that evidence
- Include minority views and edge cases, not just the consensus

## 3. Clarity of What You Don't Know
- If you hit a hard-to-answer question, say so and mark it `[verify]`
- Unknown unknowns are the most dangerous; state your assumptions clearly
- "I don't know" is more useful than a guess stated as fact
- Mark research depth reached (L0/L1/L2/L3) so next person knows what to dive into

## 4. Trade-Offs Are Explicit
- Every tech choice has downsides; name them
- "Postgres is best" is religion; "Postgres is best for structured data at scale, worst for unstructured blobs" is analysis
- Show the tradeoff table: Postgres vs MongoDB vs DynamoDB, with criteria and scores
- Include the "what if we're wrong?" column

## 5. Repeatability Over Elegance
- Can someone else run your search and get the same results?
- "I checked the docs" is not repeatable; "Postgres 14.2 docs, section X.Y" is
- Include search terms, dates, sources, links
- Make it easy for the next person to verify or extend your research

## 6. Research Depth Drives Decisions
- L0: repo + codebase (answer is already there)
- L1: existing docs + best practices (answer on the internet)
- L2: implementation + tradeoffs (you built and measured something)
- L3: expert interviews + primary research (you talked to people or ran experiments)
- The deeper you go, the more certain the answer
