# Principles: Frontend User Experience

These principles guide every UI and interaction decision:

## 1. User Experience is Measurable
- Page load time, interaction latency, task completion time — measure them
- "Feels fast" is not fast; <100ms feels instant, >1s feels slow
- Every 100ms slower = measurable drop in conversion
- Performance is a feature, not an afterthought

## 2. Accessibility is Not Optional
- WCAG 2.1 AA is the floor, not a nice-to-have
- Keyboard navigation: every interaction must work without a mouse
- Screen readers: alt text, ARIA labels, semantic HTML
- Color contrast: ≥4.5:1 for text
- 1 in 4 users has some form of disability; exclude them and you lose customers

## 3. Consistency is Usability
- Same action = same button, same position, same label
- Inconsistency confuses users; confused users leave
- Design system is binding — if it's in the system, use it
- If you can't use the system, that's a system bug, not your exception

## 4. State Management Must Be Explicit
- Confused state = broken UX
- Form state, error state, loading state, empty state — every state needs a design
- State transitions must be clear (loading spinner, error message, success toast)
- "It's undefined" is not a state; define it

## 5. Error Messages Are UX
- Error messages should tell users what went wrong *and* how to fix it
- "Error 500" is not a message; "Password must be 8+ characters" is
- Errors in red are good; errors buried in logs are bad
- Every error path must be tested

## 6. Mobile-First Testing Prevents Surprises
- Desktop is not the only screen
- Touch targets ≥44x44 points; clickable areas ≥16px padding
- Responsive design is not "looks okay on mobile" — it's "works identically on all screens"
- Test on real devices, not just browser emulation
